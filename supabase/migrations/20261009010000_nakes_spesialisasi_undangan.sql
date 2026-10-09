-- Migrasi: Fondasi Tenaga Kesehatan, Kode Undangan, dan Katalog Spesialisasi
-- Proyek: Lytera (losqwizqvuikoueswxnc)

-- 1. Tambah kolom profesi terstruktur ke facility_staff
ALTER TABLE public.facility_staff 
ADD COLUMN IF NOT EXISTS profession text;

-- 2. Buat tabel katalog spesialisasi resmi
CREATE TABLE IF NOT EXISTS public.staff_specializations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'spesialis', -- 'spesialis', 'subspesialis', 'gigi', 'klinis'
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed spesialisasi standar Indonesia
INSERT INTO public.staff_specializations (name, category) VALUES
  ('Penyakit Dalam', 'spesialis'),
  ('Anak', 'spesialis'),
  ('Bedah', 'spesialis'),
  ('Obstetri dan Ginekologi (Kebidanan & Kandungan)', 'spesialis'),
  ('Jantung dan Pembuluh Darah', 'spesialis'),
  ('Saraf (Neurologi)', 'spesialis'),
  ('Mata', 'spesialis'),
  ('THT-KL', 'spesialis'),
  ('Kulit dan Kelamin (Dermatologi)', 'spesialis'),
  ('Kedokteran Jiwa (Psikiatri)', 'spesialis'),
  ('Paru (Pulmonologi)', 'spesialis'),
  ('Ortopedi dan Traumatologi', 'spesialis'),
  ('Anestesiologi dan Terapi Intensif', 'spesialis'),
  ('Radiologi', 'spesialis'),
  ('Patologi Klinik', 'spesialis'),
  ('Rehabilitasi Medik', 'spesialis'),
  ('Gigi Anak (Pedodonsia)', 'gigi'),
  ('Konservasi Gigi (Endodonsia)', 'gigi'),
  ('Periodonsia', 'gigi'),
  ('Bedah Mulut dan Maksilofasial', 'gigi')
ON CONFLICT (name) DO NOTHING;

-- 3. Buat tabel relasi many-to-many facility_staff_specializations
CREATE TABLE IF NOT EXISTS public.facility_staff_specializations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_staff_id uuid NOT NULL REFERENCES public.facility_staff(id) ON DELETE CASCADE,
  specialization_id uuid REFERENCES public.staff_specializations(id) ON DELETE RESTRICT,
  custom_specialization text,
  is_verified boolean NOT NULL DEFAULT false,
  verified_by uuid REFERENCES public.profiles(id),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fss_staff_id ON public.facility_staff_specializations(facility_staff_id);
CREATE INDEX IF NOT EXISTS idx_fss_spec_id ON public.facility_staff_specializations(specialization_id);

-- 4. Buat tabel kode undangan fasilitas (facility_invitations)
CREATE TABLE IF NOT EXISTS public.facility_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  target_role text NOT NULL DEFAULT 'dokter', -- 'dokter', 'petugas', 'apoteker'
  target_profession text, -- misal: 'Dokter Spesialis'
  max_uses integer NOT NULL DEFAULT 1,
  uses_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_code ON public.facility_invitations(code);
CREATE INDEX IF NOT EXISTS idx_invitations_facility_id ON public.facility_invitations(facility_id);

-- 5. Enable RLS pada semua tabel baru
ALTER TABLE public.staff_specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_staff_specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_invitations ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
-- staff_specializations: siapapun (authenticated & anon) boleh membaca katalog
CREATE POLICY "specializations_select_all" ON public.staff_specializations
  FOR SELECT USING (true);

-- facility_staff_specializations:
-- Staf pemilik boleh melihat relasinya
CREATE POLICY "fss_select_owner" ON public.facility_staff_specializations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.facility_staff fs 
      WHERE fs.id = facility_staff_id AND fs.profile_id = auth.uid()
    )
  );

-- Admin faskes boleh melihat relasi staf di faskesnya
CREATE POLICY "fss_select_admin" ON public.facility_staff_specializations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.facility_staff fs 
      WHERE fs.id = facility_staff_id AND public.is_facility_admin(fs.facility_id)
    )
  );

