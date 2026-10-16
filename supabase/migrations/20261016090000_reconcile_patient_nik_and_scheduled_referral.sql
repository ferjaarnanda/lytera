-- Migrasi Rekonsiliasi Identitas Pasien, NIK, dan Rujukan Terjadwal
-- Memindahkan keterkaitan NIK 1111111111111111 dan rujukan dijadwalkan d380e1d5
-- ke akun pasien resmi uji aktif: 22937be6-9583-48b1-996b-cf7247e721b0 (iwaktempel@gmail.com).

do $$
declare
  v_target_id uuid := '22937be6-9583-48b1-996b-cf7247e721b0'; -- iwaktempel@gmail.com
  v_donor_id uuid  := '3cfd180a-f563-4924-bc0b-5101d7b06868'; -- ferjaarnanda0@gmail.com
  v_ref_id uuid    := 'd380e1d5-81dd-435a-9bed-49923216cef7'; -- rujukan terjadwal 18 Okt 13:20 WIB
  v_temp_nik text  := 'TEMP_' || substr(md5(random()::text), 1, 8);
begin
  -- 1. Pertukaran NIK secara transaksional non-destruktif
  -- Pastikan donor membebaskan NIK 1111111111111111 terlebih dahulu
  update public.patients
  set nik = v_temp_nik
  where id = v_donor_id and nik = '1111111111111111';

  -- Pasang NIK 1111111111111111 ke akun target iwaktempel@gmail.com
  update public.patients
  set nik = '1111111111111111'
  where id = v_target_id;

  -- Pasang NIK 5555555555555555 ke akun donor agar tetap memiliki NIK valid unik
  update public.patients
  set nik = '5555555555555555'
  where id = v_donor_id and nik = v_temp_nik;

  -- 2. Pindahkan rujukan terjadwal d380e1d5 ke akun target
  update public.referrals
  set patient_id = v_target_id
  where id = v_ref_id and patient_id = v_donor_id;

  -- 3. Pindahkan log pencarian pasien yang mendasari rujukan ini ke akun target
  update public.patient_lookup_logs
  set patient_id = v_target_id
  where patient_id = v_donor_id
    and id in ('3c0da7ed-d340-4caa-aaf9-7af89a52e3eb', 'c5e2f176-8290-46ab-a08c-39aca4920172');

  raise notice 'Rekonsiliasi identitas pasien dan rujukan terjadwal berhasil dieksekusi.';
end $$;
