-- Migrasi: Perbaikan Identitas Staf dan Keamanan Otorisasi Fasilitas Kesehatan
-- 1. Tambahkan policy RLS profiles_select_facility_admin agar admin faskes dapat membaca nama & email profil stafnya
-- 2. Buat tabel audit log facility_staff_audit_logs untuk mencatat setiap persetujuan, penolakan, dan pengesahan spesialisasi
-- 3. Buat RPC list_facility_staff untuk mengambil daftar staf lengkap beserta nama profil
-- 4. Perketat RPC review_facility_staff: validasi kecocokan profesi vs role, kunci role akun aktif, dan catat audit log

-- 1. Policy RLS profiles_select_facility_admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'profiles_select_facility_admin'
  ) THEN
    CREATE POLICY "profiles_select_facility_admin"
    ON public.profiles
    FOR SELECT
    USING (
      id IN (
        SELECT fs.profile_id
        FROM public.facility_staff fs
        JOIN public.facilities f ON f.id = fs.facility_id
        WHERE f.admin_id = auth.uid()
      )
    );
  END IF;
END $$;

-- 2. Tabel Audit Log Kepegawaian Faskes
CREATE TABLE IF NOT EXISTS public.facility_staff_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_staff_id uuid NOT NULL REFERENCES public.facility_staff(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  changed_by uuid NOT NULL REFERENCES public.profiles(id),
  action text NOT NULL, -- 'persetujuan', 'penolakan', 'pengesahan_spesialisasi'
  previous_status text,
  new_status text,
  previous_role text,
  new_role text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.facility_staff_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'facility_staff_audit_logs' AND policyname = 'audit_logs_select_facility_admin'
  ) THEN
    CREATE POLICY "audit_logs_select_facility_admin"
    ON public.facility_staff_audit_logs
    FOR SELECT
    USING (
      public.is_facility_admin(facility_id)
      OR public.current_role_name() = 'dinkes'
    );
  END IF;
END $$;

GRANT SELECT ON public.facility_staff_audit_logs TO authenticated;

