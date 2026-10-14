-- Migrasi: Perbaikan RPC review_facility_staff untuk pengesahan spesialisasi dokter yang presisi
-- Mendukung pencocokan ID relasi facility_staff_specializations (fss.id) maupun specialization_id katalog
-- Sinkronisasi otomatis kolom teks facility_staff.specialization dengan spesialisasi yang terverifikasi (is_verified = true)
-- Otorisasi ketat: hanya admin fasilitas aktif atau Dinas Kesehatan

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
  v_fac_status text;
  v_verified_count int := 0;
  v_final_role text;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Sesi otentikasi tidak ditemukan';
  end if;

  -- 1. Ambil data staf yang akan ditinjau
  select * into v_staff
  from public.facility_staff
  where id = p_staff_id;

  if not found then
    raise exception 'Data staf tidak ditemukan';
  end if;

  -- 2. Verifikasi otorisasi: admin faskes terkait atau akun peran dinkes
  select public.is_facility_admin(v_staff.facility_id) into v_is_admin;
  select role into v_caller_role from public.profiles where id = v_caller_id;

  if not (coalesce(v_is_admin, false) or coalesce(v_caller_role, '') = 'dinkes') then
    raise exception 'Akses ditolak: Anda tidak memiliki wewenang untuk meninjau staf pada fasilitas ini';
  end if;

  -- 3. Verifikasi status fasilitas: wajib aktif (kecuali bila diproses oleh Dinkes)
  select status into v_fac_status from public.facilities where id = v_staff.facility_id;
  if v_fac_status <> 'aktif' and coalesce(v_caller_role, '') <> 'dinkes' then
    raise exception 'Fasilitas kesehatan belum berstatus aktif. Peninjauan staf hanya dapat dilakukan pada fasilitas aktif.';
  end if;

  if p_decision not in ('aktif', 'ditolak') then
    raise exception 'Keputusan tidak valid (harus aktif atau ditolak)';
  end if;

  -- 4. Alur penolakan staf
  if p_decision = 'ditolak' then
    if p_rejection_reason is null or trim(p_rejection_reason) = '' then
      raise exception 'Alasan penolakan wajib diisi';
    end if;

    update public.facility_staff
    set 
      status = 'ditolak',
      rejection_reason = trim(p_rejection_reason),
      specialization = null
    where id = p_staff_id;

    -- Batalkan semua verifikasi spesialisasi
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
    -- 5. Alur persetujuan staf ('aktif')
    if p_staff_role is not null and p_staff_role not in ('dokter', 'petugas', 'apoteker') then
      raise exception 'Peran staf tidak valid (harus dokter, petugas, atau apoteker)';
    end if;

    v_final_role := coalesce(p_staff_role, v_staff.staff_role);

    update public.facility_staff
    set 
      status = 'aktif',
      staff_role = v_final_role,
      rejection_reason = null
    where id = p_staff_id;

    -- 6. Pengesahan spesialisasi
    if v_final_role = 'dokter' then
      if p_verified_spec_ids is not null then
        -- Sahkan spesialisasi yang dipilih:
        -- Mendukung pencocokan ID relasi FSS (fss.id) maupun specialization_id katalog resmi
        update public.facility_staff_specializations
        set 
          is_verified = true,
          verified_by = v_caller_id,
          verified_at = now()
        where facility_staff_id = p_staff_id 
          and (
            id = any(p_verified_spec_ids) 
            or (specialization_id is not null and specialization_id = any(p_verified_spec_ids))
          );

        -- Nonaktifkan verifikasi untuk spesialisasi yang tidak dipilih
        update public.facility_staff_specializations
        set 
          is_verified = false,
          verified_by = null,
          verified_at = null
        where facility_staff_id = p_staff_id 
          and not (
            id = any(p_verified_spec_ids) 
            or (specialization_id is not null and specialization_id = any(p_verified_spec_ids))
          );
      end if;
    else
      -- Jika peran final staf bukan dokter (petugas/apoteker), batalkan semua spesialisasi klinis
      update public.facility_staff_specializations
      set 
        is_verified = false,
        verified_by = null,
        verified_at = null
      where facility_staff_id = p_staff_id;
    end if;

    -- 7. Sinkronkan kolom teks specialization pada facility_staff secara atomik
    update public.facility_staff
    set specialization = (
      select nullif(string_agg(coalesce(ss.name, fss.custom_specialization), ', '), '')
      from public.facility_staff_specializations fss
      left join public.staff_specializations ss on ss.id = fss.specialization_id
      where fss.facility_staff_id = p_staff_id and fss.is_verified = true
    )
    where id = p_staff_id;

    -- Hitung jumlah spesialisasi yang disahkan
    select count(*) into v_verified_count
    from public.facility_staff_specializations
    where facility_staff_id = p_staff_id and is_verified = true;

    return jsonb_build_object(
      'success', true,
      'message', 'Permohonan staf berhasil disetujui (status: aktif)',
      'status', 'aktif',
      'verified_specializations_count', v_verified_count
    );
  end if;
end;
$$;

REVOKE ALL ON FUNCTION public.review_facility_staff(uuid, text, text, uuid[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_facility_staff(uuid, text, text, uuid[], text) TO authenticated;
