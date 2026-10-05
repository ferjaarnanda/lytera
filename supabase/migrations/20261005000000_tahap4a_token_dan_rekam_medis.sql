-- Migrasi Tahap 4a: Skema Token Otorisasi Pasien 6 Digit, Kunjungan Rekam Medis Minimal, dan Audit Akses

-- 1. Tabel patient_access_tokens
create table if not exists public.patient_access_tokens (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  token_hash text not null,
  expires_at timestamp with time zone not null default (now() + interval '60 minutes'),
  failed_attempts integer not null default 0,
  is_locked boolean not null default false,
  revoked_at timestamp with time zone default null,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_patient_access_tokens_patient on public.patient_access_tokens(patient_id, created_at desc);

-- 2. Tabel medical_records (Kunjungan Medis Minimal)
create table if not exists public.medical_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  family_member_id uuid references public.family_members(id) on delete set null,
  facility_id uuid not null references public.facilities(id) on delete restrict,
  doctor_name text not null,
  doctor_id uuid references public.facility_staff(id) on delete set null,
  tanggal timestamp with time zone not null default now(),
  diagnosis_icd10 text not null,
  ringkasan text not null,
  referral_id uuid references public.referrals(id) on delete set null,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_medical_records_patient on public.medical_records(patient_id, tanggal desc);
create index if not exists idx_medical_records_referral on public.medical_records(referral_id);

-- 3. Tabel medical_record_access_logs (Audit Log Append-Only)
create table if not exists public.medical_record_access_logs (
  id uuid primary key default gen_random_uuid(),
  accessed_by uuid references public.profiles(id) on delete set null,
  facility_id uuid references public.facilities(id) on delete set null,
  patient_id uuid not null references public.patients(id) on delete cascade,
  family_member_id uuid references public.family_members(id) on delete set null,
  access_result text not null check (access_result in ('berhasil', 'token_salah', 'token_kedaluwarsa', 'token_dicabut', 'token_terkunci', 'tanpa_token')),
  notes text,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_medical_record_access_logs_patient on public.medical_record_access_logs(patient_id, created_at desc);

-- 4. Aktifkan RLS dan kunci akses langsung ke tabel (semua akses melalui RPC SECURITY DEFINER)
alter table public.patient_access_tokens enable row level security;
alter table public.medical_records enable row level security;
alter table public.medical_record_access_logs enable row level security;

-- Cabut akses langsung dari anon dan authenticated agar tabel tertutup rapat
revoke all on public.patient_access_tokens from anon, authenticated, public;
revoke all on public.medical_records from anon, authenticated, public;
revoke all on public.medical_record_access_logs from anon, authenticated, public;

-- 5. RPC SECURITY DEFINER: Membuat Token Akses Pasien
create or replace function public.create_patient_access_token()
returns table(token_code text, expires_at timestamp with time zone)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_hash text;
  v_expires timestamp with time zone := now() + interval '60 minutes';
begin
  if v_uid is null then
    raise exception 'Anda harus masuk terlebih dahulu';
  end if;

  if not exists (select 1 from public.patients where id = v_uid) then
    raise exception 'Hanya pasien terdaftar yang dapat membuat token akses medis';
  end if;

  -- Cabut token lama pasien yang masih aktif
  update public.patient_access_tokens as pat
  set revoked_at = now()
  where pat.patient_id = v_uid
    and pat.revoked_at is null
    and pat.expires_at > now();

  -- Buat 6 digit angka acak (100000 - 999999)
  v_code := lpad(floor(random() * 900000 + 100000)::text, 6, '0');
  v_hash := extensions.crypt(v_code, extensions.gen_salt('bf', 10));

  insert into public.patient_access_tokens (patient_id, token_hash, expires_at)
  values (v_uid, v_hash, v_expires);

  return query select v_code, v_expires;
end;
$$;

-- 6. RPC SECURITY DEFINER: Mencabut Token Akses Pasien
create or replace function public.revoke_patient_access_token()
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Anda harus masuk terlebih dahulu';
  end if;

  update public.patient_access_tokens as pat
  set revoked_at = now()
  where pat.patient_id = v_uid
    and pat.revoked_at is null
    and pat.expires_at > now();

  return true;
end;
$$;

-- 7. RPC SECURITY DEFINER: Melihat Status Token Aktif Milik Pasien (Tanpa Kode Mentah)
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
begin
  if v_uid is null then
    raise exception 'Anda harus masuk terlebih dahulu';
  end if;

  select pat.expires_at, pat.failed_attempts, pat.is_locked,
         greatest(0, floor(extract(epoch from (pat.expires_at - now())))::integer) as remaining
  into r
  from public.patient_access_tokens as pat
  where pat.patient_id = v_uid
    and pat.revoked_at is null
    and pat.expires_at > now()
    and not pat.is_locked
  order by pat.created_at desc
  limit 1;

  if r.expires_at is not null then
    return query select true, r.expires_at, r.remaining, r.failed_attempts, r.is_locked;
  else
    return query select false, null::timestamp with time zone, 0, 0, false;
  end if;
end;
$$;

-- 8. RPC SECURITY DEFINER: Membuka Rekam Medis dengan Token (Khusus Dokter Aktif di Faskes Aktif)
create or replace function public.open_patient_medical_record(
  p_patient_id uuid,
  p_token_code text,
  p_family_member_id uuid default null
)
returns table(
  id uuid,
  patient_id uuid,
  family_member_id uuid,
  facility_name text,
  doctor_name text,
  tanggal timestamp with time zone,
  diagnosis_icd10 text,
  ringkasan text,
  referral_id uuid
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_doctor_staff record;
  v_token record;
  v_clean_code text := trim(coalesce(p_token_code, ''));
  v_has_records boolean := false;
  r record;
begin
  if v_uid is null then
    raise exception 'Anda harus masuk terlebih dahulu';
  end if;

  -- 1. Verifikasi pemanggil adalah dokter aktif di faskes aktif
  select fs.id as staff_id, fs.facility_id, p.full_name as doctor_name, f.name as facility_name
  into v_doctor_staff
  from public.facility_staff fs
  join public.facilities f on f.id = fs.facility_id
  join public.profiles p on p.id = fs.profile_id
  where fs.profile_id = v_uid
    and fs.staff_role = 'dokter'
    and fs.status = 'aktif'
    and f.status = 'aktif'
  limit 1;

  if v_doctor_staff.facility_id is null then
    raise exception 'Hanya dokter aktif di fasilitas kesehatan aktif yang dapat membuka rekam medis';
  end if;

  -- 2. Cari token terbaru untuk pasien ini
  select pat.id, pat.token_hash, pat.expires_at, pat.failed_attempts, pat.is_locked, pat.revoked_at
  into v_token
  from public.patient_access_tokens as pat
  where pat.patient_id = p_patient_id
  order by pat.created_at desc, pat.ctid desc
  limit 1;

  -- Jika token sama sekali belum ada atau kode kosong
  if v_token.id is null or v_clean_code = '' then
    insert into public.medical_record_access_logs(accessed_by, facility_id, patient_id, family_member_id, access_result, notes)
    values (v_uid, v_doctor_staff.facility_id, p_patient_id, p_family_member_id, 'tanpa_token', 'Akses ditolak: pasien belum memiliki token otorisasi atau kode tidak disertakan');
    return query select null::uuid, p_patient_id, p_family_member_id, v_doctor_staff.facility_name, v_doctor_staff.doctor_name, null::timestamptz, 'AKSES_DITOLAK'::text, 'Akses ditolak: pasien belum memiliki token otorisasi aktif atau kode tidak disertakan'::text, null::uuid;
    return;
  end if;

  -- Jika token terkunci
  if v_token.is_locked then
    insert into public.medical_record_access_logs(accessed_by, facility_id, patient_id, family_member_id, access_result, notes)
    values (v_uid, v_doctor_staff.facility_id, p_patient_id, p_family_member_id, 'token_terkunci', 'Akses ditolak: token telah terkunci karena melebihi 5 kali percobaan salah');
    return query select null::uuid, p_patient_id, p_family_member_id, v_doctor_staff.facility_name, v_doctor_staff.doctor_name, null::timestamptz, 'AKSES_DITOLAK'::text, 'Akses ditolak: token akses terkunci karena batas 5 kali percobaan salah terlampaui'::text, null::uuid;
    return;
  end if;

  -- Jika token dicabut
  if v_token.revoked_at is not null then
    insert into public.medical_record_access_logs(accessed_by, facility_id, patient_id, family_member_id, access_result, notes)
    values (v_uid, v_doctor_staff.facility_id, p_patient_id, p_family_member_id, 'token_dicabut', 'Akses ditolak: token telah dicabut oleh pasien');
    return query select null::uuid, p_patient_id, p_family_member_id, v_doctor_staff.facility_name, v_doctor_staff.doctor_name, null::timestamptz, 'AKSES_DITOLAK'::text, 'Akses ditolak: token otorisasi telah dicabut oleh pasien'::text, null::uuid;
    return;
  end if;

  -- Jika token kedaluwarsa
  if v_token.expires_at < now() then
    insert into public.medical_record_access_logs(accessed_by, facility_id, patient_id, family_member_id, access_result, notes)
    values (v_uid, v_doctor_staff.facility_id, p_patient_id, p_family_member_id, 'token_kedaluwarsa', 'Akses ditolak: token telah melewati batas waktu 60 menit');
    return query select null::uuid, p_patient_id, p_family_member_id, v_doctor_staff.facility_name, v_doctor_staff.doctor_name, null::timestamptz, 'AKSES_DITOLAK'::text, 'Akses ditolak: token otorisasi telah kedaluwarsa (masa berlaku 60 menit)'::text, null::uuid;
    return;
  end if;

  -- 3. Verifikasi kode token menggunakan extensions.crypt
  if extensions.crypt(v_clean_code, v_token.token_hash) <> v_token.token_hash then
    update public.patient_access_tokens
    set failed_attempts = failed_attempts + 1,
        is_locked = (failed_attempts + 1 >= 5)
    where patient_access_tokens.id = v_token.id;

    insert into public.medical_record_access_logs(accessed_by, facility_id, patient_id, family_member_id, access_result, notes)
    values (
      v_uid,
      v_doctor_staff.facility_id,
      p_patient_id,
      p_family_member_id,
      case when v_token.failed_attempts + 1 >= 5 then 'token_terkunci' else 'token_salah' end,
      format('Akses ditolak: kode otorisasi salah (percobaan ke-%s)', v_token.failed_attempts + 1)
    );

    if v_token.failed_attempts + 1 >= 5 then
      return query select null::uuid, p_patient_id, p_family_member_id, v_doctor_staff.facility_name, v_doctor_staff.doctor_name, null::timestamptz, 'AKSES_DITOLAK'::text, 'Akses ditolak: kode salah. Batas 5 kali percobaan tercapai, token kini terkunci'::text, null::uuid;
    else
      return query select null::uuid, p_patient_id, p_family_member_id, v_doctor_staff.facility_name, v_doctor_staff.doctor_name, null::timestamptz, 'AKSES_DITOLAK'::text, format('Akses ditolak: kode token otorisasi salah (%s dari 5 percobaan)', v_token.failed_attempts + 1)::text, null::uuid;
    end if;
    return;
  end if;

  -- 4. Otorisasi BERHASIL: Catat log sukses dan kembalikan rekam medis
  insert into public.medical_record_access_logs(accessed_by, facility_id, patient_id, family_member_id, access_result, notes)
  values (v_uid, v_doctor_staff.facility_id, p_patient_id, p_family_member_id, 'berhasil', 'Akses rekam medis disetujui dengan token otorisasi');

  for r in
    select mr.id, mr.patient_id, mr.family_member_id, f.name as facility_name,
           mr.doctor_name, mr.tanggal, mr.diagnosis_icd10, mr.ringkasan, mr.referral_id
    from public.medical_records as mr
    join public.facilities as f on f.id = mr.facility_id
    where mr.patient_id = p_patient_id
      and (
        (p_family_member_id is null and mr.family_member_id is null)
        or (p_family_member_id is not null and mr.family_member_id = p_family_member_id)
      )
    order by mr.tanggal desc
  loop
    v_has_records := true;
    return query select r.id, r.patient_id, r.family_member_id, r.facility_name, r.doctor_name, r.tanggal, r.diagnosis_icd10, r.ringkasan, r.referral_id;
  end loop;

  if not v_has_records then
    return query select null::uuid, p_patient_id, p_family_member_id, v_doctor_staff.facility_name, v_doctor_staff.doctor_name, null::timestamptz, 'KOSONG'::text, 'Akses berhasil: pasien belum memiliki riwayat kunjungan medis tercatat'::text, null::uuid;
  end if;
  return;
end;
$$;

-- 9. RPC SECURITY DEFINER: Pasien Melihat Riwayat Rekam Medis Sendiri
create or replace function public.list_my_medical_records()
returns table(
  id uuid,
  patient_id uuid,
  family_member_id uuid,
  subject_name text,
  facility_name text,
  doctor_name text,
  tanggal timestamp with time zone,
  diagnosis_icd10 text,
  ringkasan text,
  referral_id uuid
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Anda harus masuk terlebih dahulu';
  end if;

  return query
  select mr.id, mr.patient_id, mr.family_member_id,
         coalesce(fm.full_name, pr.full_name) as subject_name,
         f.name as facility_name,
         mr.doctor_name,
         mr.tanggal,
         mr.diagnosis_icd10,
         mr.ringkasan,
         mr.referral_id
  from public.medical_records as mr
  join public.facilities as f on f.id = mr.facility_id
  join public.profiles as pr on pr.id = mr.patient_id
  left join public.family_members as fm on fm.id = mr.family_member_id
  where mr.patient_id = v_uid
     or mr.family_member_id in (select fmb.id from public.family_members as fmb where fmb.guardian_id = v_uid)
  order by mr.tanggal desc;
end;
$$;

-- 10. RPC SECURITY DEFINER: Menambah Catatan Kunjungan Rekam Medis (Dokter Aktif dengan Token Izin Pasien)
create or replace function public.add_medical_record(
  p_patient_id uuid,
  p_family_member_id uuid,
  p_referral_id uuid,
  p_diagnosis_icd10 text,
  p_ringkasan text,
  p_token_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_staff record;
  v_ref record;
  v_token record;
  v_clean_code text := trim(coalesce(p_token_code, ''));
  v_record_id uuid;
begin
  if v_uid is null then
    raise exception 'Anda harus masuk terlebih dahulu';
  end if;

  -- 1. Dokter aktif di faskes aktif
  select fs.id as staff_id, fs.facility_id, p.full_name as doctor_name
  into v_staff
  from public.facility_staff fs
  join public.facilities f on f.id = fs.facility_id
  join public.profiles p on p.id = fs.profile_id
  where fs.profile_id = v_uid
    and fs.staff_role = 'dokter'
    and fs.status = 'aktif'
    and f.status = 'aktif'
  limit 1;

  if v_staff.facility_id is null then
    raise exception 'Hanya dokter aktif di fasilitas kesehatan aktif yang dapat menambah rekam medis';
  end if;

  -- 2. Verifikasi rujukan terkait (referral_id)
  if p_referral_id is null then
    raise exception 'Rujukan pemeriksaan terkait (referral_id) wajib disertakan';
  end if;

  select r.id, r.patient_id, r.family_member_id, r.destination_facility_id, r.status
  into v_ref
  from public.referrals as r
  where r.id = p_referral_id
    and (r.destination_facility_id = v_staff.facility_id or r.origin_facility_id = v_staff.facility_id)
    and r.status in ('dijadwalkan', 'selesai', 'diajukan', 'diterima');

  if v_ref.id is null then
    raise exception 'Dokter hanya dapat menambah catatan medis pada rujukan faskesnya yang terkait dengan pasien';
  end if;

  if v_ref.patient_id <> p_patient_id then
    raise exception 'Pasien pada rujukan tidak cocok dengan data rekam medis';
  end if;

  -- 3. Verifikasi token izin aktif pasien
  select pat.id, pat.token_hash, pat.expires_at, pat.failed_attempts, pat.is_locked, pat.revoked_at
  into v_token
  from public.patient_access_tokens as pat
  where pat.patient_id = p_patient_id
  order by pat.created_at desc, pat.ctid desc
  limit 1;

  if v_token.id is null or v_clean_code = '' then
    insert into public.medical_record_access_logs(accessed_by, facility_id, patient_id, family_member_id, access_result, notes)
    values (v_uid, v_staff.facility_id, p_patient_id, p_family_member_id, 'tanpa_token', 'Penulisan rekam medis ditolak: tanpa token otorisasi aktif');
    raise exception 'Akses ditolak: penulisan rekam medis memerlukan token izin aktif dari pasien';
  end if;

  if v_token.revoked_at is not null then
    insert into public.medical_record_access_logs(accessed_by, facility_id, patient_id, family_member_id, access_result, notes)
    values (v_uid, v_staff.facility_id, p_patient_id, p_family_member_id, 'token_dicabut', 'Penulisan rekam medis ditolak: token telah dicabut');
    raise exception 'Akses ditolak: token izin pasien telah dicabut';
  end if;

  if v_token.expires_at < now() then
    insert into public.medical_record_access_logs(accessed_by, facility_id, patient_id, family_member_id, access_result, notes)
    values (v_uid, v_staff.facility_id, p_patient_id, p_family_member_id, 'token_kedaluwarsa', 'Penulisan rekam medis ditolak: token kedaluwarsa');
    raise exception 'Akses ditolak: token izin pasien telah kedaluwarsa';
  end if;

  if v_token.is_locked then
    insert into public.medical_record_access_logs(accessed_by, facility_id, patient_id, family_member_id, access_result, notes)
    values (v_uid, v_staff.facility_id, p_patient_id, p_family_member_id, 'token_terkunci', 'Penulisan rekam medis ditolak: token terkunci');
    raise exception 'Akses ditolak: token izin pasien terkunci karena batas 5 kali kesalahan terlampaui';
  end if;

  if extensions.crypt(v_clean_code, v_token.token_hash) <> v_token.token_hash then
    update public.patient_access_tokens
    set failed_attempts = failed_attempts + 1,
        is_locked = (failed_attempts + 1 >= 5)
    where patient_access_tokens.id = v_token.id;

    insert into public.medical_record_access_logs(accessed_by, facility_id, patient_id, family_member_id, access_result, notes)
    values (v_uid, v_staff.facility_id, p_patient_id, p_family_member_id, case when v_token.failed_attempts + 1 >= 5 then 'token_terkunci' else 'token_salah' end, 'Penulisan rekam medis ditolak: kode token izin salah');
    raise exception 'Akses ditolak: kode token izin pasien salah';
  end if;

  -- 4. Otorisasi sukses -> simpan rekam medis & catat log berhasil
  insert into public.medical_records(
    patient_id,
    family_member_id,
    facility_id,
    doctor_name,
    doctor_id,
    diagnosis_icd10,
    ringkasan,
    referral_id
  ) values (
    p_patient_id,
    p_family_member_id,
    v_staff.facility_id,
    v_staff.doctor_name,
    v_staff.staff_id,
    trim(p_diagnosis_icd10),
    trim(p_ringkasan),
    p_referral_id
  ) returning medical_records.id into v_record_id;

  insert into public.medical_record_access_logs(accessed_by, facility_id, patient_id, family_member_id, access_result, notes)
  values (v_uid, v_staff.facility_id, p_patient_id, p_family_member_id, 'berhasil', 'Penulisan rekam medis disetujui dengan token izin pasien');

  return v_record_id;
end;
$$;

-- 11. RPC SECURITY DEFINER: Melihat Log Audit Akses Milik Pasien
create or replace function public.list_my_access_audit_logs()
returns table(
  created_at timestamp with time zone,
  doctor_name text,
  facility_name text,
  subject_name text,
  access_result text,
  notes text
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Anda harus masuk terlebih dahulu';
  end if;

  return query
  select l.created_at,
         coalesce(p.full_name, 'Sistem') as doctor_name,
         coalesce(f.name, '-') as facility_name,
         coalesce(fm.full_name, pr.full_name) as subject_name,
         l.access_result,
         l.notes
  from public.medical_record_access_logs as l
  left join public.profiles as p on p.id = l.accessed_by
  left join public.facilities as f on f.id = l.facility_id
  join public.profiles as pr on pr.id = l.patient_id
  left join public.family_members as fm on fm.id = l.family_member_id
  where l.patient_id = v_uid
     or l.family_member_id in (select fmb.id from public.family_members as fmb where fmb.guardian_id = v_uid)
  order by l.created_at desc;
end;
$$;

-- 12. Hak Eksekusi: Revoke dari anon & public, berikan ke authenticated
revoke execute on function public.create_patient_access_token() from public, anon;
grant execute on function public.create_patient_access_token() to authenticated;

revoke execute on function public.revoke_patient_access_token() from public, anon;
grant execute on function public.revoke_patient_access_token() to authenticated;

revoke execute on function public.get_my_active_token_status() from public, anon;
grant execute on function public.get_my_active_token_status() to authenticated;

revoke execute on function public.open_patient_medical_record(uuid, text, uuid) from public, anon;
grant execute on function public.open_patient_medical_record(uuid, text, uuid) to authenticated;

revoke execute on function public.list_my_medical_records() from public, anon;
grant execute on function public.list_my_medical_records() to authenticated;

revoke execute on function public.add_medical_record(uuid, uuid, uuid, text, text, text) from public, anon;
grant execute on function public.add_medical_record(uuid, uuid, uuid, text, text, text) to authenticated;

revoke execute on function public.list_my_access_audit_logs() from public, anon;
grant execute on function public.list_my_access_audit_logs() to authenticated;
