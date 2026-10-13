-- Migrasi: Perbaikan Pendaftaran Tenaga Kesehatan (RPC get_active_facility & penanganan kode undangan null pada register_facility_staff)
-- Versi: 20261013203000_fix_nakes_registration_and_active_facility.sql
-- Proyek: Lytera (losqwizqvuikoueswxnc)

-- 1. RPC get_active_facility: memverifikasi faskes aktif secara aman tanpa membuka tabel facilities ke publik
CREATE OR REPLACE FUNCTION public.get_active_facility(p_facility_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  type text,
  city text,
  district text,
  status text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  select f.id, f.name, f.type, f.city, f.district, f.status
  from public.facilities f
  where f.id = p_facility_id and f.status = 'aktif';
$$;

REVOKE ALL ON FUNCTION public.get_active_facility(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_facility(uuid) TO anon, authenticated;

-- 2. Perbarui RPC register_facility_staff:
-- Mengatasi bug Postgres 55000 (record "v_inv" is not assigned yet) ketika nakes mendaftar via pencarian langsung tanpa kode undangan (p_invitation_code is null).
CREATE OR REPLACE FUNCTION public.register_facility_staff(
  p_profile_id uuid,
  p_facility_id uuid,
  p_staff_role text,
  p_profession text,
  p_str_number text,
  p_sip_number text,
  p_specialization text,
  p_specialization_names text[],
  p_invitation_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
declare
  v_caller_id uuid;
  v_prof record;
  v_inv public.facility_invitations%rowtype;
  v_fac record;
  v_target_facility_id uuid;
  v_staff_id uuid;
  v_spec_name text;
  v_spec_id uuid;
  v_existing_fss_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null or v_caller_id <> p_profile_id then
    raise exception 'Akses tidak sah: sesi otentikasi tidak cocok dengan profil pendaftar';
  end if;

  -- 1. Pastikan profil terdaftar dan memiliki peran fasilitas
  select * into v_prof 
  from public.profiles 
  where id = p_profile_id;

  if not found then
    raise exception 'Profil pendaftar tidak ditemukan';
  end if;

  if v_prof.role <> 'fasilitas' then
    raise exception 'Profil pendaftar bukan akun tenaga fasilitas kesehatan';
  end if;

  -- 2. Validasi peran dan profesi
  if p_staff_role not in ('dokter', 'petugas', 'apoteker') then
    raise exception 'Peran staf tidak valid (harus dokter, petugas, atau apoteker)';
  end if;

  if p_profession is null or trim(p_profession) = '' then
    raise exception 'Profesi tenaga kesehatan wajib diisi';
  end if;

  if p_str_number is null or trim(p_str_number) = '' then
    raise exception 'Nomor STR tenaga kesehatan wajib diisi';
  end if;

  -- 3. Penentuan fasilitas: via kode undangan atau faskes langsung
  if p_invitation_code is not null and trim(p_invitation_code) <> '' then
    -- Kunci baris undangan dengan FOR UPDATE agar kuota aman terhadap akses bersamaan
    select * into v_inv 
    from public.facility_invitations 
    where upper(trim(code)) = upper(trim(p_invitation_code)) 
    for update;

    if not found then
      raise exception 'Kode undangan tidak ditemukan';
    end if;

    if not v_inv.is_active then
      raise exception 'Kode undangan sudah dinonaktifkan';
    end if;

    if v_inv.expires_at is not null and v_inv.expires_at < now() then
      raise exception 'Kode undangan telah kedaluwarsa';
    end if;

    if v_inv.uses_count >= v_inv.max_uses then
      raise exception 'Batas kuota penggunaan kode undangan telah habis';
    end if;

    -- Validasi kesesuaian target peran
    if v_inv.target_role is not null and lower(v_inv.target_role) <> lower(p_staff_role) then
      raise exception 'Kode undangan ini khusus untuk peran %, bukan %', v_inv.target_role, p_staff_role;
    end if;

    -- Validasi kesesuaian target profesi
    if v_inv.target_profession is not null and lower(trim(v_inv.target_profession)) <> lower(trim(p_profession)) then
      raise exception 'Kode undangan ini khusus untuk profesi %, bukan %', v_inv.target_profession, p_profession;
    end if;

    -- Fasilitas penempatan dipaksa dari fasilitas penerbit undangan
    select * into v_fac 
    from public.facilities 
    where id = v_inv.facility_id and status = 'aktif';

    if not found then
      raise exception 'Fasilitas penerbit kode undangan tidak aktif atau tidak ditemukan';
    end if;

    v_target_facility_id := v_fac.id;
  else
    -- Metode pencarian langsung: wajib menyuplai facility_id yang aktif
    if p_facility_id is null then
      raise exception 'Fasilitas penempatan wajib dipilih';
    end if;

    select * into v_fac 
    from public.facilities 
    where id = p_facility_id and status = 'aktif';

    if not found then
      raise exception 'Fasilitas yang dipilih tidak aktif atau tidak ditemukan';
    end if;

    v_target_facility_id := v_fac.id;
  end if;

  -- 4. Simpan ke facility_staff dengan status 'menunggu'
  insert into public.facility_staff (
    profile_id,
    facility_id,
    staff_role,
    profession,
    str_number,
    sip_number,
    specialization,
    status
  ) values (
    p_profile_id,
    v_target_facility_id,
    p_staff_role,
    p_profession,
    trim(p_str_number),
    nullif(trim(p_sip_number), ''),
    nullif(trim(p_specialization), ''),
    'menunggu'
  )
  returning id into v_staff_id;

  -- 5. Simpan relasi spesialisasi ke facility_staff_specializations (is_verified = false)
  if p_specialization_names is not null and array_length(p_specialization_names, 1) > 0 then
    foreach v_spec_name in array p_specialization_names loop
      if v_spec_name is not null and trim(v_spec_name) <> '' then
        -- Cocokkan dengan katalog resmi
        select id into v_spec_id 
        from public.staff_specializations 
        where lower(trim(name)) = lower(trim(v_spec_name)) 
        limit 1;

        -- Hindari relasi duplikat
        select id into v_existing_fss_id 
        from public.facility_staff_specializations 
        where facility_staff_id = v_staff_id 
          and (
            (v_spec_id is not null and specialization_id = v_spec_id)
            or (v_spec_id is null and lower(trim(coalesce(custom_specialization, ''))) = lower(trim(v_spec_name)))
          )
        limit 1;

        if v_existing_fss_id is null then
          insert into public.facility_staff_specializations (
            facility_staff_id,
            specialization_id,
            custom_specialization,
            is_verified
          ) values (
            v_staff_id,
            v_spec_id,
            case when v_spec_id is null then trim(v_spec_name) else null end,
            false
          );
        end if;
      end if;
    end loop;
  end if;

  -- 6. Jika pendaftaran via kode undangan, konsumsi kuota tepat 1 kali
  if p_invitation_code is not null and trim(p_invitation_code) <> '' and v_inv.id is not null then
    update public.facility_invitations 
    set uses_count = uses_count + 1 
    where id = v_inv.id;
  end if;

  return jsonb_build_object(
    'success', true,
    'staff_id', v_staff_id,
    'facility_id', v_target_facility_id,
    'facility_name', v_fac.name
  );
end;
$$;

REVOKE ALL ON FUNCTION public.register_facility_staff(uuid, uuid, text, text, text, text, text, text[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_facility_staff(uuid, uuid, text, text, text, text, text, text[], text) TO authenticated;
