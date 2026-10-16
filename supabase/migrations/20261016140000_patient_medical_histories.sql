-- ============================================================================
-- Migrasi: Tabel patient_medical_histories & RPC Izin Pasien
-- ============================================================================

-- 1. Buat Tabel Riwayat Kesehatan Terdahulu (Dilaporkan Pasien / Wali)
create table if not exists public.patient_medical_histories (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  family_member_id uuid references public.family_members(id) on delete cascade,
  kondisi_penyakit text not null,
  tahun_kejadian text,
  status_riwayat text not null default 'masih_berlangsung' check (status_riwayat in ('masih_berlangsung', 'sudah_selesai', 'tidak_diketahui')),
  catatan text,
  sumber_informasi text not null default 'laporan_pasien' check (sumber_informasi in ('laporan_pasien', 'laporan_wali')),
  status_verifikasi text not null default 'belum_diverifikasi' check (status_verifikasi in ('belum_diverifikasi', 'terverifikasi', 'ditolak')),
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamp with time zone,
  verification_notes text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Indeks performa
create index if not exists idx_pmh_patient_id on public.patient_medical_histories(patient_id);
create index if not exists idx_pmh_family_member_id on public.patient_medical_histories(family_member_id);

-- Aktifkan RLS
alter table public.patient_medical_histories enable row level security;

-- Cabut akses anon & public
revoke all on public.patient_medical_histories from anon, public;
grant select, insert, update, delete on public.patient_medical_histories to authenticated;

-- Policy RLS dasar untuk authenticated
create policy "pmh_owner_manage" on public.patient_medical_histories
  for all to authenticated
  using (
    patient_id = auth.uid()
    or family_member_id in (select id from public.family_members where guardian_id = auth.uid())
  )
  with check (
    patient_id = auth.uid()
    or family_member_id in (select id from public.family_members where guardian_id = auth.uid())
  );

-- ============================================================================
-- 2. RPC: Pasien / Wali Melihat Riwayat Kesehatan Terdahulu
-- ============================================================================
create or replace function public.list_my_medical_histories()
returns table(
  id uuid,
  patient_id uuid,
  family_member_id uuid,
  subject_name text,
  kondisi_penyakit text,
  tahun_kejadian text,
  status_riwayat text,
  catatan text,
  sumber_informasi text,
  status_verifikasi text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
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
  select pmh.id, pmh.patient_id, pmh.family_member_id,
         coalesce(fm.full_name, pr.full_name) as subject_name,
         pmh.kondisi_penyakit, pmh.tahun_kejadian, pmh.status_riwayat,
         pmh.catatan, pmh.sumber_informasi, pmh.status_verifikasi,
         pmh.created_at, pmh.updated_at
  from public.patient_medical_histories pmh
  join public.profiles pr on pr.id = pmh.patient_id
  left join public.family_members fm on fm.id = pmh.family_member_id
  where pmh.patient_id = v_uid
     or pmh.family_member_id in (select fmb.id from public.family_members fmb where fmb.guardian_id = v_uid)
  order by pmh.created_at desc;
end;
$$;

-- ============================================================================
-- 3. RPC: Pasien / Wali Menambah Riwayat Kesehatan Terdahulu
-- ============================================================================
create or replace function public.add_patient_medical_history(
  p_kondisi_penyakit text,
  p_tahun_kejadian text default null,
  p_status_riwayat text default 'masih_berlangsung',
  p_catatan text default null,
  p_family_member_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_sumber text := 'laporan_pasien';
  v_status text := coalesce(nullif(trim(p_status_riwayat), ''), 'masih_berlangsung');
  v_kondisi text := trim(coalesce(p_kondisi_penyakit, ''));
  v_new_id uuid;
begin
  if v_uid is null then
    raise exception 'Anda harus masuk terlebih dahulu';
  end if;

  if v_kondisi = '' then
    raise exception 'Nama kondisi atau penyakit terdahulu wajib diisi';
  end if;

  if v_status not in ('masih_berlangsung', 'sudah_selesai', 'tidak_diketahui') then
    v_status := 'masih_berlangsung';
  end if;

  if p_family_member_id is not null then
    if not exists (
      select 1 from public.family_members where id = p_family_member_id and guardian_id = v_uid
    ) then
      raise exception 'Anggota keluarga tidak valid atau bukan di bawah perwalian Anda';
    end if;
    v_sumber := 'laporan_wali';
  end if;

  insert into public.patient_medical_histories (
    patient_id,
    family_member_id,
    kondisi_penyakit,
    tahun_kejadian,
    status_riwayat,
    catatan,
    sumber_informasi,
    status_verifikasi,
    created_by
  ) values (
    v_uid,
    p_family_member_id,
    v_kondisi,
    nullif(trim(p_tahun_kejadian), ''),
    v_status,
    nullif(trim(p_catatan), ''),
    v_sumber,
    'belum_diverifikasi',
    v_uid
  )
  returning id into v_new_id;

  return v_new_id;
end;
$$;

-- ============================================================================
-- 4. RPC: Pasien / Wali Mengubah Riwayat Kesehatan Terdahulu
-- ============================================================================
create or replace function public.update_patient_medical_history(
  p_id uuid,
  p_kondisi_penyakit text,
  p_tahun_kejadian text default null,
  p_status_riwayat text default 'masih_berlangsung',
  p_catatan text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_kondisi text := trim(coalesce(p_kondisi_penyakit, ''));
  v_status text := coalesce(nullif(trim(p_status_riwayat), ''), 'masih_berlangsung');
begin
  if v_uid is null then
    raise exception 'Anda harus masuk terlebih dahulu';
  end if;

  if v_kondisi = '' then
    raise exception 'Nama kondisi atau penyakit terdahulu wajib diisi';
  end if;

  if v_status not in ('masih_berlangsung', 'sudah_selesai', 'tidak_diketahui') then
    v_status := 'masih_berlangsung';
  end if;

  update public.patient_medical_histories pmh
  set kondisi_penyakit = v_kondisi,
      tahun_kejadian = nullif(trim(p_tahun_kejadian), ''),
      status_riwayat = v_status,
      catatan = nullif(trim(p_catatan), ''),
      updated_at = now()
  where pmh.id = p_id
    and (
      pmh.patient_id = v_uid
      or pmh.family_member_id in (select id from public.family_members where guardian_id = v_uid)
    );

  if not found then
    raise exception 'Riwayat kesehatan tidak ditemukan atau Anda tidak memiliki akses untuk mengubahnya';
  end if;

  return true;
end;
$$;

-- ============================================================================
-- 5. RPC: Pasien / Wali Menghapus Riwayat Kesehatan Terdahulu
-- ============================================================================
create or replace function public.delete_patient_medical_history(
  p_id uuid
)
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

  delete from public.patient_medical_histories pmh
  where pmh.id = p_id
    and (
      pmh.patient_id = v_uid
      or pmh.family_member_id in (select id from public.family_members where guardian_id = v_uid)
    );

  if not found then
    raise exception 'Riwayat kesehatan tidak ditemukan atau Anda tidak memiliki akses untuk menghapusnya';
  end if;

  return true;
end;
$$;

-- ============================================================================
-- 6. RPC: Dokter Membuka Riwayat Kesehatan Terdahulu Pasien dengan Token Izin
-- ============================================================================
create or replace function public.open_patient_medical_histories(
  p_referral_id uuid,
  p_token_code text
)
returns table(
  id uuid,
  patient_id uuid,
  family_member_id uuid,
  subject_name text,
  kondisi_penyakit text,
  tahun_kejadian text,
  status_riwayat text,
  catatan text,
  sumber_informasi text,
  status_verifikasi text,
  created_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_doctor_staff record;
  v_ref record;
  v_token record;
  v_clean_code text := trim(coalesce(p_token_code, ''));
  v_has_histories boolean := false;
  h record;
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
    raise exception 'Hanya dokter aktif di fasilitas kesehatan aktif yang dapat membuka riwayat kesehatan pasien';
  end if;

  -- 2. Ambil data rujukan dan verifikasi wewenang faskes dokter
  select r.id, r.patient_id, r.family_member_id, r.origin_facility_id, r.destination_facility_id
  into v_ref
  from public.referrals r
  where r.id = p_referral_id;

  if v_ref.id is null then
    raise exception 'Data rujukan tidak ditemukan';
  end if;

  if v_doctor_staff.facility_id <> v_ref.origin_facility_id
     and v_doctor_staff.facility_id <> v_ref.destination_facility_id then
    raise exception 'Anda tidak memiliki wewenang pada faskes rujukan pasien ini';
  end if;

  -- 3. Cari token terbaru untuk pasien ini
  select pat.id, pat.token_hash, pat.expires_at, pat.failed_attempts, pat.is_locked, pat.revoked_at
  into v_token
  from public.patient_access_tokens pat
  where pat.patient_id = v_ref.patient_id
  order by pat.created_at desc, pat.ctid desc
  limit 1;

  -- Jika token sama sekali belum ada atau kode kosong
  if v_token.id is null or v_clean_code = '' then
    insert into public.medical_record_access_logs(accessed_by, facility_id, patient_id, family_member_id, access_result, notes)
    values (v_uid, v_doctor_staff.facility_id, v_ref.patient_id, v_ref.family_member_id, 'tanpa_token', 'Akses riwayat terdahulu ditolak: pasien belum memiliki token otorisasi atau kode tidak disertakan');
    return query select null::uuid, v_ref.patient_id, v_ref.family_member_id, null::text, 'AKSES_DITOLAK'::text, null::text, null::text, 'Akses ditolak: pasien belum memiliki token otorisasi aktif atau kode tidak disertakan'::text, null::text, null::text, null::timestamptz;
    return;
  end if;

  -- Jika token dicabut
  if v_token.revoked_at is not null then
    insert into public.medical_record_access_logs(accessed_by, facility_id, patient_id, family_member_id, access_result, notes)
    values (v_uid, v_doctor_staff.facility_id, v_ref.patient_id, v_ref.family_member_id, 'token_dicabut', 'Akses riwayat terdahulu ditolak: token telah dicabut oleh pasien');
    return query select null::uuid, v_ref.patient_id, v_ref.family_member_id, null::text, 'AKSES_DITOLAK'::text, null::text, null::text, 'Akses ditolak: token otorisasi telah dicabut oleh pasien'::text, null::text, null::text, null::timestamptz;
    return;
  end if;

  -- Jika token kedaluwarsa
  if v_token.expires_at < now() then
    insert into public.medical_record_access_logs(accessed_by, facility_id, patient_id, family_member_id, access_result, notes)
    values (v_uid, v_doctor_staff.facility_id, v_ref.patient_id, v_ref.family_member_id, 'token_kedaluwarsa', 'Akses riwayat terdahulu ditolak: token telah melewati batas waktu 60 menit');
    return query select null::uuid, v_ref.patient_id, v_ref.family_member_id, null::text, 'AKSES_DITOLAK'::text, null::text, null::text, 'Akses ditolak: token otorisasi telah kedaluwarsa (masa berlaku 60 menit)'::text, null::text, null::text, null::timestamptz;
    return;
  end if;

  -- Jika token terkunci
  if v_token.is_locked then
    insert into public.medical_record_access_logs(accessed_by, facility_id, patient_id, family_member_id, access_result, notes)
    values (v_uid, v_doctor_staff.facility_id, v_ref.patient_id, v_ref.family_member_id, 'token_terkunci', 'Akses riwayat terdahulu ditolak: token telah terkunci karena melebihi 5 kali percobaan salah');
    return query select null::uuid, v_ref.patient_id, v_ref.family_member_id, null::text, 'AKSES_DITOLAK'::text, null::text, null::text, 'Akses ditolak: token akses terkunci karena batas 5 kali percobaan salah terlampaui'::text, null::text, null::text, null::timestamptz;
    return;
  end if;

  -- 4. Verifikasi kode token menggunakan extensions.crypt
  if extensions.crypt(v_clean_code, v_token.token_hash) <> v_token.token_hash then
    update public.patient_access_tokens
    set failed_attempts = failed_attempts + 1,
        is_locked = (failed_attempts + 1 >= 5)
    where patient_access_tokens.id = v_token.id;

    insert into public.medical_record_access_logs(accessed_by, facility_id, patient_id, family_member_id, access_result, notes)
    values (
      v_uid,
      v_doctor_staff.facility_id,
      v_ref.patient_id,
      v_ref.family_member_id,
      case when v_token.failed_attempts + 1 >= 5 then 'token_terkunci' else 'token_salah' end,
      format('Akses riwayat terdahulu ditolak: kode otorisasi salah (percobaan ke-%s)', v_token.failed_attempts + 1)
    );

    if v_token.failed_attempts + 1 >= 5 then
      return query select null::uuid, v_ref.patient_id, v_ref.family_member_id, null::text, 'AKSES_DITOLAK'::text, null::text, null::text, 'Akses ditolak: kode salah. Batas 5 kali percobaan tercapai, token kini terkunci'::text, null::text, null::text, null::timestamptz;
    else
      return query select null::uuid, v_ref.patient_id, v_ref.family_member_id, null::text, 'AKSES_DITOLAK'::text, null::text, null::text, format('Akses ditolak: kode token otorisasi salah (%s dari 5 percobaan)', v_token.failed_attempts + 1)::text, null::text, null::text, null::timestamptz;
    end if;
    return;
  end if;

  -- 5. Otorisasi BERHASIL: Catat log sukses dan kembalikan riwayat kesehatan terdahulu
  insert into public.medical_record_access_logs(accessed_by, facility_id, patient_id, family_member_id, access_result, notes)
  values (v_uid, v_doctor_staff.facility_id, v_ref.patient_id, v_ref.family_member_id, 'berhasil', 'Akses riwayat kesehatan terdahulu disetujui dengan token otorisasi');

  for h in
    select pmh.id, pmh.patient_id, pmh.family_member_id,
           coalesce(fm.full_name, pr.full_name) as subject_name,
           pmh.kondisi_penyakit, pmh.tahun_kejadian, pmh.status_riwayat,
           pmh.catatan, pmh.sumber_informasi, pmh.status_verifikasi,
           pmh.created_at
    from public.patient_medical_histories pmh
    join public.profiles pr on pr.id = pmh.patient_id
    left join public.family_members fm on fm.id = pmh.family_member_id
    where pmh.patient_id = v_ref.patient_id
      and (
        (v_ref.family_member_id is null and pmh.family_member_id is null)
        or (v_ref.family_member_id is not null and pmh.family_member_id = v_ref.family_member_id)
      )
    order by pmh.created_at desc
  loop
    v_has_histories := true;
    return query select h.id, h.patient_id, h.family_member_id, h.subject_name, h.kondisi_penyakit, h.tahun_kejadian, h.status_riwayat, h.catatan, h.sumber_informasi, h.status_verifikasi, h.created_at;
  end loop;

  if not v_has_histories then
    return query select null::uuid, v_ref.patient_id, v_ref.family_member_id, null::text, 'KOSONG'::text, null::text, null::text, 'Pasien belum memasukkan riwayat kesehatan terdahulu'::text, null::text, null::text, null::timestamptz;
  end if;
  return;
end;
$$;

-- ============================================================================
-- 7. Hak Akses Eksekusi (Revoke Public, Grant Authenticated)
-- ============================================================================
revoke all on function public.list_my_medical_histories() from anon, public;
grant execute on function public.list_my_medical_histories() to authenticated;

revoke all on function public.add_patient_medical_history(text, text, text, text, uuid) from anon, public;
grant execute on function public.add_patient_medical_history(text, text, text, text, uuid) to authenticated;

revoke all on function public.update_patient_medical_history(uuid, text, text, text, text) from anon, public;
grant execute on function public.update_patient_medical_history(uuid, text, text, text, text) to authenticated;

revoke all on function public.delete_patient_medical_history(uuid) from anon, public;
grant execute on function public.delete_patient_medical_history(uuid) to authenticated;

revoke all on function public.open_patient_medical_histories(uuid, text) from anon, public;
grant execute on function public.open_patient_medical_histories(uuid, text) to authenticated;
