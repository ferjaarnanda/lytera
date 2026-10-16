-- ============================================================================
-- Migrasi: RPC Pendaftaran & Pelengkapan Profil Pasien Atomik
-- Menjamin profiles dan patients tersimpan dalam satu transaksi database ACID.
-- Mencegah adanya profil pasien aktif tanpa baris patients yang sah.
-- ============================================================================

create or replace function public.register_patient_personal(
  p_full_name text,
  p_nik text,
  p_dob date,
  p_gender text,
  p_phone text,
  p_province text,
  p_city text,
  p_district text,
  p_village text,
  p_address text,
  p_bpjs_number text default null,
  p_blood_type text default null,
  p_allergies text default null,
  p_payer_type text default 'mandiri',
  p_insurance_name text default null,
  p_insurance_policy_number text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_existing_role text;
  v_clean_nik text := trim(coalesce(p_nik, ''));
  v_clean_name text := trim(coalesce(p_full_name, ''));
  v_clean_phone text := trim(coalesce(p_phone, ''));
  v_clean_address text := trim(coalesce(p_address, ''));
  v_clean_prov text := trim(coalesce(p_province, ''));
  v_clean_city text := trim(coalesce(p_city, ''));
  v_clean_dist text := trim(coalesce(p_district, ''));
  v_clean_vill text := trim(coalesce(p_village, ''));
  v_gender text;
  v_payer text := lower(trim(coalesce(p_payer_type, 'mandiri')));
begin
  -- 1. Verifikasi sesi autentikasi
  if v_uid is null then
    raise exception 'Sesi autentikasi tidak valid atau Anda belum masuk';
  end if;

  -- 2. Validasi NIK (wajib 16 digit angka)
  if v_clean_nik !~ '^\d{16}$' then
    raise exception 'NIK harus terdiri dari 16 digit angka';
  end if;

  -- 3. Cek keunikan NIK terhadap akun pasien lain
  if exists (
    select 1 from public.patients 
    where nik = v_clean_nik and id != v_uid
  ) then
    raise exception 'NIK sudah terdaftar pada akun lain';
  end if;

  -- 4. Validasi Nama
  if v_clean_name = '' or length(v_clean_name) < 2 then
    raise exception 'Nama lengkap wajib diisi minimal 2 karakter';
  end if;

  -- 5. Validasi Tanggal Lahir
  if p_dob is null then
    raise exception 'Tanggal lahir wajib dipilih';
  end if;

  -- 6. Normalisasi dan validasi jenis kelamin
  v_gender := case 
    when lower(trim(p_gender)) in ('l', 'laki-laki', 'pria') then 'L'
    when lower(trim(p_gender)) in ('p', 'perempuan', 'wanita') then 'P'
    else null
  end;

  if v_gender is null then
    raise exception 'Jenis kelamin wajib dipilih (L atau P)';
  end if;

  -- 7. Validasi kontak
  if v_clean_phone = '' then
    raise exception 'Nomor telepon/kontak wajib diisi';
  end if;

  -- 8. Validasi wilayah & alamat
  if v_clean_prov = '' or v_clean_city = '' or v_clean_dist = '' or v_clean_vill = '' then
    raise exception 'Wilayah provinsi, kota, kecamatan, dan kelurahan wajib dipilih lengkap';
  end if;

  -- Detail alamat wajib memuat huruf (nama jalan, nomor rumah, RT/RW), bukan hanya angka
  if v_clean_address = '' or length(v_clean_address) < 5 or v_clean_address !~ '[a-zA-Z]' then
    raise exception 'Detail alamat harus memuat nama jalan, banjar, nomor rumah, atau RT/RW (tidak boleh hanya angka)';
  end if;

  -- 9. Normalisasi penjamin
  if v_payer not in ('mandiri', 'bpjs', 'asuransi', 'jaminan_daerah') then
    v_payer := 'mandiri';
  end if;

  -- 10. Validasi dan kelola tabel profiles
  select role into v_existing_role from public.profiles where id = v_uid;

  if v_existing_role is not null and v_existing_role != 'pasien' then
    raise exception 'Akun dengan peran selain pasien tidak dapat didaftarkan sebagai pasien';
  end if;

  select email into v_email from auth.users where id = v_uid;

  insert into public.profiles (
    id,
    role,
    sub_role,
    full_name,
    email,
    status
  ) values (
    v_uid,
    'pasien',
    'pribadi',
    v_clean_name,
    coalesce(v_email, ''),
    'aktif'
  )
  on conflict (id) do update set
    role = 'pasien',
    sub_role = 'pribadi',
    full_name = v_clean_name,
    status = 'aktif',
    updated_at = now();

  -- 11. Simpan data pasien secara atomik ke tabel patients
  insert into public.patients (
    id,
    patient_type,
    nik,
    dob,
    gender,
    phone,
    province,
    city,
    district,
    village,
    address,
    bpjs_number,
    blood_type,
    allergies,
    payer_type,
    insurance_name,
    insurance_policy_number
  ) values (
    v_uid,
    'pribadi',
    v_clean_nik,
    p_dob,
    v_gender,
    v_clean_phone,
    v_clean_prov,
    v_clean_city,
    v_clean_dist,
    v_clean_vill,
    v_clean_address,
    nullif(trim(p_bpjs_number), ''),
    nullif(trim(p_blood_type), ''),
    nullif(trim(p_allergies), ''),
    v_payer,
    nullif(trim(p_insurance_name), ''),
    nullif(trim(p_insurance_policy_number), '')
  )
  on conflict (id) do update set
    patient_type = 'pribadi',
    nik = excluded.nik,
    dob = excluded.dob,
    gender = excluded.gender,
    phone = excluded.phone,
    province = excluded.province,
    city = excluded.city,
    district = excluded.district,
    village = excluded.village,
    address = excluded.address,
    bpjs_number = excluded.bpjs_number,
    blood_type = coalesce(excluded.blood_type, public.patients.blood_type),
    allergies = coalesce(excluded.allergies, public.patients.allergies),
    payer_type = excluded.payer_type,
    insurance_name = excluded.insurance_name,
    insurance_policy_number = excluded.insurance_policy_number,
    updated_at = now();

  return jsonb_build_object(
    'success', true,
    'patient_id', v_uid,
    'nik', v_clean_nik,
    'message', 'Pendaftaran data pasien berhasil disimpan secara lengkap'
  );
end;
$$;

-- Izin eksekusi RPC
revoke all on function public.register_patient_personal from anon, public;
grant execute on function public.register_patient_personal to authenticated;
