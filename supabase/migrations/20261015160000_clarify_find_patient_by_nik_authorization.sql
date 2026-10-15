-- Migrasi: Perjelas Otorisasi dan Pesan Galat find_patient_by_nik
-- Membedakan penyebab kegagalan otorisasi secara spesifik (belum terdaftar, bukan dokter, staf menunggu/ditolak, fasilitas menunggu/nonaktif)
-- Menjaga perlindungan privasi: NIK tidak dibocorkan di log error, audit log patient_lookup_logs tetap dicatat, rate limit 30 pencarian per 10 menit tetap aktif.

CREATE OR REPLACE FUNCTION public.find_patient_by_nik(p_nik text)
RETURNS TABLE(
  patient_id uuid,
  family_member_id uuid,
  full_name text,
  nik_masked text,
  dob date,
  gender text,
  relation text,
  city text,
  district text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
  v_nik text := regexp_replace(coalesce(p_nik, ''), '\D', '', 'g');
  v_facility uuid;
  v_staff_role text;
  v_staff_status text;
  v_fac_status text;
  v_recent int;
  v_found boolean := false;
  r record;
BEGIN
  -- 1. Verifikasi sesi login aktif
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Anda harus masuk terlebih dahulu';
  END IF;

  -- 2. Audit hubungan akun kepegawaian dan fasilitas asal secara bertahap
  SELECT 
    fs.facility_id,
    fs.staff_role,
    fs.status,
    f.status AS fac_status
  INTO 
    v_facility,
    v_staff_role,
    v_staff_status,
    v_fac_status
  FROM public.facility_staff fs
  LEFT JOIN public.facilities f ON f.id = fs.facility_id
  WHERE fs.profile_id = auth.uid()
  ORDER BY (fs.staff_role = 'dokter' AND fs.status = 'aktif' AND f.status = 'aktif') DESC, fs.created_at DESC
  LIMIT 1;

  -- 2a. Belum terdaftar pada fasilitas mana pun
  IF v_facility IS NULL THEN
    RAISE EXCEPTION 'Akun Anda belum terdaftar sebagai staf di fasilitas kesehatan mana pun';
  END IF;

  -- 2b. Bukan dokter
  IF v_staff_role <> 'dokter' THEN
    RAISE EXCEPTION 'Pencarian pasien untuk rujukan hanya dapat dilakukan oleh tenaga medis dokter (peran akun Anda: %)', coalesce(v_staff_role, 'tidak terdaftar');
  END IF;

  -- 2c. Status staf belum aktif
  IF v_staff_status <> 'aktif' THEN
    IF v_staff_status = 'menunggu' THEN
      RAISE EXCEPTION 'Akun kepegawaian dokter Anda masih menunggu verifikasi dan persetujuan dari Administrator Fasilitas';
    ELSIF v_staff_status = 'ditolak' THEN
      RAISE EXCEPTION 'Permohonan kepegawaian dokter Anda ditolak oleh fasilitas kesehatan';
    ELSE
      RAISE EXCEPTION 'Status kepegawaian dokter Anda belum aktif (status: %)', coalesce(v_staff_status, 'tidak diketahui');
    END IF;
  END IF;

  -- 2d. Status fasilitas belum aktif
  IF v_fac_status <> 'aktif' THEN
    IF v_fac_status = 'menunggu' THEN
      RAISE EXCEPTION 'Fasilitas kesehatan tempat Anda bertugas masih menunggu verifikasi operasional dari Dinas Kesehatan';
    ELSE
      RAISE EXCEPTION 'Fasilitas kesehatan tempat Anda bertugas tidak berstatus aktif (status: %)', coalesce(v_fac_status, 'tidak diketahui');
    END IF;
  END IF;

  -- 3. Validasi format NIK 16 digit
  IF length(v_nik) <> 16 THEN
    RAISE EXCEPTION 'NIK harus 16 digit angka';
  END IF;

  -- 4. Perlindungan Rate Limit: maksimal 30 pencarian per 10 menit
  SELECT count(*) INTO v_recent 
  FROM public.patient_lookup_logs l
  WHERE l.looked_up_by = auth.uid() 
    AND l.created_at > now() - interval '10 minutes';

  IF v_recent >= 30 THEN
    RAISE EXCEPTION 'Terlalu banyak pencarian. Coba lagi beberapa menit lagi';
  END IF;

  -- 5. Cari data pasien dan anggota keluarga (hanya pasien aktif)
  FOR r IN
    SELECT 
      p.id AS pid, 
      null::uuid AS fid, 
      pr.full_name AS nm, 
      p.dob AS bd, 
      p.gender AS gd, 
      null::text AS rel, 
      p.city AS ct, 
      p.district AS dt
    FROM public.patients p
    JOIN public.profiles pr ON pr.id = p.id
    WHERE p.nik = v_nik AND pr.status = 'aktif'
    UNION ALL
    SELECT 
      fm.guardian_id AS pid, 
      fm.id AS fid, 
      fm.full_name AS nm, 
      fm.dob AS bd, 
      null::text AS gd, 
      fm.relation AS rel, 
      p2.city AS ct, 
      p2.district AS dt
    FROM public.family_members fm
    JOIN public.patients p2 ON p2.id = fm.guardian_id
    JOIN public.profiles pr2 ON pr2.id = p2.id
    WHERE fm.nik = v_nik AND pr2.status = 'aktif'
  LOOP
    v_found := true;
    
    -- Catat log audit pencarian berhasil
    INSERT INTO public.patient_lookup_logs (
      looked_up_by, 
      facility_id, 
      patient_id, 
      family_member_id, 
      found,
      purpose
    ) VALUES (
      auth.uid(), 
      v_facility, 
      r.pid, 
      r.fid, 
      true,
      'Pencarian untuk membuat rujukan'
    );

    patient_id := r.pid;
    family_member_id := r.fid;
    full_name := r.nm;
    nik_masked := left(v_nik, 4) || '••••••••' || right(v_nik, 4);
    dob := r.bd;
    gender := r.gd;
    relation := r.rel;
    city := r.ct;
    district := r.dt;
    RETURN NEXT;
  END LOOP;

  -- Catat log audit pencarian nihil
  IF NOT v_found THEN
    INSERT INTO public.patient_lookup_logs (
      looked_up_by, 
      facility_id, 
      patient_id, 
      found,
      purpose
    ) VALUES (
      auth.uid(), 
      v_facility, 
      null, 
      false,
      'Pencarian untuk membuat rujukan'
    );
  END IF;

  RETURN;
END;
$$;
