# Progres Pengembangan Lytera

## Status Tahapan Sesuai RENCANA.md

| Tahap | Status | Commit | Catatan |
|---|---|---|---|
| Tahap 0: Persiapan | SELESAI | f6b836c | Verifikasi proyek Supabase lytera via MCP. Uji database impersonasi (a)-(e) lolos 100%. Security advisors diperiksa. |
| Tahap 1: Perbaiki Buat Rujukan | SELESAI | f6b836c | find_patient_by_nik(NIK 1111…): mengembalikan iwak peyek, NIK dimasker, log tercatat di patient_lookup_logs (id dafa5d21, found=true, dokter dr. Andi, faskes puskemas kedung rejo). list_active_facilities('rumah_sakit','col'): mengembalikan rumah sakit colombia. Semua terbukti via MCP impersonasi tanpa rollback. |
| Tahap 2: Halaman Staf | SELESAI | c0b0f56 | Riwayat Rujukan faskes primer (keluar), Rujukan Masuk RS, filter status, tab prioritas, panel detail dengan linimasa timeline (list_referral_events), dan aksi proses rujukan (terima, tolak, jadwalkan, selesai) teruji nyata dua sisi via SQL impersonasi. Fallback admin_id ditambahkan ke rujukan/page.tsx agar admin RS Colombia dapat langsung memproses rujukan di UI. |
| Tahap 3: Halaman Pasien | SELESAI | 44ef984 | Rujukan Saya (list_my_referrals), kartu Rujukan Aktif di dashboard (menampilkan rujukan aktif terbaru dengan timeline lengkap), tab navigasi Beranda / Rujukan Saya / Izin Akses, dan linimasa aktivitas rujukan (list_referral_events) teruji nyata via SQL impersonasi pasien Iwak Peyek (3cfd180a). Akun pasien siap uji UI. |
| Tahap 4a: Skema, Token & Rekam Medis (Database) | SELESAI | 9fe6ad0 | Tabel patient_access_tokens (hash crypt, expiry 60m, limit 5 salah, revoke), medical_records, medical_record_access_logs. RLS aktif & direct access revoked. RPC SECURITY DEFINER lengkap. Seluruh 9 skenario uji impersonasi SQL lolos 100%. Security advisors bersih. |
| Tahap 4b: Antarmuka Pasien & Dokter (UI) | BELUM | - | Berikutnya: UI Pasien di tab Izin Akses (buat token 6 digit, hitung mundur sisa waktu, tombol cabut token, riwayat audit log akses) dan UI Dokter di alur Rujukan Masuk RS untuk verifikasi token serta melihat/menambah kunjungan medis. |
| Tahap 5: Penyesuaian Teks Verifikasi Administrasi | BELUM | - | Penyesuaian copy opsional non-BPJS |

---

## Riwayat Integrasi & Pengerjaan Sebelumnya

### 1. Fondasi Supabase (Selesai)
- [x] Instalasi `@supabase/supabase-js` dan `@supabase/ssr`.
- [x] Pembuatan `lib/supabase/client.ts` (browser client menggunakan publishable key).
- [x] Pembuatan `lib/supabase/server.ts` (server client dengan async cookies sesuai konvensi Next.js 16).
- [x] Konfigurasi `.env.example` (template tanpa rahasia) dan `.env.local` aktif serta terabaikan oleh git (`.gitignore`).

### 2. Autentikasi Masuk (Selesai)
- [x] Halaman `app/masuk/[peran]/[subperan]/page.tsx` disambungkan ke `supabase.auth.signInWithPassword`.
- [x] Halaman `app/masuk/dinkes/page.tsx` disambungkan ke `supabase.auth.signInWithPassword`.
- [x] Pesan galat masuk diterjemahkan ke bahasa Indonesia ramah pengguna.

### 3. Proteksi Rute & Sesi (Selesai)
- [x] `proxy.ts` (konvensi Next.js 16 pengganti `middleware.ts`) aktif melindungi seluruh rute `/portal/*`.
- [x] Komponen `components/LogoutButton.tsx` dibuat dan terpasang di portal seluruh peran untuk mengakhiri sesi via `supabase.auth.signOut()`.

