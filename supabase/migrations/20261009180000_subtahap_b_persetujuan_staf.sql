-- Migrasi: Sub-tahap B - Persetujuan Staf Faskes, Pengesahan Spesialisasi & Alasan Penolakan
-- Versi: 20261009180000_subtahap_b_persetujuan_staf.sql
-- Proyek: Lytera (losqwizqvuikoueswxnc)

-- 1. Tambah kolom rejection_reason ke tabel facility_staff jika belum ada
ALTER TABLE public.facility_staff
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 2. Buat RPC transaksional review_facility_staff
-- Memungkinkan admin fasilitas kesehatan atau Dinkes untuk:
-- - Menyetujui staf ('aktif')
-- - Menetapkan role final ('dokter' | 'petugas' | 'apoteker')
-- - Mengesahkan spesialisasi per item (is_verified = true)
-- - Menolak staf ('ditolak') dengan catatan alasan penolakan wajib
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
declare
  v_staff record;
  v_caller_id uuid;
  v_is_admin boolean;
  v_caller_role text;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Sesi otentikasi tidak ditemukan';
  end if;

  -- Ambil data staf yang akan ditinjau
  select * into v_staff
  from public.facility_staff
  where id = p_staff_id;

  if not found then
    raise exception 'Data staf tidak ditemukan';
  end if;

  -- Verifikasi otorisasi: admin faskes terkait atau akun peran dinkes
  select public.is_facility_admin(v_staff.facility_id) into v_is_admin;
  select role into v_caller_role from public.profiles where id = v_caller_id;

  if not (coalesce(v_is_admin, false) or coalesce(v_caller_role, '') = 'dinkes') then
    raise exception 'Akses ditolak: Anda tidak memiliki wewenang untuk meninjau staf pada fasilitas ini';
  end if;

  if p_decision not in ('aktif', 'ditolak') then
    raise exception 'Keputusan tidak valid (harus aktif atau ditolak)';
  end if;

  if p_decision = 'ditolak' then
    if p_rejection_reason is null or trim(p_rejection_reason) = '' then
      raise exception 'Alasan penolakan wajib diisi';
    end if;

    update public.facility_staff
    set 
      status = 'ditolak',
      rejection_reason = trim(p_rejection_reason)
    where id = p_staff_id;

    -- Batalkan verifikasi spesialisasi
    update public.facility_staff_specializations
    set 
      is_verified = false,
      verified_by = null,
      verified_at = null
    where facility_staff_id = p_staff_id;

    return jsonb_build_object(
      'success', true,
      'message', 'Permohonan staf telah ditolak',
      'status', 'ditolak'
    );
  else
    -- Keputusan: 'aktif'
    if p_staff_role is not null and p_staff_role not in ('dokter', 'petugas', 'apoteker') then
      raise exception 'Peran staf tidak valid (harus dokter, petugas, atau apoteker)';
    end if;

    update public.facility_staff
    set 
      status = 'aktif',
      staff_role = coalesce(p_staff_role, staff_role),
      rejection_reason = null
    where id = p_staff_id;

    -- Update verifikasi spesialisasi per item
    if p_verified_spec_ids is not null then
      -- Sahkan spesialisasi yang dipilih
      update public.facility_staff_specializations
      set 
        is_verified = true,
        verified_by = v_caller_id,
        verified_at = now()
      where facility_staff_id = p_staff_id 
        and id = any(p_verified_spec_ids);

      -- Tandai belum terverifikasi untuk spesialisasi yang tidak dipilih
      update public.facility_staff_specializations
      set 
        is_verified = false,
        verified_by = null,
        verified_at = null
      where facility_staff_id = p_staff_id 
        and not (id = any(p_verified_spec_ids));
    end if;

    return jsonb_build_object(
      'success', true,
      'message', 'Permohonan staf berhasil disetujui (status: aktif)',
      'status', 'aktif'
    );
  end if;
end;
$$;

REVOKE ALL ON FUNCTION public.review_facility_staff(uuid, text, text, uuid[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_facility_staff(uuid, text, text, uuid[], text) TO authenticated;
