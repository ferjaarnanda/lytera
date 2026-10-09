-- Migrasi: Penyelarasan RPC list_active_doctors dengan spesialisasi terverifikasi
-- Memastikan list_active_doctors membaca spesialisasi resmi dari facility_staff_specializations (is_verified = true)
-- Konsisten dengan get_active_facility_doctors dan arsitektur verifikasi staf Sub-tahap B

create or replace function public.list_active_doctors(p_facility_id uuid)
returns table(staff_id uuid, full_name text, specialization text)
language sql
stable security definer
set search_path = public, extensions, pg_temp
as $$
  select 
    fs.id as staff_id,
    pr.full_name,
    (
      select string_agg(coalesce(ss.name, fss.custom_specialization), ', ')
      from public.facility_staff_specializations fss
      left join public.staff_specializations ss on ss.id = fss.specialization_id
      where fss.facility_staff_id = fs.id and fss.is_verified = true
    ) as specialization
  from public.facility_staff fs
  join public.profiles pr on pr.id = fs.profile_id
  join public.facilities f on f.id = fs.facility_id
  where fs.facility_id = p_facility_id 
    and fs.staff_role = 'dokter' 
    and fs.status = 'aktif' 
    and f.status = 'aktif'
  order by pr.full_name;
$$;

revoke all on function public.list_active_doctors(uuid) from public;
grant execute on function public.list_active_doctors(uuid) to authenticated, anon;
