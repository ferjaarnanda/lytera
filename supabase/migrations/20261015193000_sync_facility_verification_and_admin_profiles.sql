-- Migrasi: Sinkronisasi Verifikasi Fasilitas Kesehatan dan Status Akun Admin Fasilitas
-- Tanggal: 15 Oktober 2026
-- Deskripsi:
-- 1. Menyediakan RPC transaksional `verify_facility_registration` untuk Dinkes:
--    - Memperbarui status fasilitas menjadi 'aktif' atau 'ditolak'
--    - Secara otomatis menyinkronkan status profil admin fasilitas (profiles.status)
--    - Mencatat riwayat keputusan verifikasi ke `registration_reviews`
--    - Dikelola dengan SECURITY DEFINER dan search_path aman untuk integritas data
-- 2. Rekonsiliasi data lama:
--    - Mengaktifkan profil admin fasilitas yang fasilitasnya berstatus 'aktif' dan memiliki riwayat verifikasi sah 'disetujui'
--    - Mengubah profil admin fasilitas menjadi 'ditolak' yang fasilitasnya berstatus 'ditolak' dan memiliki riwayat verifikasi 'ditolak'

-- ============================================================================
-- 1. FUNGSI RPC: VERIFIKASI FASILITAS & SINKRONISASI PROFIL ADMIN
-- ============================================================================

create or replace function public.verify_facility_registration(
  p_facility_id uuid,
  p_decision text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_role text;
  v_caller_status text;
  v_fac record;
  v_next_status text;
  v_review_notes text;
  v_review_id uuid;
begin
  -- 1. Validasi sesi pemanggil
  if auth.uid() is null then
    raise exception 'Sesi autentikasi tidak ditemukan';
  end if;

  -- 2. Validasi wewenang peran Dinkes aktif
  select role, status into v_caller_role, v_caller_status
  from public.profiles
  where id = auth.uid();

  if v_caller_role is distinct from 'dinkes' or v_caller_status is distinct from 'aktif' then
    raise exception 'Hanya akun Dinas Kesehatan aktif yang berwenang memverifikasi fasilitas kesehatan';
  end if;

  -- 3. Validasi parameter keputusan
  if p_decision not in ('disetujui', 'ditolak') then
    raise exception 'Keputusan verifikasi tidak valid (harus disetujui atau ditolak)';
  end if;

  if p_decision = 'ditolak' and (p_notes is null or trim(p_notes) = '') then
    raise exception 'Alasan penolakan wajib diisi untuk fasilitas yang ditolak';
  end if;

  -- 4. Kunci dan ambil data fasilitas
  select id, admin_id, status, name into v_fac
  from public.facilities
  where id = p_facility_id
  for update;

  if not found then
    raise exception 'Fasilitas kesehatan tidak ditemukan';
  end if;

  v_next_status := case when p_decision = 'disetujui' then 'aktif' else 'ditolak' end;
  v_review_notes := case
    when p_decision = 'ditolak' then trim(p_notes)
    else coalesce(nullif(trim(p_notes), ''), 'Pendaftaran fasilitas kesehatan disetujui oleh Dinas Kesehatan')
  end;

  -- 5. Perbarui status fasilitas
  update public.facilities
  set status = v_next_status
  where id = p_facility_id;

  -- 6. Perbarui status akun profil admin fasilitas terkait (hanya jika role = 'fasilitas')
  if v_fac.admin_id is not null then
    update public.profiles
    set status = v_next_status
    where id = v_fac.admin_id and role = 'fasilitas';
  end if;

  -- 7. Catat audit verifikasi ke registration_reviews
  insert into public.registration_reviews (
    target_table,
    target_id,
    decision,
    notes,
    reviewed_by,
    created_at
  )
  values (
    'facilities',
    p_facility_id,
    p_decision,
    v_review_notes,
    auth.uid(),
    now()
  )
  returning id into v_review_id;

  return jsonb_build_object(
    'success', true,
    'facility_id', p_facility_id,
    'admin_id', v_fac.admin_id,
    'status', v_next_status,
    'review_id', v_review_id
  );
end;
$$;

revoke all on function public.verify_facility_registration(uuid, text, text) from public;
grant execute on function public.verify_facility_registration(uuid, text, text) to authenticated;

-- ============================================================================
-- 2. REKONSILIASI DATA HISTORIS DENGAN BUKTI KEPUTUSAN SAH DINKES
-- ============================================================================

-- A. Aktifkan akun admin faskes yang fasilitasnya sudah disetujui sah di registration_reviews
update public.profiles p
set status = 'aktif'
from public.facilities f
join public.registration_reviews rr
  on rr.target_table = 'facilities'
 and rr.target_id = f.id
 and rr.decision = 'disetujui'
where f.status = 'aktif'
  and p.id = f.admin_id
  and p.role = 'fasilitas'
  and p.status = 'menunggu';

-- B. Sinkronkan akun admin faskes yang fasilitasnya telah ditolak sah di registration_reviews
update public.profiles p
set status = 'ditolak'
from public.facilities f
join public.registration_reviews rr
  on rr.target_table = 'facilities'
 and rr.target_id = f.id
 and rr.decision = 'ditolak'
where f.status = 'ditolak'
  and p.id = f.admin_id
  and p.role = 'fasilitas'
  and p.status = 'menunggu';
