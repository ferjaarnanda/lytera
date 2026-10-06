-- Penyesuaian RPC get_my_active_token_status agar dapat mendeteksi status
-- aktif, dicabut, terkunci, dan kedaluwarsa tanpa mengubah signature/tipe kembalian (Tahap 4b).
-- Sinyal:
-- - has_active_token = true & seconds_remaining > 0: Token Aktif
-- - is_locked = true: Token Terkunci
-- - seconds_remaining = -1: Token Dicabut oleh pasien
-- - seconds_remaining = 0 & expires_at is not null: Token Kedaluwarsa alami
-- - expires_at is null: Belum pernah membuat token

create or replace function public.get_my_active_token_status()
returns table(
  has_active_token boolean,
  expires_at timestamp with time zone,
  seconds_remaining integer,
  failed_attempts integer,
  is_locked boolean
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  r record;
  v_rem integer;
begin
  if v_uid is null then
    raise exception 'Anda harus masuk terlebih dahulu';
  end if;

  select pat.expires_at, pat.failed_attempts, pat.is_locked, pat.revoked_at,
         floor(extract(epoch from (pat.expires_at - now())))::integer as rem
  into r
  from public.patient_access_tokens as pat
  where pat.patient_id = v_uid
  order by pat.created_at desc
  limit 1;

  if r.expires_at is null then
    return query select false, null::timestamp with time zone, 0, 0, false;
  elsif r.is_locked then
    return query select false, r.expires_at, 0, coalesce(r.failed_attempts, 5), true;
  elsif r.revoked_at is not null then
    return query select false, r.expires_at, -1, coalesce(r.failed_attempts, 0), false;
  elsif r.rem <= 0 then
    return query select false, r.expires_at, 0, coalesce(r.failed_attempts, 0), false;
  else
    return query select true, r.expires_at, greatest(0, r.rem), coalesce(r.failed_attempts, 0), false;
  end if;
end;
$$;

revoke all on function public.get_my_active_token_status() from public, anon;
grant execute on function public.get_my_active_token_status() to authenticated;
