-- ============================================================================
-- Migrasi: Pengetatan Keamanan Penugasan DPJP pada Rujukan (Anti Lintas Fasilitas)
-- Tanggal: 2026-10-14 23:00:00
-- Deskripsi:
-- Memastikan saat rumah sakit memperbarui rujukan (menjadwalkan DPJP), dokter
-- yang ditugaskan (destination_doctor_id) wajib terdaftar sebagai dokter aktif
-- pada fasilitas tujuan yang sah, mencegah penugasan dokter lintas faskes.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.guard_referrals()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
declare
  v_dest record;
  v_origin_status text;
begin
  if auth.uid() is null then
    return NEW;
  end if;

  if TG_OP = 'INSERT' then
    NEW.status := 'diajukan';
    NEW.updated_at := now();

    select f.type, f.status into v_dest from public.facilities f where f.id = NEW.destination_facility_id;
    if v_dest.type is distinct from 'rumah_sakit' or v_dest.status is distinct from 'aktif' then
      raise exception 'Fasilitas tujuan harus rumah sakit yang aktif';
    end if;

    select f.status into v_origin_status from public.facilities f where f.id = NEW.origin_facility_id;
    if v_origin_status is distinct from 'aktif' then
      raise exception 'Fasilitas asal belum aktif';
    end if;

    if NEW.origin_facility_id = NEW.destination_facility_id then
      raise exception 'Fasilitas asal dan tujuan tidak boleh sama';
    end if;

    if NEW.family_member_id is not null and not exists (
      select 1 from public.family_members fm where fm.id = NEW.family_member_id and fm.guardian_id = NEW.patient_id
    ) then
      raise exception 'Anggota keluarga tidak sesuai dengan akun pasien';
    end if;

    if NEW.destination_doctor_id is not null and not exists (
      select 1 from public.facility_staff fs
      where fs.id = NEW.destination_doctor_id and fs.facility_id = NEW.destination_facility_id
        and fs.staff_role = 'dokter' and fs.status = 'aktif'
    ) then
      raise exception 'Dokter tujuan tidak valid untuk fasilitas tujuan';
    end if;

    return NEW;
  end if;

  -- UPDATE
  if NEW.patient_id is distinct from OLD.patient_id
     or NEW.family_member_id is distinct from OLD.family_member_id
     or NEW.origin_facility_id is distinct from OLD.origin_facility_id
     or NEW.destination_facility_id is distinct from OLD.destination_facility_id
     or NEW.created_by is distinct from OLD.created_by
     or NEW.diagnosis_icd10 is distinct from OLD.diagnosis_icd10
     or NEW.catatan_klinis is distinct from OLD.catatan_klinis
     or NEW.poli is distinct from OLD.poli
     or NEW.priority is distinct from OLD.priority then
    raise exception 'Isi rujukan tidak dapat diubah setelah dikirim';
  end if;

  if NEW.status is distinct from OLD.status
     or NEW.jadwal_pemeriksaan is distinct from OLD.jadwal_pemeriksaan
     or NEW.destination_doctor_id is distinct from OLD.destination_doctor_id then
    if NEW.destination_facility_id not in (select public.user_facility_ids()) then
      raise exception 'Hanya fasilitas tujuan yang dapat memproses rujukan';
    end if;
  end if;

  -- Validasi dokter penugasan DPJP pada pembaruan rujukan
  if NEW.destination_doctor_id is distinct from OLD.destination_doctor_id
     and NEW.destination_doctor_id is not null then
    if not exists (
      select 1 from public.facility_staff fs
      where fs.id = NEW.destination_doctor_id
        and fs.facility_id = NEW.destination_facility_id
        and fs.staff_role = 'dokter'
        and fs.status = 'aktif'
    ) then
      raise exception 'Dokter penugasan DPJP tidak valid untuk fasilitas tujuan';
    end if;
  end if;

  if NEW.status is distinct from OLD.status then
    if not (
      (OLD.status = 'diajukan' and NEW.status in ('diterima', 'ditolak'))
      or (OLD.status = 'diterima' and NEW.status in ('dijadwalkan', 'ditolak'))
      or (OLD.status = 'dijadwalkan' and NEW.status = 'selesai')
    ) then
      raise exception 'Perubahan status dari % ke % tidak diizinkan', OLD.status, NEW.status;
    end if;
  end if;

  if NEW.status = 'dijadwalkan' and NEW.jadwal_pemeriksaan is null then
    raise exception 'Jadwal pemeriksaan wajib diisi saat menjadwalkan';
  end if;

  NEW.updated_at := now();
  return NEW;
end;
$function$;
