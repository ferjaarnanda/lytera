# Lytera, catatan untuk agent

Platform rujukan digital dan rekam medis berbasis izin pasien (proyek lomba). Next.js 16, TypeScript, Tailwind v4, Supabase. Antarmuka bahasa Indonesia sehari-hari. Semua data adalah data uji.

## Aturan kerja (hemat kuota)
- SATU tahap per sesi, lalu BERHENTI. Selesai: lint dan build SEKALI, git commit, perbarui PROGRESS.md, tulis "Berikutnya", stop. Jangan lanjut ke tahap lain.
- Batasi sesi: maksimal sekitar 4 file berubah. Tahap terlalu besar? Kerjakan sub-bagian pertama yang utuh, commit, catat sisanya, stop.
- Edit kecil, bukan menulis ulang file utuh. Jangan uji browser berulang: satu uji akhir untuk jalur utama. Uji database lewat SQL impersonasi.
- Jangan berhenti dengan file setengah jadi: selesaikan atau kembalikan (git checkout).
- Kuota hampir habis: berhenti di checkpoint bersih, tulis "Berikutnya" di PROGRESS.md.
- Laporan akhir singkat: apa yang berubah, hasil uji nyata, apa yang belum. Jangan klaim selesai tanpa bukti uji.
- Butuh login akun uji? Tanya user. Jangan menebak atau membuat akun berulang.

## Supabase (HANYA proyek lytera)
- project_ref: losqwizqvuikoueswxnc. URL: https://losqwizqvuikoueswxnc.supabase.co
- DILARANG menyentuh proyek lain, terutama vxpzfgkuwlcibmvqdheu (NEXORA). Jika list_tables menampilkan resources, exchanges, atau iot_*, BERHENTI: itu proyek yang salah.
- Perubahan skema hanya lewat migrasi (apply_migration, nama jelas) dan simpan salinan SQL di supabase/migrations/. Jangan DROP tabel atau kolom berisi data tanpa persetujuan user. Jelaskan singkat sebelum migrasi.
- Setelah migrasi: jalankan get_advisors (security), perbaiki temuan baru yang relevan, dan uji RLS dengan impersonasi (tanpa password):
```sql
  do $$
  declare hasil text;
  begin
    perform set_config('request.jwt.claims', '{"sub":"<UUID_PENGGUNA>","role":"authenticated"}', true);
    set local role authenticated;
    -- jalankan query atau RPC yang diuji, isi variabel hasil
    raise exception 'HASIL: %', hasil;  -- raise membatalkan semua perubahan
  end $$;
```
  (Jangan memakai nama "found" sebagai kolom tanpa alias tabel di blok plpgsql.)
- Jangan menaruh token, service_role key, atau kata sandi di kode atau repo. Hanya NEXT_PUBLIC_SUPABASE_URL dan publishable key.

## Pola akses data (PENTING)
RLS sengaja melarang dokter, pasien, dan staf membaca baris milik pihak lain. Query langsung .from('patients'), .from('facilities'), atau .from('profiles') untuk data pihak lain hasilnya kosong (bukan bug). Pakai RPC yang sudah ada:
- find_patient_by_nik(p_nik) untuk dokter aktif. Hasil: patient_id, family_member_id, full_name, nik_masked, dob, gender, relation, city, district. NIK 16 digit, tercatat di log, maksimal 30 pencarian per 10 menit.
- list_active_facilities(p_type, p_query, p_limit) hasil id, name, type, city, district. Sudah urut relevansi. Boleh dipanggil sebelum login.
- list_active_doctors(p_facility_id) hasil staff_id, full_name, specialization.
- list_my_referrals() untuk pasien. list_facility_referrals(p_direction 'keluar' atau 'masuk') untuk staf. list_referral_events(p_referral_id) untuk timeline. list_my_lookup_logs() untuk pasien.
Menulis rujukan boleh langsung: insert ke referrals dan referral_events (dibatasi RLS dan penjaga di bawah).

## Skema ringkas (semua RLS aktif)
- profiles(id, role pasien|fasilitas|verifikator|dinkes, sub_role, full_name, email, status menunggu|aktif|ditolak)
- patients(id=profiles.id, patient_type, nik UNIK, dob, gender L|P, phone, province, city, district, village, address, bpjs_number, blood_type, allergies)
- family_members(id, guardian_id, full_name, nik, dob, relation, bpjs_number, allergies)
- facilities(id, admin_id, type puskesmas|klinik|rumah_sakit|apotek, name, license_number, address, province, city, district, phone, email, status, license_document_path). Bucket privat facility-documents, path "{user.id}/...".
- facility_staff(id, profile_id, facility_id, staff_role dokter|petugas|apoteker, str_number, sip_number, specialization, status)
- referrals(id, patient_id, family_member_id, origin_facility_id, destination_facility_id, destination_doctor_id=facility_staff.id, poli, priority elektif|urgent|gawat_darurat, status diajukan|diterima|dijadwalkan|selesai|ditolak, diagnosis_icd10, catatan_klinis, jadwal_pemeriksaan, created_by)
- referral_events(id, referral_id, status, catatan, created_by, created_at)
- patient_lookup_logs(id, looked_up_by, facility_id, patient_id, family_member_id, found, purpose, created_at)
- verifier_profiles, registration_reviews (pendaftaran dan persetujuan)

## Penjaga di database (jangan dilawan di kode)
Status awal akun dan fasilitas dipaksa; hanya Dinkes yang mengubah status fasilitas, peran, dan status akun; status staf diubah admin faskes terkait atau Dinkes. Rujukan: dibuat hanya oleh dokter aktif di faskes aktif, tujuan harus rumah sakit aktif, status awal selalu "diajukan", isi tidak bisa diubah, hanya faskes tujuan yang memproses, alur diajukan→diterima|ditolak, diterima→dijadwalkan|ditolak, dijadwalkan→selesai, jadwal wajib saat dijadwalkan. Tampilkan pesan galat database apa adanya dengan bahasa jelas.

## Data uji
- Dokter: dr. Andi Wicaksono, profile 093c6b36-dc62-444a-a3db-7773175e2a6e, di puskemas kedung rejo (6e4d3ce8-9fd4-4ee0-928a-5deecb21685d, puskesmas, aktif)
- RS tujuan: rumah sakit colombia 05ec1dd5-70fb-47f4-8b9e-11324c77c4de (aktif, belum punya dokter)
- Pasien: iwak peyek 3cfd180a-f563-4924-bc0b-5101d7b06868 (NIK 1111111111111111). Pasien lain NIK 2222…, 3333…, 4444….
- Dinkes: dinkes.semarang@jatengprov.go.id

## Desain dan privasi
- Pakai komponen yang ada (Card, Badge, StatusIcon, Stepper, Timeline, PortalWallpaper, Navbar forceGlass). Tanpa warna ungu. Kartu dan tabel solid di atas wallpaper. Teks bahasa Indonesia sehari-hari, tanpa klaim palsu.
- NIK selalu dimasker di tampilan. Data medis hanya terbuka lewat token izin pasien. Jangan mencetak data pribadi ke console.