-- 3. RPC list_facility_staff (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.list_facility_staff(p_facility_id uuid)
RETURNS TABLE (
  id uuid,
  profile_id uuid,
  facility_id uuid,
  staff_role text,
  profession text,
  str_number text,
  sip_number text,
  specialization text,
  rejection_reason text,
  status text,
  created_at timestamptz,
  full_name text,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_is_admin boolean;
  v_caller_role text;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Sesi otentikasi tidak ditemukan';
  END IF;

  SELECT public.is_facility_admin(p_facility_id) INTO v_is_admin;
  SELECT pr.role INTO v_caller_role FROM public.profiles pr WHERE pr.id = v_caller_id;

  IF NOT (COALESCE(v_is_admin, false) OR COALESCE(v_caller_role, '') = 'dinkes') THEN
    RAISE EXCEPTION 'Akses ditolak: Anda tidak memiliki wewenang untuk melihat staf pada fasilitas ini';
  END IF;

  RETURN QUERY
  SELECT 
    fs.id,
    fs.profile_id,
    fs.facility_id,
    fs.staff_role,
    fs.profession,
    fs.str_number,
    fs.sip_number,
    fs.specialization,
    fs.rejection_reason,
    fs.status,
    fs.created_at,
    pr.full_name,
    pr.email
  FROM public.facility_staff fs
  JOIN public.profiles pr ON pr.id = fs.profile_id
  WHERE fs.facility_id = p_facility_id
  ORDER BY fs.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_facility_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_facility_staff(uuid) TO authenticated;

-- 4. Penguatan RPC review_facility_staff
CREATE OR REPLACE FUNCTION public.review_facility_staff(
  p_staff_id uuid,
  p_decision text,
  p_staff_role text DEFAULT NULL,
  p_verified_spec_ids uuid[] DEFAULT NULL,
  p_rejection_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_staff record;
  v_caller_id uuid;
  v_is_admin boolean;
  v_caller_role text;
  v_fac_status text;
  v_verified_count int := 0;
  v_final_role text;
  v_action text;
  v_is_doctor_prof boolean;
  v_is_pharmacist_prof boolean;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Sesi otentikasi tidak ditemukan';
  END IF;

  -- 1. Ambil data staf yang akan ditinjau
  SELECT * INTO v_staff
  FROM public.facility_staff
  WHERE id = p_staff_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Data staf tidak ditemukan';
  END IF;

  -- 2. Verifikasi otorisasi: admin faskes terkait atau akun peran dinkes
  SELECT public.is_facility_admin(v_staff.facility_id) INTO v_is_admin;
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;

  IF NOT (COALESCE(v_is_admin, false) OR COALESCE(v_caller_role, '') = 'dinkes') THEN
    RAISE EXCEPTION 'Akses ditolak: Anda tidak memiliki wewenang untuk meninjau staf pada fasilitas ini';
  END IF;

  -- 3. Verifikasi status fasilitas: wajib aktif (kecuali bila diproses oleh Dinkes)
  SELECT status INTO v_fac_status FROM public.facilities WHERE id = v_staff.facility_id;
  IF v_fac_status <> 'aktif' AND COALESCE(v_caller_role, '') <> 'dinkes' THEN
    RAISE EXCEPTION 'Fasilitas kesehatan belum berstatus aktif. Peninjauan staf hanya dapat dilakukan pada fasilitas aktif.';
  END IF;

  IF p_decision NOT IN ('aktif', 'ditolak') THEN
    RAISE EXCEPTION 'Keputusan tidak valid (harus aktif atau ditolak)';
  END IF;

  -- 4. Alur penolakan staf
  IF p_decision = 'ditolak' THEN
    IF p_rejection_reason IS NULL OR trim(p_rejection_reason) = '' THEN
      RAISE EXCEPTION 'Alasan penolakan wajib diisi';
    END IF;

    UPDATE public.facility_staff
    SET 
      status = 'ditolak',
      rejection_reason = trim(p_rejection_reason),
      specialization = NULL
    WHERE id = p_staff_id;

    -- Batalkan semua verifikasi spesialisasi
    UPDATE public.facility_staff_specializations
    SET 
      is_verified = false,
      verified_by = NULL,
      verified_at = NULL
    WHERE facility_staff_id = p_staff_id;

    -- Catat audit log penolakan
    INSERT INTO public.facility_staff_audit_logs (
      facility_staff_id,
      facility_id,
      changed_by,
      action,
      previous_status,
      new_status,
      previous_role,
      new_role,
      details
    ) VALUES (
      p_staff_id,
      v_staff.facility_id,
      v_caller_id,
      'penolakan',
      v_staff.status,
      'ditolak',
      v_staff.staff_role,
      v_staff.staff_role,
      jsonb_build_object('alasan_penolakan', trim(p_rejection_reason))
    );

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Permohonan staf telah ditolak',
      'status', 'ditolak'
    );
  ELSE
    -- 5. Alur persetujuan staf / kelola spesialisasi ('aktif')
    IF p_staff_role IS NOT NULL AND p_staff_role NOT IN ('dokter', 'petugas', 'apoteker') THEN
      RAISE EXCEPTION 'Peran staf tidak valid (harus dokter, petugas, atau apoteker)';
    END IF;

    v_final_role := COALESCE(p_staff_role, v_staff.staff_role);

    -- Deteksi kualifikasi profesi
    v_is_doctor_prof := (
      v_staff.profession IS NOT NULL 
      AND (
        lower(v_staff.profession) LIKE '%dokter%' 
        OR lower(v_staff.profession) LIKE '%dr.%' 
        OR lower(v_staff.profession) LIKE '%sp.%'
      )
    ) OR (v_staff.profession IS NULL AND v_staff.staff_role = 'dokter'); -- data warisan

    v_is_pharmacist_prof := (
      v_staff.profession IS NOT NULL 
      AND lower(v_staff.profession) LIKE '%apotek%'
    );

    -- PENGAMAN KEAMANAN OTORISASI:
    -- A. Jika staf SUDAH AKTIF, admin faskes tidak boleh mengubah role secara sepihak
    IF v_staff.status = 'aktif' AND p_staff_role IS NOT NULL AND p_staff_role <> v_staff.staff_role THEN
      IF COALESCE(v_caller_role, '') <> 'dinkes' THEN
        RAISE EXCEPTION 'Akses ditolak: Peran staf aktif telah diverifikasi dan terkunci sesuai kualifikasi profesi terdaftar. Perubahan wewenang profesi memerlukan pengajuan ulang atau persetujuan Dinas Kesehatan.';
      END IF;
    END IF;

    -- B. Validasi kesesuaian peran dengan profesi yang didaftarkan
    IF v_final_role = 'dokter' THEN
      IF NOT v_is_doctor_prof THEN
        RAISE EXCEPTION 'Akses ditolak: Peran Dokter hanya dapat diberikan kepada tenaga kesehatan dengan kualifikasi profesi dokter yang sah (profesi terdaftar: %).', COALESCE(v_staff.profession, 'Tidak tercatat');
      END IF;
      -- Dokter wajib memiliki nomor STR
      IF v_staff.str_number IS NULL OR trim(v_staff.str_number) = '' THEN
        RAISE EXCEPTION 'Nomor STR dokter wajib terdaftar dan valid sebelum persetujuan wewenang klinis.';
      END IF;
    ELSIF v_final_role = 'apoteker' THEN
      IF NOT v_is_pharmacist_prof AND COALESCE(v_caller_role, '') <> 'dinkes' THEN
        RAISE EXCEPTION 'Akses ditolak: Peran Apoteker hanya dapat diberikan kepada tenaga kesehatan dengan kualifikasi profesi apoteker/farmasi yang sah (profesi terdaftar: %).', COALESCE(v_staff.profession, 'Tidak tercatat');
      END IF;
    END IF;

    -- Update status dan peran pada facility_staff
    UPDATE public.facility_staff
    SET 
      status = 'aktif',
      staff_role = v_final_role,
      rejection_reason = NULL
    WHERE id = p_staff_id;

    -- Jika diproses oleh Dinkes, izinkan sinkronisasi profil
    IF COALESCE(v_caller_role, '') = 'dinkes' THEN
      UPDATE public.profiles
      SET 
        status = 'aktif',
        sub_role = v_final_role
      WHERE id = v_staff.profile_id AND status = 'menunggu';
    END IF;

    -- 6. Pengesahan spesialisasi klinis (khusus dokter)
    IF v_final_role = 'dokter' THEN
      IF p_verified_spec_ids IS NOT NULL THEN
        -- Sahkan spesialisasi yang dipilih
        UPDATE public.facility_staff_specializations
        SET 
          is_verified = true,
          verified_by = v_caller_id,
          verified_at = now()
        WHERE facility_staff_id = p_staff_id 
          AND (
            id = ANY(p_verified_spec_ids) 
            OR (specialization_id IS NOT NULL AND specialization_id = ANY(p_verified_spec_ids))
          );

        -- Batalkan verifikasi spesialisasi yang tidak dipilih
        UPDATE public.facility_staff_specializations
        SET 
          is_verified = false,
          verified_by = NULL,
          verified_at = NULL
        WHERE facility_staff_id = p_staff_id 
          AND NOT (
            id = ANY(p_verified_spec_ids) 
            OR (specialization_id IS NOT NULL AND specialization_id = ANY(p_verified_spec_ids))
          );
      END IF;
    ELSE
      -- Jika peran staf bukan dokter, batalkan seluruh klaim spesialisasi klinis
      UPDATE public.facility_staff_specializations
      SET 
        is_verified = false,
        verified_by = NULL,
        verified_at = NULL
      WHERE facility_staff_id = p_staff_id;
    END IF;

    -- 7. Sinkronkan kolom teks specialization pada facility_staff secara atomik
    UPDATE public.facility_staff
    SET specialization = (
      SELECT nullif(string_agg(COALESCE(ss.name, fss.custom_specialization), ', '), '')
      FROM public.facility_staff_specializations fss
      LEFT JOIN public.staff_specializations ss ON ss.id = fss.specialization_id
      WHERE fss.facility_staff_id = p_staff_id AND fss.is_verified = true
    )
    WHERE id = p_staff_id;

    -- Hitung jumlah spesialisasi yang disahkan
    SELECT count(*) INTO v_verified_count
    FROM public.facility_staff_specializations
    WHERE facility_staff_id = p_staff_id AND is_verified = true;

    -- Tentukan nama aksi untuk audit log
    IF v_staff.status = 'aktif' THEN
      v_action := 'pengesahan_spesialisasi';
    ELSE
      v_action := 'persetujuan';
    END IF;

    -- Catat audit log persetujuan / pengesahan spesialisasi
    INSERT INTO public.facility_staff_audit_logs (
      facility_staff_id,
      facility_id,
      changed_by,
      action,
      previous_status,
      new_status,
      previous_role,
      new_role,
      details
    ) VALUES (
      p_staff_id,
      v_staff.facility_id,
      v_caller_id,
      v_action,
      v_staff.status,
      'aktif',
      v_staff.staff_role,
      v_final_role,
      jsonb_build_object(
        'verified_specializations_count', v_verified_count,
        'specialization_text', (SELECT specialization FROM public.facility_staff WHERE id = p_staff_id)
      )
    );

    RETURN jsonb_build_object(
      'success', true,
      'message', CASE 
        WHEN v_staff.status = 'aktif' THEN 'Spesialisasi klinis staf berhasil diperbarui'
        ELSE 'Permohonan staf berhasil disetujui (status: aktif)'
      END,
      'status', 'aktif',
      'verified_specializations_count', v_verified_count
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.review_facility_staff(uuid, text, text, uuid[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_facility_staff(uuid, text, text, uuid[], text) TO authenticated;