### 4. Pendaftaran Akun (Selesai)
- [x] Dibuat Server Action `app/actions/pendaftaran.ts` dengan validasi Zod lengkap di sisi server.
- [x] Pendaftaran terhubung langsung ke Supabase Auth (`supabase.auth.signUp()`) dengan status awal `"menunggu"`.
- [x] Kolom email dan kata sandi ditambahkan ke formulir pendaftaran pasien (pribadi & keluarga).
- [x] Penanganan status loading dan penayangan galat server di formulir pendaftaran.

### 5. Penulisan ke Tabel Domain Database (Selesai)
- [x] Baris profil disimpan ke tabel `profiles` (`status: 'aktif'` untuk pasien/pribadi, selain itu `'menunggu'`).
- [x] Data domain disimpan berurutan ke tabel yang sesuai peran:
  - Pasien pribadi: tabel `patients`.
  - Pasien keluarga: tabel `patients` (wali) & tabel `family_members` (anggota keluarga).
  - Faskes Admin: tabel `facilities`.
  - Faskes Nakes (dokter/petugas/apoteker): tabel `facility_staff`.
  - Verifikator: tabel `verifier_profiles`.
- [x] Penanganan galat terstruktur pada setiap tahapan insert (jika insert profiles gagal, proses dihentikan dan melaporkan galat).

### 6. Perbaikan UI Auth & DatePicker Bertahap (Selesai)
- [x] Pembuatan komponen `components/DatePicker.tsx` custom bertahap 3 langkah (Tahun dengan input ketik cepat, Bulan, dan Hari).
- [x] Integrasi `DatePicker` ke formulir Pasien Pribadi dan formulir Pasien Keluarga (Anggota Keluarga `size="sm"`).
- [x] Tata ulang posisi header halaman auth (Logo di kiri, BackButton bergaya tombol pill di kanan) pada 4 halaman: `/daftar/[peran]/[subperan]`, `/daftar/selesai`, `/masuk/[peran]/[subperan]`, `/masuk/dinkes`.
- [x] Verifikasi kode: Linter 0 error/0 warning dan Build Next.js lolos 100%.

### 7. Dashboard Pasien Asli Terintegrasi Supabase (Selesai)
- [x] Pembuatan komponen `components/PasienDashboard.tsx` yang membaca sesi pengguna (`supabase.auth.getUser()`).
- [x] Pengambilan data riil dari tabel `profiles` (`full_name`, `email`, `status`) dan tabel `patients` (`nik`, `dob`, `gender`, `phone`, `address`, `bpjs_number`, dll.) berdasarkan `id = user.id`.
- [x] Penanganan status akun: jika `status !== 'aktif'`, menampilkan antarmuka ramah *"Akun kamu sedang ditinjau"* alih-alih dashboard.
- [x] Tampilan kartu sapaan `"Halo, [nama]"`, status badge terverifikasi, dan ringkasan identitas pasien dengan NIK dimasker sebagian (`3374 •••• •••• 0001`).
- [x] Tampilan daftar anggota keluarga dari tabel `family_members` (`guardian_id = user.id`) untuk sub-peran keluarga.
- [x] Kartu "Rujukan aktif" dengan status jujur (*"Belum ada rujukan aktif"*, tanpa data contoh/palsu).
- [x] Kartu "Token akses medis" dengan status jujur (*"Belum ada token aktif"*).
- [x] Integrasi tombol Keluar (`LogoutButton`) yang memanggil `signOut()` dan kembali ke landing page.
- [x] Integrasi ke rute portal (`app/portal/[peran]/[subperan]/page.tsx`) saat `peran === 'pasien'`.
- [x] Verifikasi kode: Linter 0 error/0 warning dan Build Next.js lolos 100%.

### 8. Fitur Buat Rujukan Puskesmas & Klinik (Selesai)
- [x] **Server Action Rujukan** (`app/actions/rujukan.ts`):
  - Validasi schema Zod `BuatRujukanSchema` di sisi server.
  - Verifikasi pengguna aktif dan status staf kepegawaian (`facility_staff` role `dokter` atau `petugas`, status `aktif`, dan terhubung ke `facility_id`).
  - Menulis 1 baris ke tabel `referrals` (origin faskes login, destination faskes tujuan, created_by auth user, status `diajukan`).
  - Menulis 1 baris ke tabel `referral_events` (`status: 'diajukan'`, `catatan: 'Rujukan dibuat'`).
