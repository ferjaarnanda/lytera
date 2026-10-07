-- ============================================================================
-- Migrasi Tahap 5a: Verifikasi Administrasi, Penjamin, & Hak Akses
-- Proyek: Lytera (losqwizqvuikoueswxnc)
-- ============================================================================

-- 1. Tambah kolom penjamin ke tabel patients dan family_members
alter table public.patients
  add column if not exists payer_type text check (payer_type in ('bpjs', 'asuransi', 'mandiri', 'jaminan_daerah')) default 'mandiri',
  add column if not exists insurance_name text,
  add column if not exists insurance_policy_number text;

alter table public.family_members
  add column if not exists payer_type text check (payer_type in ('bpjs', 'asuransi', 'mandiri', 'jaminan_daerah')) default 'mandiri',
  add column if not exists insurance_name text,
  add column if not exists insurance_policy_number text;

-- 2. Buat tabel verification_requests
create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  family_member_id uuid references public.family_members(id) on delete cascade,
  type text not null check (type in ('domisili', 'kurang_mampu')),
  status text not null check (status in ('menunggu', 'disetujui', 'ditolak')) default 'menunggu',
  document_paths text[] not null default '{}',
  patient_note text,
  review_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamp with time zone,
  valid_until date,
  province text,
  city text,
  district text,
  village text,
  created_at timestamp with time zone default now()
);

-- Index partial: hanya 1 pengajuan berstatus 'menunggu' per subjek dan per jenis
create unique index if not exists idx_verification_requests_pending_patient
  on public.verification_requests(patient_id, type)
  where status = 'menunggu' and family_member_id is null;

create unique index if not exists idx_verification_requests_pending_family
  on public.verification_requests(patient_id, family_member_id, type)
  where status = 'menunggu' and family_member_id is not null;

-- RLS pada verification_requests
alter table public.verification_requests enable row level security;

drop policy if exists verification_requests_patient_select on public.verification_requests;
create policy verification_requests_patient_select on public.verification_requests
  for select using (patient_id = auth.uid());

-- Cabut akses modifikasi langsung; modifikasi hanya lewat RPC SECURITY DEFINER
revoke insert, update, delete on public.verification_requests from public, anon, authenticated;
grant select on public.verification_requests to authenticated;

-- 3. Storage bucket privat verification-documents
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verification-documents',
  'verification-documents',
  false,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'application/pdf'];

-- RLS Storage: Pasien mengunggah dan membaca di foldernya sendiri ({auth.uid()}/...)
drop policy if exists "Pasien unggah dokumen verifikasi" on storage.objects;
create policy "Pasien unggah dokumen verifikasi" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Pasien baca dokumen verifikasi sendiri" on storage.objects;
create policy "Pasien baca dokumen verifikasi sendiri" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. Pembaruan data uji lama: ubah kode wilayah angka menjadi nama Title Case
update public.patients
set province = 'Jawa Tengah',
    city = 'Kota Semarang',
    district = 'Semarang Tengah',
    village = 'Miroto'
where id = '3cfd180a-f563-4924-bc0b-5101d7b06868';

update public.patients
set province = 'Jawa Tengah',
    city = 'Kota Semarang',
    district = 'Candisari',
    village = 'Candi'
where id = '8c951786-ad2a-43cb-b8fb-7ad82488fb36';

update public.verifier_profiles
set province = 'Jawa Tengah',
    city = 'Kota Semarang',
    district = 'Semarang Tengah',
    village = 'Miroto'
where id = 'd6c09242-271b-4b56-819d-b69181874b59';