-- Staf pemilik boleh insert saat pendaftaran
CREATE POLICY "fss_insert_owner" ON public.facility_staff_specializations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.facility_staff fs 
      WHERE fs.id = facility_staff_id AND fs.profile_id = auth.uid()
    )
  );

-- Admin faskes boleh update verifikasi spesialisasi
CREATE POLICY "fss_update_admin" ON public.facility_staff_specializations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.facility_staff fs 
      WHERE fs.id = facility_staff_id AND public.is_facility_admin(fs.facility_id)
    )
  );

-- facility_invitations:
-- Admin faskes boleh kelola undangan miliknya
CREATE POLICY "invitations_all_admin" ON public.facility_invitations
  FOR ALL USING (public.is_facility_admin(facility_id));

-- Publik / calon pendaftar boleh membaca kode aktif untuk validasi via RPC security definer

-- 7. RPC: validate_invitation_code (SECURITY DEFINER)
-- Dipanggil saat pendaftaran atau pengecekan kode undangan
CREATE OR REPLACE FUNCTION public.validate_invitation_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
declare
  v_inv record;
  v_fac record;
begin
  if p_code is null or trim(p_code) = '' then
    return jsonb_build_object('valid', false, 'message', 'Kode undangan tidak boleh kosong');
  end if;

  select * into v_inv
  from public.facility_invitations
  where upper(trim(code)) = upper(trim(p_code))
  limit 1;

  if not found then
    return jsonb_build_object('valid', false, 'message', 'Kode undangan tidak ditemukan');
  end if;

  if not v_inv.is_active then
    return jsonb_build_object('valid', false, 'message', 'Kode undangan sudah dinonaktifkan');
  end if;

  if v_inv.expires_at is not null and v_inv.expires_at < now() then
    return jsonb_build_object('valid', false, 'message', 'Kode undangan telah kedaluwarsa');
  end if;

  if v_inv.uses_count >= v_inv.max_uses then
    return jsonb_build_object('valid', false, 'message', 'Batas kuota penggunaan kode undangan telah habis');
  end if;

  select id, name, type, city, district into v_fac
  from public.facilities
  where id = v_inv.facility_id and status = 'aktif';

  if not found then
    return jsonb_build_object('valid', false, 'message', 'Fasilitas penerbit kode undangan tidak aktif atau tidak ditemukan');
  end if;

  return jsonb_build_object(
    'valid', true,
    'facility_id', v_fac.id,
    'facility_name', v_fac.name,
    'facility_type', v_fac.type,
    'facility_city', v_fac.city,
    'facility_district', v_fac.district,
    'target_role', v_inv.target_role,
    'target_profession', v_inv.target_profession
  );
end;
$$;

GRANT EXECUTE ON FUNCTION public.validate_invitation_code(text) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.list_active_doctors(uuid);

CREATE OR REPLACE FUNCTION public.list_active_doctors(p_facility_id uuid)
RETURNS TABLE(
  staff_id uuid,
  full_name text,
  specialization text,
  facility_id uuid,
  facility_name text,
  facility_type text,
  city text,
  district text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  select 
    fs.id as staff_id,
    pr.full_name,
    coalesce(
      (
        select string_agg(coalesce(ss.name, fss.custom_specialization), ', ')
        from public.facility_staff_specializations fss
        left join public.staff_specializations ss on ss.id = fss.specialization_id
        where fss.facility_staff_id = fs.id
      ),
      fs.specialization
    ) as specialization,
    f.id as facility_id,
    f.name as facility_name,
    f.type as facility_type,
    f.city,
    f.district
  from public.facility_staff fs
  join public.profiles pr on pr.id = fs.profile_id
  join public.facilities f on f.id = fs.facility_id
  where fs.facility_id = p_facility_id 
    and fs.staff_role = 'dokter' 
    and fs.status = 'aktif' 
    and f.status = 'aktif'
  order by pr.full_name;
$$;

GRANT EXECUTE ON FUNCTION public.list_active_doctors(uuid) TO anon, authenticated;