- [x] **Formulir Buat Rujukan Baru** (`app/portal/[peran]/[subperan]/rujukan/baru/page.tsx`):
  - Perlindungan otorisasi staf dokter/petugas faskes.
  - Langkah (a): Pencarian pasien via 16 digit NIK di tabel `patients`, verifikasi nama & wilayah atau pesan "Pasien belum terdaftar di Lytera".
  - Langkah (b): Pilihan faskes tujuan dari tabel `facilities` (type `rumah_sakit` dan status `aktif`).
  - Langkah (c): Pilihan opsional dokter spesialis tujuan dari `facility_staff` faskes terpilih (role `dokter`, status `aktif`).
  - Langkah (d): Input poli spesialis, tingkat prioritas (`elektif`, `urgent`, `gawat_darurat`), diagnosis ICD-10, dan catatan klinis.
  - Penanganan galat jujur dan redirect otomatis ke halaman daftar rujukan setelah berhasil.
- [x] **Daftar Rujukan Keluar Faskes** (`app/portal/[peran]/[subperan]/rujukan/page.tsx`):
  - Menampilkan riwayat rujukan yang diterbitkan oleh faskes asal login (`origin_facility_id = facility milik user`).
  - Kolom nama pasien (join `patients` + `profiles`), RS tujuan (join `facilities`), poli, badge prioritas (`bahaya` untuk gawat darurat, `proses` untuk urgent, `netral` untuk elektif), `StatusIcon`, dan tanggal rujukan.
- [x] **Integrasi Portal Faskes**:
  - Tombol aksi cepat "Buat Rujukan" dan "Lihat Daftar Rujukan" tersemat pada dashboard puskesmas dan klinik (`app/portal/[peran]/[subperan]/page.tsx`).
- [x] **Kualitas Kode**:
  - `npm run lint` lolos dengan 0 error dan 0 warning.
  - `npm run build` lolos 100% tanpa error kompilasi dan type checking TypeScript.

### 9. Perbaikan & Fitur Signed URL & Storage Upload (Bagian A & B Selesai)
- [x] **Bagian A (Selesai)**: Perbaikan galat *'A "use server" file can only export async functions'*. Menghapus ekspor objek `VerifikasiFasilitasSchema` di `app/actions/dinkes.ts` dan `BuatRujukanSchema` di `app/actions/rujukan.ts`.
- [x] **Bagian B (Selesai)**: Perbaikan race condition upload berkas izin faskes. Menambahkan sinkronisasi sesi eksplisit (`setSession`), verifikasi status `getSession()` sebelum upload, dan penanganan galat storage spesifik yang jujur di `app/actions/pendaftaran.ts`.

### 10. Pencarian Wilayah Bertingkat & Penyimpanan Nama (MASALAH 0 - Selesai)
- [x] Pembuatan komponen `components/RegionCombobox.tsx`:
  - Input teks interaktif yang bisa diketik ulang kapan saja (tidak terkunci abu-abu).
  - Filter substring case-insensitive (misal mengetik "Tengah" menampilkan "Jawa Tengah" dan "Semarang Tengah").
  - Daftar opsi otomatis diurutkan secara alfabetis A-Z.
  - Auto-select text saat klik/fokus untuk memudahkan pencarian ulang.
  - Navigasi keyboard penuh (`ArrowDown`, `ArrowUp`, `Enter`, `Escape`, `Tab`).
- [x] Pembaruan `lib/demo-regions.ts` dengan helper bertingkat berbasis nama:
  - `getProvinceOptions()`, `getRegencyOptions(province)`, `getDistrictOptions(city)`, `getSubdistrictOptions(district)`.
  - Helper kompatibilitas mundur `getRegionNameFromCode(type, codeOrName)` untuk menerjemahkan data kode lama ke nama asli.
- [x] Penggantian field wilayah di formulir **Pasien Pribadi**:
  - Mengganti elemen `<select disabled>` lama dengan 4 `RegionCombobox` bertingkat (Provinsi, Kota, Kecamatan, Kelurahan).
  - Menyimpan teks nama wilayah langsung ke tabel `patients`.