-- 5. RPC SECURITY DEFINER: submit_verification
create or replace function public.submit_verification(
  p_type text,
  p_family_member_id uuid default null,
  p_document_paths text[] default '{}',
  p_patient_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_patient record;
  v_new_id uuid;
  v_count integer;
begin
  if v_uid is null then
    raise exception 'Anda harus masuk terlebih dahulu';
  end if;

  if p_type not in ('domisili', 'kurang_mampu') then
    raise exception 'Jenis verifikasi tidak valid. Pilihan: domisili, kurang_mampu';
  end if;

  -- Ambil data pasien dan wilayah domisili
  select p.id, p.province, p.city, p.district, p.village
  into v_patient
  from public.patients p
  where p.id = v_uid;

  if v_patient.id is null then
    raise exception 'Profil pasien tidak ditemukan';
  end if;

  -- Jika untuk anggota keluarga, pastikan wali sah
  if p_family_member_id is not null then
    select count(*) into v_count
    from public.family_members fm
    where fm.id = p_family_member_id and fm.guardian_id = v_uid;

    if v_count = 0 then
      raise exception 'Anggota keluarga tidak ditemukan atau berada di luar perwalian Anda';
    end if;
  end if;

  -- Periksa apakah sudah ada pengajuan berstatus menunggu
  select count(*) into v_count
  from public.verification_requests vr
  where vr.patient_id = v_uid
    and ((p_family_member_id is null and vr.family_member_id is null) or (vr.family_member_id = p_family_member_id))
    and vr.type = p_type
    and vr.status = 'menunggu';

  if v_count > 0 then
    raise exception 'Sudah ada pengajuan verifikasi jenis ini yang sedang dalam proses peninjauan';
  end if;

  -- Simpan pengajuan dengan snapshot wilayah saat ini
  insert into public.verification_requests (
    patient_id,
    family_member_id,
    type,
    status,
    document_paths,
    patient_note,
    province,
    city,
    district,
    village
  ) values (
    v_uid,
    p_family_member_id,
    p_type,
    'menunggu',
    coalesce(p_document_paths, '{}'),
    p_patient_note,
    v_patient.province,
    v_patient.city,
    v_patient.district,
    v_patient.village
  ) returning verification_requests.id into v_new_id;

  return v_new_id;
end;
$$;

revoke all on function public.submit_verification(text, uuid, text[], text) from public, anon;
grant execute on function public.submit_verification(text, uuid, text[], text) to authenticated;

-- 6. RPC SECURITY DEFINER: list_my_verifications
create or replace function public.list_my_verifications()
returns table(
  id uuid,
  type text,
  status text,
  document_paths text[],
  patient_note text,
  review_note text,
  reviewed_at timestamp with time zone,
  valid_until date,
  subject_name text,
  is_family boolean,
  created_at timestamp with time zone
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select vr.id, vr.type, vr.status, vr.document_paths, vr.patient_note, vr.review_note,
         vr.reviewed_at, vr.valid_until,
         coalesce(fm.full_name, p.full_name) as subject_name,
         (fm.id is not null) as is_family,
         vr.created_at
  from public.verification_requests vr
  join public.profiles p on p.id = vr.patient_id
  left join public.family_members fm on fm.id = vr.family_member_id
  where vr.patient_id = auth.uid()
  order by vr.created_at desc;
$$;

revoke all on function public.list_my_verifications() from public, anon;
grant execute on function public.list_my_verifications() to authenticated;

-- 7. RPC SECURITY DEFINER: list_verification_queue (untuk verifikator aktif dalam cakupan wilayahnya)
create or replace function public.list_verification_queue(p_status text default 'menunggu')
returns table(
  id uuid,
  patient_id uuid,
  family_member_id uuid,
  subject_name text,
  nik_masked text,
  type text,
  status text,
  document_paths text[],
  patient_note text,
  review_note text,
  reviewed_at timestamp with time zone,
  valid_until date,
  province text,
  city text,
  district text,
  village text,
  created_at timestamp with time zone
)
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_verif record;
  v_status_filter text := coalesce(p_status, 'menunggu');
begin
  if v_uid is null then
    raise exception 'Anda harus masuk terlebih dahulu';
  end if;

  -- Verifikasi pemanggil adalah verifikator aktif
  select vp.level, vp.province, vp.city, vp.district, vp.village
  into v_verif
  from public.verifier_profiles vp
  join public.profiles p on p.id = vp.id
  where vp.id = v_uid and vp.status = 'aktif' and p.status = 'aktif';

  if v_verif.level is null then
    raise exception 'Hanya verifikator aktif yang dapat mengakses antrean verifikasi';
  end if;

  return query
  select vr.id, vr.patient_id, vr.family_member_id,
         coalesce(fm.full_name, pp.full_name) as subject_name,
         case
           when coalesce(fm.nik, pt.nik) is null then null
           else left(coalesce(fm.nik, pt.nik), 4) || '••••••••' || right(coalesce(fm.nik, pt.nik), 4)
         end as nik_masked,
         vr.type, vr.status, vr.document_paths, vr.patient_note, vr.review_note,
         vr.reviewed_at, vr.valid_until,
         vr.province, vr.city, vr.district, vr.village,
         vr.created_at
  from public.verification_requests vr
  join public.patients pt on pt.id = vr.patient_id
  join public.profiles pp on pp.id = vr.patient_id
  left join public.family_members fm on fm.id = vr.family_member_id
  where (v_status_filter = 'semua' or vr.status = v_status_filter)
    and (
      case v_verif.level
        when 'kelurahan' then
          lower(replace(coalesce(vr.city, ''), ' ', '')) = lower(replace(coalesce(v_verif.city, ''), ' ', ''))
          and lower(replace(coalesce(vr.district, ''), ' ', '')) = lower(replace(coalesce(v_verif.district, ''), ' ', ''))
          and lower(replace(coalesce(vr.village, ''), ' ', '')) = lower(replace(coalesce(v_verif.village, ''), ' ', ''))
        when 'kecamatan' then
          lower(replace(coalesce(vr.city, ''), ' ', '')) = lower(replace(coalesce(v_verif.city, ''), ' ', ''))
          and lower(replace(coalesce(vr.district, ''), ' ', '')) = lower(replace(coalesce(v_verif.district, ''), ' ', ''))
        when 'dinas_sosial' then
          lower(replace(coalesce(vr.city, ''), ' ', '')) = lower(replace(coalesce(v_verif.city, ''), ' ', ''))
        else false
      end
    )
  order by vr.created_at desc;
end;
$$;

revoke all on function public.list_verification_queue(text) from public, anon;
grant execute on function public.list_verification_queue(text) to authenticated;

-- 8. RPC SECURITY DEFINER: review_verification
create or replace function public.review_verification(
  p_id uuid,
  p_decision text,
  p_note text default null,
  p_valid_until date default null
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_verif record;
  v_req record;
  v_is_match boolean := false;
begin
  if v_uid is null then
    raise exception 'Anda harus masuk terlebih dahulu';
  end if;

  if p_decision not in ('disetujui', 'ditolak') then
    raise exception 'Keputusan tidak valid. Pilihan: disetujui, ditolak';
  end if;

  if p_decision = 'ditolak' and (p_note is null or trim(p_note) = '') then
    raise exception 'Alasan penolakan wajib disertakan';
  end if;

  -- Verifikasi verifikator aktif
  select vp.level, vp.province, vp.city, vp.district, vp.village
  into v_verif
  from public.verifier_profiles vp
  join public.profiles p on p.id = vp.id
  where vp.id = v_uid and vp.status = 'aktif' and p.status = 'aktif';

  if v_verif.level is null then
    raise exception 'Hanya verifikator aktif yang berhak memproses verifikasi';
  end if;

  -- Ambil data pengajuan yang masih berstatus menunggu
  select vr.id, vr.province, vr.city, vr.district, vr.village, vr.status
  into v_req
  from public.verification_requests vr
  where vr.id = p_id;

  if v_req.id is null then
    raise exception 'Pengajuan verifikasi tidak ditemukan';
  end if;

  if v_req.status <> 'menunggu' then
    raise exception 'Pengajuan ini sudah ditinjau sebelumnya';
  end if;

  -- Periksa kesesuaian wilayah
  v_is_match := case v_verif.level
    when 'kelurahan' then
      lower(replace(coalesce(v_req.city, ''), ' ', '')) = lower(replace(coalesce(v_verif.city, ''), ' ', ''))
      and lower(replace(coalesce(v_req.district, ''), ' ', '')) = lower(replace(coalesce(v_verif.district, ''), ' ', ''))
      and lower(replace(coalesce(v_req.village, ''), ' ', '')) = lower(replace(coalesce(v_verif.village, ''), ' ', ''))
    when 'kecamatan' then
      lower(replace(coalesce(v_req.city, ''), ' ', '')) = lower(replace(coalesce(v_verif.city, ''), ' ', ''))
      and lower(replace(coalesce(v_req.district, ''), ' ', '')) = lower(replace(coalesce(v_verif.district, ''), ' ', ''))
    when 'dinas_sosial' then
      lower(replace(coalesce(v_req.city, ''), ' ', '')) = lower(replace(coalesce(v_verif.city, ''), ' ', ''))
    else false
  end;

  if not v_is_match then
    raise exception 'Pengajuan verifikasi berada di luar wilayah kewenangan Anda';
  end if;

  -- Update status pengajuan
  update public.verification_requests
  set status = p_decision,
      review_note = trim(p_note),
      reviewed_by = v_uid,
      reviewed_at = now(),
      valid_until = case when p_decision = 'disetujui' then p_valid_until else null end
  where verification_requests.id = p_id;

  return true;
end;
$$;

revoke all on function public.review_verification(uuid, text, text, date) from public, anon;
grant execute on function public.review_verification(uuid, text, text, date) to authenticated;

-- 9. RPC SECURITY DEFINER: Persetujuan Akun Verifikator oleh Dinkes
create or replace function public.list_pending_verifiers()
returns table(
  id uuid,
  full_name text,
  email text,
  nip text,
  jabatan text,
  level text,
  unit text,
  province text,
  city text,
  district text,
  village text,
  created_at timestamp with time zone
)
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_role text;
begin
  if v_uid is null then
    raise exception 'Anda harus masuk terlebih dahulu';
  end if;

  select p.role into v_role from public.profiles p where p.id = v_uid;
  if v_role <> 'dinkes' then
    raise exception 'Hanya pihak Dinas Kesehatan yang dapat melihat daftar permohonan verifikator';
  end if;

  return query
  select vp.id, p.full_name, p.email, vp.nip, vp.jabatan, vp.level, vp.unit,
         vp.province, vp.city, vp.district, vp.village, vp.created_at
  from public.verifier_profiles vp
  join public.profiles p on p.id = vp.id
  where vp.status = 'menunggu' or p.status = 'menunggu'
  order by vp.created_at desc;
end;
$$;

revoke all on function public.list_pending_verifiers() from public, anon;
grant execute on function public.list_pending_verifiers() to authenticated;

create or replace function public.review_verifier(
  p_id uuid,
  p_decision text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_role text;
begin
  if v_uid is null then
    raise exception 'Anda harus masuk terlebih dahulu';
  end if;

  select p.role into v_role from public.profiles p where p.id = v_uid;
  if v_role <> 'dinkes' then
    raise exception 'Hanya pihak Dinas Kesehatan yang dapat meninjau akun verifikator';
  end if;

  if p_decision not in ('aktif', 'ditolak') then
    raise exception 'Keputusan tidak valid. Pilihan: aktif, ditolak';
  end if;

  update public.verifier_profiles
  set status = p_decision
  where verifier_profiles.id = p_id;

  update public.profiles
  set status = p_decision
  where profiles.id = p_id;

  return true;
end;
$$;

revoke all on function public.review_verifier(uuid, text) from public, anon;
grant execute on function public.review_verifier(uuid, text) to authenticated;

-- 10. Perluas list_facility_referrals dan list_my_referrals
create or replace function public.list_facility_referrals(p_direction text default 'keluar')
returns table(
  id uuid,
  status text,
  priority text,
  poli text,
  diagnosis_icd10 text,
  catatan_klinis text,
  jadwal_pemeriksaan timestamp with time zone,
  created_at timestamp with time zone,
  patient_name text,
  is_family boolean,
  nik_masked text,
  origin_name text,
  destination_name text,
  destination_doctor text,
  created_by_name text,
  payer_type text,
  payer_number_masked text,
  domisili_terverifikasi boolean,
  jaminan_daerah_status text,
  jaminan_daerah_valid_until date
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select r.id, r.status, r.priority, r.poli, r.diagnosis_icd10, r.catatan_klinis, r.jadwal_pemeriksaan, r.created_at,
         coalesce(fm.full_name, pp.full_name) as patient_name,
         (fm.id is not null) as is_family,
         case when coalesce(fm.nik, p.nik) is null then null
              else left(coalesce(fm.nik, p.nik), 4) || '••••••••' || right(coalesce(fm.nik, p.nik), 4) end as nik_masked,
         fo.name as origin_name, fd.name as destination_name, pd.full_name as destination_doctor, pc.full_name as created_by_name,
         coalesce(fm.payer_type, p.payer_type, 'mandiri') as payer_type,
         case
           when coalesce(fm.payer_type, p.payer_type, 'mandiri') = 'bpjs' and coalesce(fm.bpjs_number, p.bpjs_number) is not null then
             '•••••••••' || right(coalesce(fm.bpjs_number, p.bpjs_number), 4)
           when coalesce(fm.payer_type, p.payer_type, 'mandiri') = 'asuransi' and coalesce(fm.insurance_policy_number, p.insurance_policy_number) is not null then
             coalesce(fm.insurance_name, p.insurance_name, 'Polis') || ' ••' || right(coalesce(fm.insurance_policy_number, p.insurance_policy_number), 4)
           else null
         end as payer_number_masked,
         -- Domisili terverifikasi (jika ada permintaan domisili yang disetujui)
         exists (
           select 1 from public.verification_requests vr
           where vr.patient_id = r.patient_id
             and ((r.family_member_id is null and vr.family_member_id is null) or (vr.family_member_id = r.family_member_id))
             and vr.type = 'domisili'
             and vr.status = 'disetujui'
         ) as domisili_terverifikasi,
         -- Status jaminan daerah
         coalesce(
           (
             select
               case
                 when vr.status = 'disetujui' and (vr.valid_until is null or vr.valid_until >= current_date) then 'terverifikasi'
                 when vr.status = 'menunggu' then 'menunggu'
                 else 'belum'
               end
             from public.verification_requests vr
             where vr.patient_id = r.patient_id
               and ((r.family_member_id is null and vr.family_member_id is null) or (vr.family_member_id = r.family_member_id))
               and vr.type = 'kurang_mampu'
             order by vr.created_at desc
             limit 1
           ),
           'belum'
         ) as jaminan_daerah_status,
         (
           select vr.valid_until
           from public.verification_requests vr
           where vr.patient_id = r.patient_id
             and ((r.family_member_id is null and vr.family_member_id is null) or (vr.family_member_id = r.family_member_id))
             and vr.type = 'kurang_mampu'
             and vr.status = 'disetujui'
           order by vr.created_at desc
           limit 1
         ) as jaminan_daerah_valid_until
  from public.referrals r
  join public.facilities fo on fo.id = r.origin_facility_id
  join public.facilities fd on fd.id = r.destination_facility_id
  join public.patients p on p.id = r.patient_id
  join public.profiles pp on pp.id = r.patient_id
  left join public.family_members fm on fm.id = r.family_member_id
  left join public.facility_staff sd on sd.id = r.destination_doctor_id
  left join public.profiles pd on pd.id = sd.profile_id
  left join public.profiles pc on pc.id = r.created_by
  where case when lower(coalesce(p_direction, 'keluar')) = 'masuk'
             then r.destination_facility_id in (select public.user_facility_ids())
             else r.origin_facility_id in (select public.user_facility_ids()) end
  order by
    case when lower(coalesce(p_direction, 'keluar')) = 'masuk'
         then case r.priority when 'gawat_darurat' then 0 when 'urgent' then 1 else 2 end
         else 0 end,
    r.created_at desc
  limit 200;
$$;

revoke all on function public.list_facility_referrals(text) from public, anon;
grant execute on function public.list_facility_referrals(text) to authenticated;

create or replace function public.list_my_referrals()
returns table(
  id uuid,
  status text,
  priority text,
  poli text,
  diagnosis_icd10 text,
  jadwal_pemeriksaan timestamp with time zone,
  created_at timestamp with time zone,
  origin_name text,
  destination_name text,
  destination_doctor text,
  subject_name text,
  is_family boolean,
  payer_type text,
  payer_number_masked text,
  domisili_terverifikasi boolean,
  jaminan_daerah_status text,
  jaminan_daerah_valid_until date
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select r.id, r.status, r.priority, r.poli, r.diagnosis_icd10, r.jadwal_pemeriksaan, r.created_at,
         fo.name as origin_name, fd.name as destination_name, pd.full_name as destination_doctor,
         coalesce(fm.full_name, pp.full_name) as subject_name, (fm.id is not null) as is_family,
         coalesce(fm.payer_type, p.payer_type, 'mandiri') as payer_type,
         case
           when coalesce(fm.payer_type, p.payer_type, 'mandiri') = 'bpjs' and coalesce(fm.bpjs_number, p.bpjs_number) is not null then
             '•••••••••' || right(coalesce(fm.bpjs_number, p.bpjs_number), 4)
           when coalesce(fm.payer_type, p.payer_type, 'mandiri') = 'asuransi' and coalesce(fm.insurance_policy_number, p.insurance_policy_number) is not null then
             coalesce(fm.insurance_name, p.insurance_name, 'Polis') || ' ••' || right(coalesce(fm.insurance_policy_number, p.insurance_policy_number), 4)
           else null
         end as payer_number_masked,
         exists (
           select 1 from public.verification_requests vr
           where vr.patient_id = r.patient_id
             and ((r.family_member_id is null and vr.family_member_id is null) or (vr.family_member_id = r.family_member_id))
             and vr.type = 'domisili'
             and vr.status = 'disetujui'
         ) as domisili_terverifikasi,
         coalesce(
           (
             select
               case
                 when vr.status = 'disetujui' and (vr.valid_until is null or vr.valid_until >= current_date) then 'terverifikasi'
                 when vr.status = 'menunggu' then 'menunggu'
                 else 'belum'
               end
             from public.verification_requests vr
             where vr.patient_id = r.patient_id
               and ((r.family_member_id is null and vr.family_member_id is null) or (vr.family_member_id = r.family_member_id))
               and vr.type = 'kurang_mampu'
             order by vr.created_at desc
             limit 1
           ),
           'belum'
         ) as jaminan_daerah_status,
         (
           select vr.valid_until
           from public.verification_requests vr
           where vr.patient_id = r.patient_id
             and ((r.family_member_id is null and vr.family_member_id is null) or (vr.family_member_id = r.family_member_id))
             and vr.type = 'kurang_mampu'
             and vr.status = 'disetujui'
           order by vr.created_at desc
           limit 1
         ) as jaminan_daerah_valid_until
  from public.referrals r
  join public.facilities fo on fo.id = r.origin_facility_id
  join public.facilities fd on fd.id = r.destination_facility_id
  join public.patients p on p.id = r.patient_id
  join public.profiles pp on pp.id = r.patient_id
  left join public.family_members fm on fm.id = r.family_member_id
  left join public.facility_staff sd on sd.id = r.destination_doctor_id
  left join public.profiles pd on pd.id = sd.profile_id
  where r.patient_id = auth.uid()
  order by r.created_at desc;
$$;

revoke all on function public.list_my_referrals() from public, anon;
grant execute on function public.list_my_referrals() to authenticated;
