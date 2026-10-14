-- ============================================================================
-- Migrasi: Penonaktifan Fungsi Tambah Rekam Medis Warisan (Legacy 5-Arg Tanpa Token)
-- Tanggal: 2026-10-14 23:15:00
-- Deskripsi:
-- Menonaktifkan overload fungsi add_medical_record(uuid, uuid, uuid, text, text)
-- yang tidak mewajibkan token izin pasien dan mencabut seluruh hak EXECUTE dari
-- PUBLIC, anon, dan authenticated. Seluruh penulisan rekam medis kini strictly
-- wajib menggunakan versi 6-parameter dengan validasi token otorisasi pasien.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.add_medical_record(
  p_patient_id uuid,
  p_family_member_id uuid,
  p_referral_id uuid,
  p_diagnosis_icd10 text,
  p_ringkasan text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'Akses ditolak: penulisan rekam medis wajib menggunakan token otorisasi 6-digit pasien melalui add_medical_record versi 6-parameter.';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_medical_record(uuid, uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