- [x] Penambahan field wilayah di formulir **Pasien Keluarga**:
  - 4 `RegionCombobox` domisili wali keluarga di langkah Data KK & Domisili.
  - Tersimpan ke baris wali di tabel `patients`.
- [x] Penambahan 4 field wilayah di formulir **Fasilitas (Puskesmas, Klinik, Rumah Sakit, Apotek)**:
  - Menambahkan 4 `RegionCombobox` di langkah Profil Fasilitas.
  - Validasi step di sisi klien dan server action, tersimpan langsung ke tabel `facilities` kolom `province`, `city`, `district`.
- [x] Penggantian field wilayah di formulir **Verifikator** (semua level penugasan):
  - Mengganti `<select>` lama dengan `RegionCombobox` bertingkat sesuai tingkatan wewenang instansi.
- [x] Pembaruan halaman verifikasi Dinkes (`app/portal/dinkes/verifikasi-faskes/page.tsx`):
  - Membungkus tampilan wilayah tabel dan modal detail dengan `getRegionNameFromCode` agar data lama maupun baru tampil dalam teks nama resmi.

### 11. Perbaikan DatePicker (MASALAH 1 - Selesai)
- [x] Komponen `components/DatePicker.tsx` diperbaiki:
  - Menghilangkan double scrollbar dengan menyetel wrapper popover menjadi `overflow-hidden` dan hanya grid tahun yang memiliki `overflow-y-auto`.
  - Mengganti pemanggilan `scrollIntoView` (yang mengguncang posisi halaman) dengan kalkulasi `container.scrollTop` relatif terhadap container grid internal.
  - Posisi popover stabil tanpa perulangan re-render/jitter.

### 12. Scrollbar Kustom Global (MASALAH 2 - Selesai)
- [x] Penambahan aturan CSS scrollbar kustom di `app/globals.css`:
  - `scrollbar-width: thin` dan `scrollbar-color` untuk Firefox.
  - `::-webkit-scrollbar` tipis (lebar/tinggi 6px), track Cream `#FAF5F2` pudar transparan, dan thumb Slate `#464858` dengan opacity 40% (hover 75%) dengan sudut bulat penuh (rounded pill). Berlaku global ke seluruh elemen scrollable di aplikasi.

### 13. Efek Hover Visual Kartu Fitur (MASALAH 3 - Selesai)
- [x] Pembaruan 6 kartu di landing page `app/page.tsx` bagian *"Fitur utama platform Lytera"*:
  - Kelas `cursor-default` eksplisit (kursor tetap tanda panah biasa, tidak berubah menjadi pointer/tangan).
  - Efek naik halus `hover:-translate-y-1` (naik 4px) dengan bayangan lembut `hover:shadow-md` dan transisi `duration-200`.

### 14. Tata Letak Dashboard Pasien 1-Kolom Bertumpuk (MASALAH 4 - Selesai)
- [x] Penataan ulang dashboard di `components/PasienDashboard.tsx`:
  - Mengubah layout grid 2-kolom sejajar menjadi 1-kolom bertumpuk penuh (`flex flex-col gap-6`).
  - Kartu **Token Akses Medis** diposisikan di ATAS dengan tinggi lebih ringkas dan proporsional.
  - Kartu **Rujukan Aktif** diposisikan di BAWAH sebagai kartu utama yang lebih tinggi dan menonjol.
  - Teks penjelasan status rujukan aktif dipertahankan persis tanpa perubahan: *"Saat ini kamu tidak memiliki surat rujukan aktif. Surat rujukan digital akan otomatis tampil di sini setelah diterbitkan oleh dokter di faskes tingkat pertama (Puskesmas atau Klinik)."*.

### 15. Kualitas & Validasi Akhir
- [x] `npm run lint` lolos dengan 0 error dan 0 warning.
- [x] `npm run build` lolos 100% kompilasi Next.js (Turbopack) & pemeriksaan tipe TypeScript.

### 16. Tahap 4a: Skema Token Otorisasi, Kunjungan Rekam Medis Minimal, dan Audit Log Akses (Selesai)
- [x] **Skema Database & Migrasi**:
  - `patient_access_tokens`: Menyimpan hash token 6 digit via `extensions.crypt(..., gen_salt('bf', 10))`. Kedaluwarsa 60 menit (`expires_at`), pelacakan batas 5 percobaan gagal (`failed_attempts`, `is_locked`), dan pencabutan mandiri (`revoked_at`).
  - `medical_records`: Kunjungan medis minimal (`patient_id`, `family_member_id`, `facility_id`, `doctor_name`, `doctor_id`, `tanggal`, `diagnosis_icd10`, `ringkasan`, `referral_id`).
  - `medical_record_access_logs`: Audit log append-only mencatat identitas pemanggil, faskes, subjek, hasil akses (`berhasil`, `token_salah`, `token_kedaluwarsa`, `token_dicabut`, `token_terkunci`, `tanpa_token`), catatan alasan, dan timestamp.
- [x] **Keamanan & Isolasi RLS**:
  - RLS diaktifkan di ketiga tabel baru dan akses langsung di-revoke dari `anon`, `authenticated`, dan `public`.
  - Akses sepenuhnya dikendalikan oleh lapisan RPC `SECURITY DEFINER` dengan parameter aman `set search_path = public, extensions, pg_temp` dan hak eksekusi hanya untuk `authenticated`.
- [x] **RPC SECURITY DEFINER**:
  - `create_patient_access_token()`: Pasien membuat token 6 digit baru; token aktif lama otomatis dicabut; kode mentah hanya dikembalikan sekali saat pembuatan.
  - `revoke_patient_access_token()`: Pasien mencabut token aktifnya sewaktu-waktu.
  - `get_my_active_token_status()`: Pasien memantau status token aktif (waktu kedaluwarsa & sisa detik) tanpa mengekspos token mentah.
  - `open_patient_medical_record(p_patient_id, p_token_code, p_family_member_id)`: Khusus dokter aktif di faskes aktif. Setiap percobaan diverifikasi terhadap token terbaru pasien. Menghasilkan audit log persisten ke `medical_record_access_logs` tanpa exception rollback, mengembalikan indikator penolakan ramah bila token salah/terkunci/dicabut/kedaluwarsa/kosong, dan mengembalikan rekam medis bila sah.
  - `list_my_medical_records()`: Pasien melihat daftar riwayat medis miliknya dan anggota keluarganya.
  - `add_medical_record(...)`: Dokter aktif di RS tujuan rujukan pasien (yang berstatus dijadwalkan atau selesai) menambahkan catatan kunjungan medis.
  - `list_my_access_audit_logs()`: Pasien membaca seluruh log audit pembacaan rekam medisnya.
- [x] **Bukti Uji Impersonasi SQL (9/9 Skenario Lolos)**:
  - Test 1 (Dokter tanpa token): Ditolak (`AKSES_DITOLAK`), log `tanpa_token` tercatat.
  - Test 2 (Dokter kode salah): Ditolak (`AKSES_DITOLAK`), `failed_attempts = 1` tercatat di log (`token_salah`).
  - Test 3 (Dokter salah 5x): Terkunci (`AKSES_DITOLAK`), status `token_terkunci` tercatat di log. Kode benar berikutnya tetap ditolak selama token terkunci.
  - Test 4 (Pasien cabut token): Ditolak (`AKSES_DITOLAK`), status `token_dicabut` tercatat di log.
  - Test 5 (Token kedaluwarsa): Ditolak (`AKSES_DITOLAK`), status `token_kedaluwarsa` tercatat di log.
  - Test 6 (Token valid): Otorisasi sukses membuka akses, rekam medis dikembalikan, log `berhasil` tercatat.
  - Test 7 (Dokter faskes tidak terkait): Ditolak menambahkan rekam medis (`Dokter hanya dapat menambah catatan kunjungan pada rujukan pasien ke rumah sakitnya yang berstatus dijadwalkan atau selesai`).
  - Test 8 (Isolasi data pasien lain): Pasien lain memanggil `list_my_medical_records()` menghasilkan 0 baris (privasi terjaga).
  - Test 9 (Audit log pasien): Pasien Iwak Peyek memanggil `list_my_access_audit_logs()` membaca seluruh entri log upaya akses.
- [x] **Advisors Supabase**: `get_advisors(security)` bebas dari temuan kerentanan baru yang tidak diinginkan.

