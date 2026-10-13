# Progres Pengembangan Lytera

## Status Tahapan Sesuai RENCANA.md

| Tahap | Status | Commit | Catatan |
|---|---|---|---|
| Tahap 0: Persiapan | SELESAI | f6b836c | Verifikasi proyek Supabase lytera via MCP. Uji database impersonasi (a)-(e) lolos 100%. Security advisors diperiksa. |
| Tahap 1: Perbaiki Buat Rujukan | SELESAI | f6b836c | find_patient_by_nik(NIK 1111…): mengembalikan iwak peyek, NIK dimasker, log tercatat di patient_lookup_logs (id dafa5d21, found=true, dokter dr. Andi, faskes puskemas kedung rejo). list_active_facilities('rumah_sakit','col'): mengembalikan rumah sakit colombia. Semua terbukti via MCP impersonasi tanpa rollback. |
| Tahap 2: Halaman Staf | SELESAI | c0b0f56 | Riwayat Rujukan faskes primer (keluar), Rujukan Masuk RS, filter status, tab prioritas, panel detail dengan linimasa timeline (list_referral_events), dan aksi proses rujukan (terima, tolak, jadwalkan, selesai) teruji nyata dua sisi via SQL impersonasi. Fallback admin_id ditambahkan ke rujukan/page.tsx agar admin RS Colombia dapat langsung memproses rujukan di UI. |
| Tahap 3: Halaman Pasien | SELESAI | 44ef984 | Rujukan Saya (list_my_referrals), kartu Rujukan Aktif di dashboard (menampilkan rujukan aktif terbaru dengan timeline lengkap), tab navigasi Beranda / Rujukan Saya / Izin Akses, dan linimasa aktivitas rujukan (list_referral_events) teruji nyata via SQL impersonasi pasien Iwak Peyek (3cfd180a). Akun pasien siap uji UI. |
| Tahap 4a: Skema, Token & Rekam Medis (Database) | SELESAI | cac8f9d | Tabel patient_access_tokens (hash crypt, expiry 60m, limit 5 salah, revoke), medical_records, medical_record_access_logs. RLS aktif & direct access revoked. RPC SECURITY DEFINER lengkap. Seluruh 9 skenario uji impersonasi SQL lolos 100%. Security advisors bersih. |
| Tahap 4b: Antarmuka Pasien (Token, Riwayat & Log) | SELESAI | 88c5e37 | Kartu izin akses token 6-digit pasien (tampil sekali, hitung mundur 60m, cabut izin berkonfirmasi, status multi-state), riwayat kunjungan medis terintegrasi, log audit akses rekam medis realtime, transparansi pencarian NIK. Lolos lint & build 100%, uji alur impersonasi SQL lolos. |
| Tahap 4c: Antarmuka Dokter (Buka & Tulis Rekam Medis) | SELESAI | 5754db5 | Komponen RekamMedisDokterPanel di alur rujukan (masuk RS & keluar faskes primer) terintegrasi bukaRekamMedisDokterAction & tambahRekamMedisDokterAction. Token tidak disimpan di URL/storage, read-only riwayat audit PDP, form ICD-10 & ringkasan terhubung rujukan, auto-reset jika token dicabut/expired, non-dokter ditolak. Lolos lint & build 100%, uji 7 skenario SQL lolos. |
| Tahap 5a & 5c: Verifikasi Administrasi (Backend, Verifikator, Dinkes, RS) | SELESAI | 0296414 | Migrasi skema penjamin & verification_requests, storage verification-documents, RPC SECURITY DEFINER, portal verifikator berwilayah, persetujuan petugas verifikator Dinkes, status penjamin & verifikasi di rujukan RS, copy landing page. Uji impersonasi SQL 100% lolos, lint & build lolos. |
| Tahap 5b: Formulir Pendaftaran & Halaman Penjamin Pasien | SELESAI | 9bf1615 | Formulir pendaftaran pasien pribadi & keluarga dengan pilihan kartu penjamin (Mandiri, BPJS, Asuransi, Jaminan Daerah), kartu ringkas penjamin di Beranda, halaman Penjamin & Verifikasi di portal pasien (kelola penjamin, pengajuan domisili & SKTM dengan unggah berkas, badge terverifikasi). Lint 0 error/0 warning, build exit 0, uji impersonasi SQL lolos 100%. |
| Tahap Tetra AI Assistant | SELESAI | c2056e3 | Arsitektur dasar Tera AI terintegrasi Groq LLM server-only dengan intelligent fallback mode, role-aware context builder untuk 9 peran/halaman, controlled data tools ke RPC list_active_facilities & list_active_doctors. |
| Tahap Tetra AI Context-Aware & Rebranding | SELESAI | 6f06a5c | Rebranding Tera -> Tetra, mark logo tepat 4 garis diagonal, strict landing anonymity (tanpa bocor profil demo), intent routing deterministik presisi (hanya cari faskes bila diminta), quick action buttons terkalibrasi, lolos 7 uji skenario via HTTP, lint 0 error, build exit 0. |
| Normalisasi Wilayah Fasilitas | SELESAI | d8dc457 | resolveRegionName() + formatFacilityLocation() reusable di lib/region-utils.ts. FacilityCombobox, Tetra tools.ts, engine.ts semua pakai nama manusiawi. Migrasi DB: 7 fasilitas diperbarui dari kode (33/3374/337401) ke nama (Jawa Tengah/Kota Semarang/Semarang Tengah). Lint 0 error, build exit 0. |
| Sub-tahap A: Finalisasi Keamanan Pendaftaran Nakes & Integritas Tetra | SELESAI | 51e8daa | RPC transaksional register_facility_staff atomik (verifikasi caller auth.uid(), faskes penerbit, FOR UPDATE kuota, insert staff menunggu, insert fss is_verified=false, kuota terpotong tepat 1 kali). Mandiri consume_invitation_code dinonaktifkan & dicabut haknya. validate_invitation_code diperketat. Fallback unverified di get_active_facility_doctors dihapus total demi integritas Tetra. Migrasi 20261009170000 tercatat di DB. Lint 0 error, build exit 0, seluruh uji lolos 100%. |
| Sub-tahap B: Persetujuan Staf Faskes, Pengesahan Spesialisasi & Penolakan Berakar Alasan | SELESAI | 3b2f919 | Kolom rejection_reason pada facility_staff. RPC review_facility_staff (keamanan otorisasi admin faskes & dinkes, penetapan role final, verifikasi spesialisasi per item is_verified=true, alasan penolakan wajib). UI kelola staf faskes diperbarui: modal persetujuan & pengesahan spesialisasi interaktif, modal penolakan alasan wajib, rincian profesi, STR, SIP. Teruji nyata via SQL impersonasi 100% lolos, lint 0 error, build exit 0. |
| Verifikasi Siklus End-to-End Nakes & Tetra | SELESAI | ec93beb | Uji siklus penuh pendaftaran dokter spesialis baru -> status menunggu tidak bocor ke Tetra -> persetujuan admin faskes & pengesahan spesialisasi klinis -> rekomendasi dokter dan poli resmi muncul di Tetra. Lolos uji isolasi unverified 100%, lint 0 error, build exit 0. |
| Rujukan Berjenjang & Validasi Faskes Tujuan | SELESAI | d2a8c8a | Penyelarasan RPC list_active_doctors ke spesialisasi terverifikasi, sinkronisasi poli otomatis sesuai dokter spesialis di form rujukan, penanganan rujukan terbuka saat RS belum ada dokter DPJP, dan pemrosesan rujukan masuk RS. Uji SQL impersonasi lolos 100%, lint 0 error, build exit 0. |
| Tahap Tetra Intelligence & Data Integrity | SELESAI | d6b51bc | Ekstraksi spesialisasi 20 katalog & wilayah pada intent router, pencarian dokter bertingkat (lokasi spesifik -> alternatif wilayah lain), injeksi data dokter terverifikasi ke Groq, eliminasi async cookies hang di getClient via AbortSignal timeout 6s, 8 skenario pengujian lolos 100%, lint 0 error, build exit 0. |
| Pengujian Alur Pasien Keluarga & Demo Interaktif | SELESAI | 4180eb6 | Uji 8 skenario end-to-end database (keluarga, pencarian NIK anak, rujukan anak, list_my_referrals, token izin wali, buka & catat rekam medis anak oleh dokter DPJP, audit PDP). Penyempurnaan demo interaktif visual (?demo=1) pada portal pasien keluarga & penjamin untuk penjurian lomba. Lint 0 error, build exit 0. |
| Finalisasi UI Tetra (A1–A9) | SELESAI | b153698 | Panel max-h terkalibrasi di bawah navbar, launcher ringkas kelompok branding utuh (mark + teks Tetra) dengan border berputar kontinu saat hover/focus, palet hijau-putih konsisten (bebas dominasi hitam), gelombang hijau halus di header, mark 4 garis diagonal diverifikasi, safe Markdown parser (bold, italic, list, break) tanpa teks mentah. Lint 0 error/0 warning, build exit 0. |
| Perbaikan Wallpaper Pasca-Daftar & Masuk | SELESAI | 2475591 | Eliminasi latar krem #FAF5F2 di pembungkus app/daftar/selesai/page.tsx, integrasi dynamic PortalWallpaper sesuai query peran (wallpaper-hospital untuk pasien & fasilitas, wallpaper-verifikasi-dinkes untuk verifikator), verifikasi seluruh portal /portal/* tetap terlindungi wallpaper. Lint 0 error, build exit 0. |
| Migrasi Logo SVG di Seluruh Project | SELESAI | 562104b | Ganti penggunaan Lytera-logo.png menjadi Lytera-logo.svg di components/Logo.tsx untuk seluruh halaman. 0 referensi PNG tersisa di repo. Lint 0 error, build exit 0. |
| Penyelarasan Preview Tetra & Posisi Launcher | SELESAI | ecb0164 | Logo Tetra resmi (TetraMark sm) diterapkan pada header preview chat landing page, simulasi tanya jawab RS rujukan nyata (Rumah Sakit Colombia di Semarang Tengah) selaras fitur Tetra aktif, launcher diturunkan ke bottom-3 agar tidak menutupi Status Integrasi Terkini/elemen lain, chat panel disesuaikan ke bottom-[68px] dengan max-w responsif. Lint 0 error, build exit 0. |




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
  - `open_patient_medical_record(p_patient_id, p_token_code, p_family_member_id)`: Khusus dokter aktif di faskes aktif. Membuka rekam medis pasien dengan token izin aktif. Audit log append-only tercatat persisten.
  - `add_medical_record(p_patient_id, p_family_member_id, p_referral_id, p_diagnosis_icd10, p_ringkasan, p_token_code)`: Dokter aktif menambahkan catatan rekam medis pada rujukan faskesnya hanya jika memegang token izin aktif pasien yang valid.
  - `list_my_medical_records()`: Pasien melihat daftar riwayat medis miliknya dan anggota keluarganya.
  - `list_my_access_audit_logs()`: Pasien membaca seluruh log audit pembacaan dan penulisan rekam medisnya.
- [x] **Bukti Uji Impersonasi SQL (Semua Skenario Lolos 100%)**:
  - Skenario 1 (Peran Dinkes Ditolak Total): Dinkes dilarang query langsung `medical_records` (RLS aman), ditolak panggil `open_patient_medical_record` (hanya dokter aktif), ditolak `add_medical_record` (hanya dokter aktif), dan memanggil `list_my_medical_records` mengembalikan 0 baris. Dinkes sama sekali tidak dapat melihat data medis.
  - Skenario 2 (Isolasi Pasien Lain): Pasien lain memanggil `list_my_medical_records` mengembalikan 0 baris (privasi terlindungi).
  - Skenario 3 (Dokter Tanpa Token): Buka rekam medis tanpa token ditolak (`AKSES_DITOLAK`).
  - Skenario 4 (Token Salah & Terkunci): Token salah percobaan 1 ditolak dan tercatat; salah 5x mengunci token secara otomatis (`is_locked = true`); kode benar berikutnya tetap ditolak selama terkunci.
  - Skenario 5 (Token Dicabut Pasien): Dokter ditolak mengakses dengan token yang telah dicabut (`token_dicabut`).
  - Skenario 6 (Token Kedaluwarsa): Dokter ditolak mengakses dengan token yang telah melewati batas 60 menit (`token_kedaluwarsa`).
  - Skenario 7 (Dokter dengan Token Valid): Dokter sukses membuka rekam medis; dokter dengan token salah ditolak saat menulis rekam medis; dokter dengan token VALID sukses menulis rekam medis baru.
  - Skenario 8 (Pasien & Audit Log): Pasien sukses membaca riwayat medis baru yang ditulis dokter, dan log audit append-only mencatat seluruh 11 riwayat aktivitas dokter.
- [x] **Advisors Supabase**: `get_advisors(security)` bersih tanpa temuan kerentanan baru yang tidak diinginkan.

### 17. Tahap 4b: Antarmuka Pasien untuk Token Izin, Riwayat Medis, dan Log Akses (Selesai)
- [x] **Server Actions (`app/actions/rekam-medis.ts`)**:
  - `createPatientAccessTokenAction`: Pasien membuat token 6-digit baru via RPC; kode mentah hanya ada di memori dan tidak disimpan di DB/log.
  - `getMyActiveTokenStatusAction`: Pasien membaca status token aktif (multi-state: aktif, terkunci, dicabut, kedaluwarsa) tanpa mengekspos kode mentah.
  - `revokePatientAccessTokenAction`: Pasien mencabut token aktifnya sewaktu-waktu.
  - `listMyMedicalRecordsAction`: Pasien mengambil riwayat kunjungan medis miliknya dan anggota keluarga perwalian.
  - `listMyAccessAuditLogsAction`: Pasien mengambil riwayat log audit akses tenaga medis terhadap rekam medisnya.
- [x] **Komponen Antarmuka Pasien (`components/PasienDashboard.tsx`)**:
  - `KartuIzinAkses`:
    - Tombol "Buat Kode Izin" memicu penerbitan token 6 digit.
    - Kode 6 digit ditampilkan SEKALI dengan hitung mundur realtime 60 menit. Jika tab ditutup/dimuat ulang, kode mentah hilang dari memori demi privasi.
    - Status token aktif ditampilkan informatif: `Token Aktif` (dengan sisa menit & detik), `Token Terkunci` (jika 5x salah), `Token Dicabut` (jika dicabut pasien), `Token Kedaluwarsa` (jika waktu habis), dan `Belum Ada Token Aktif`.
    - Tombol "Cabut Izin" dilengkapi modal/konfirmasi aksi untuk mencegah klik tidak sengaja.
  - `KartuRiwayatMedis`:
    - Sub-tab "Kunjungan Medis" menampilkan daftar riwayat kunjungan dokter, nama faskes, kode diagnosis ICD-10, tanggal kunjungan, dan ringkasan klinis dengan state kosong terkelola rapi.
    - Sub-tab "Log Akses Rekam Medis" menampilkan audit log realtime: nama dokter pemeriksa, fasilitas kesehatan, badge hasil akses (Berhasil Dibuka, Token Salah, Token Kedaluwarsa, Token Dicabut, Token Terkunci, Tanpa Token), dan tanggal/jam akses.
  - Tab "Izin Akses" memadukan `KartuIzinAkses` di bagian atas serta transparansi log pencarian NIK (UU PDP) di bagian bawah.
- [x] **Pengujian & Validasi**:
  - SQL Impersonasi: Pembuatan token -> status aktif -> pencabutan -> status dicabut teruji 100% lolos via MCP Supabase lytera.
  - Hak Akses: Akun non-pasien (Dinkes & Dokter) dibatasi; Dinkes melihat 0 baris data medis/audit log, dokter ditolak memanggil pembuatan token pasien.
  - Seed Data: 1 riwayat medis realistis (I10 - Hipertensi Esensial oleh dr. Andi Wicaksono) dan 1 log audit akses resmi berhasil dicatat untuk pengujian visual UI.
  - `npm run lint`: Lolos 0 error, 0 warning.
  - `npm run build`: Lolos 100% kompilasi Next.js 16 (Turbopack) & pemeriksaan tipe TypeScript.

### 18. Tahap 4c: Antarmuka Dokter untuk Verifikasi Token Izin dan Input Rekam Medis (Selesai)
- [x] **Server Actions Dokter (`app/actions/rekam-medis.ts`)**:
  - `bukaRekamMedisDokterAction`: Validasi dokter aktif dan faskes rujukan $\to$ memanggil `open_patient_medical_record`. Menangani status penolakan (`AKSES_DITOLAK`), status rekam medis kosong (`KOSONG`), dan daftar rekam medis aktif.
  - `tambahRekamMedisDokterAction`: Validasi 6 digit token izin, diagnosis ICD-10, dan ringkasan klinis $\to$ memanggil `add_medical_record` (versi 6 parameter) yang terhubung ke rujukan faskes pemanggil. Menangani pesan galat jika token kedaluwarsa/dicabut/terkunci di tengah jalan.
- [x] **Komponen UI Dokter (`components/RekamMedisDokterPanel.tsx`)**:
  - **Form Verifikasi Token Pasien**:
    - Input kode 6-digit dengan mode angka dan pemformatan monospace tracking luas.
    - Token disimpan strictly di memori lokal React component saat sesi aktif (tidak di-cache di localStorage, cookies, URL params, atau log konsol).
    - Pesan galat jelas untuk setiap skenario kegagalan: kode salah (dengan info sisa percobaan), token kedaluwarsa, token dicabut, atau token terkunci.
  - **Tampilan Riwayat Medis Pasien (Read-Only)**:
    - Banner penanda otorisasi aktif dan kepatuhan audit log PDP.
    - Menampilkan riwayat kunjungan terdahulu: nama dokter, fasilitas, tanggal kunjungan, kode ICD-10, dan ringkasan catatan klinis.
    - State kosong ramah pengguna jika pasien baru pertama kali berkunjung.
  - **Form Input Catatan Rekam Medis**:
    - Input kode diagnosis ICD-10 dan textarea ringkasan pemeriksaan/terapi klinis.
    - Menggunakan token aktif yang sama tanpa meminta pasien menginput ulang.
    - Jika token dicabut atau habis waktu di tengah sesi penulisan, form otomatis menutup diri dan meminta dokter memverifikasi ulang.
    - Setelah berhasil disimpan, entri baru langsung muncul di daftar riwayat lokal dan memicu pembaruan callback.
  - **Proteksi Hak Akses**:
    - Fitur diverifikasi di tingkat UI (`isDoctor`) dan di server action/database. Peran non-dokter (admin faskes, petugas, dinkes, pasien) ditolak dengan pesan informatif.
- [x] **Integrasi Halaman Rujukan (`app/portal/[peran]/[subperan]/rujukan/page.tsx`)**:
  - `RekamMedisDokterPanel` disematkan ke dalam modal rujukan pasien, berlaku dua arah: baik pada rujukan masuk rumah sakit maupun rujukan keluar faskes primer pengirim.
- [x] **Pengujian & Validasi**:
  - `npm run lint`: Lolos 0 error, 0 warning.
  - `npm run build`: Lolos 100% kompilasi Next.js 16 (Turbopack) & pemeriksaan tipe TypeScript.
  - **Uji Impersonasi SQL (7 Skenario Lolos 100%)**:
    1. Dokter dengan token valid sukses membuka rekam medis.
    2. Dokter dengan token valid sukses mencatat rekam medis baru (*K29.7 - Gastritis*).
    3. Dokter dengan token salah otomatis ditolak (`AKSES_DITOLAK`).
    4. Akun Dinkes ditolak membuka rekam medis (exception dilempar).
    5. Akun pasien ditolak menulis rekam medis (exception dilempar).
    6. Rekam medis yang ditulis dokter terbukti langsung muncul di riwayat pasien `list_my_medical_records` (Tahap 4b).
    7. Log audit append-only mencatat seluruh aktivitas pembacaan dan penulisan dokter secara persisten.

### 19. Tahap 5a & 5c: Verifikasi Administrasi (Backend, Portal Verifikator, Dinkes, Rujukan RS, & Teks) (Selesai)
- [x] **Skema Database & Migrasi (`20261007000000_tahap5a_verifikasi_administrasi.sql`)**:
  - Kolom penjamin di `patients` & `family_members`: `payer_type` (`'bpjs' | 'asuransi' | 'mandiri' | 'jaminan_daerah'`), `insurance_name`, `insurance_policy_number`.
  - Tabel `verification_requests`: Menyimpan pengajuan verifikasi domisili & SKTM/jaminan daerah (`patient_id`, `family_member_id`, `type`, `status`, `document_path`, `notes`, `valid_until`, `reviewed_by`, `reviewed_at`). Dilengkapi partial unique index untuk mencegah duplikasi permohonan aktif (`status = 'menunggu'`).
  - Storage bucket `verification-documents`: Privat, limit 5MB, format PDF/PNG/JPEG, policy RLS per-user (`auth.uid()`).
  - Normalisasi data wilayah: Migrasi data uji verifikator dan pasien ke format Title Case (`Jawa Tengah`, `Kota Semarang`, `Semarang Tengah`, `Miroto`).
- [x] **RPC SECURITY DEFINER**:
  - `submit_verification`: Pasien mengajukan verifikasi domisili atau kurang mampu dengan berkas bukti.
  - `list_my_verifications`: Pasien melihat status dan riwayat pengajuannya.
  - `list_verification_queue`: Petugas verifikator melihat antrean berkas sesuai cakupan wilayah tugas (kelurahan, kecamatan, atau kota/kabupaten Dinsos). Tanpa data medis.
  - `review_verification`: Petugas verifikator menyetujui (dengan masa berlaku) atau menolak (wajib alasan penolakan).
  - `list_pending_verifiers` & `review_verifier`: Khusus administrator Dinkes untuk memverifikasi akun petugas verifikator baru.
  - Modifikasi `list_facility_referrals` & `list_my_referrals`: Mengembalikan `payer_type`, `payer_number_masked`, `domisili_terverifikasi`, `jaminan_daerah_status`, `jaminan_daerah_valid_until` ke faskes penerima/pengirim.
- [x] **Server Actions (`app/actions/verifikasi.ts`)**:
  - `listVerificationQueueAction`, `reviewVerificationAction`, `getVerificationDocumentSignedUrlAction` (signed URL berdurasi 10 menit untuk dokumen privat).
  - `listPendingVerifiersAction`, `reviewVerifierAction` untuk verifikasi petugas oleh Dinkes.
- [x] **Komponen & Antarmuka Pengguna**:
  - `components/VerifikatorDashboard.tsx`: Antarmuka petugas verifikator lengkap dengan badge instansi wilayah, tab antrean/riwayat, modal detail pemohon administratif & pratinjau berkas via signed URL aman, modal persetujuan dengan batas tanggal, serta modal penolakan dengan catatan wajib. Tidak menampilkan data medis.
  - `app/portal/dinkes/verifikasi-petugas/page.tsx`: Halaman khusus Dinkes untuk meninjau dan menyetujui/menolak akun petugas verifikator baru, terhubung dengan tombol pintas di navigasi Dinkes.
  - Modal Rujukan RS (`app/portal/[peran]/[subperan]/rujukan/page.tsx`): Menampilkan status penjamin biaya (BPJS/Asuransi/Mandiri/Jaminan Daerah) serta status verifikasi domisili dan SKTM tanpa menampilkan berkas dokumen.
  - Copy Landing Page & Deskripsi Peran (`app/page.tsx`, `lib/roles.ts`): Penyesuaian teks verifikator menjadi peran opsional administratif penjamin biaya/domisili yang tidak menghalangi rujukan medis, serta penyesuaian alur cara kerja RS langsung menerima rujukan.
- [x] **Pengujian & Validasi**:
  - SQL Impersonasi MCP Supabase Lytera: Skenario permohonan pasien -> masuk antrean verifikator berwilayah -> persetujuan verifikator -> status aktif tercermin di rujukan rumah sakit -> penolakan akses oleh Dinkes/pihak lain teruji lolos 100%.
  - `npm run lint`: Lolos 0 error, 0 warning.
  - `npm run build`: Lolos 100% kompilasi Next.js 16 (Turbopack) & pemeriksaan tipe TypeScript.


### 20. Tahap 5b: Formulir Pendaftaran & Halaman Penjamin Pasien (Selesai)
- [x] **Server Actions Pasien (`app/actions/verifikasi.ts`)**:
  - `listMyVerificationsAction`: Mengambil riwayat pengajuan verifikasi domisili & SKTM milik pasien login via RPC `list_my_verifications`.
  - `submitVerificationAction`: Menangani unggah berkas PDF/PNG/JPG (maksimal 5 MB) ke bucket privat `verification-documents` di path `{patient_id}/{timestamp}_{filename}`, lalu memanggil RPC `submit_verification` dengan rollback berkas jika permohonan ditolak.
  - `getMyPayerStatusAction`: Mengambil data penjamin biaya pasien utama serta seluruh anggota keluarga perwalian.
  - `updatePatientPayerAction`: Memperbarui tipe penjamin (`mandiri`, `bpjs`, `asuransi`, `jaminan_daerah`), nomor BPJS (13 digit), nama asuransi, dan nomor polis untuk subjek pasien atau anggota keluarga.
- [x] **Formulir Pendaftaran Pasien (`app/actions/pendaftaran.ts` & `app/daftar/[peran]/[subperan]/page.tsx`)**:
  - Formulir Pasien Pribadi (Langkah Alamat & Medis): Pilihan penjamin berupa kartu (Mandiri [default], BPJS Kesehatan [nomor 13 digit], Asuransi Swasta [nama & polis], Jaminan Daerah [keterangan diverifikasi pemda]). Label simulasi: *"Dicatat sesuai pengakuan pasien (simulasi). Bukan syarat daftar."*
  - Formulir Pasien Keluarga: Opsi penjamin biaya serupa disematkan per anggota keluarga.
  - Server Action `submitPendaftaranAction`: Memvalidasi dan menyimpan kolom `payer_type`, `insurance_name`, dan `insurance_policy_number` ke tabel `patients` dan `family_members`.
- [x] **Halaman & Bagian "Penjamin & Verifikasi" di Portal Pasien (`components/PenjaminVerifikasiSection.tsx`)**:
  - Tab "Penjamin Biaya Pasien": Formulir pemilihan penjamin dengan kartu pilihan, input dinamis, pemilihan subjek untuk keluarga, dan tombol simpan perubahan.
  - Tab "Verifikasi Administrasi & SKTM": Ringkasan status verifikasi domisili & SKTM (Terverifikasi s.d. tanggal / Dalam Peninjauan / Ditolak / Belum Diajukan), modal formulir pengajuan dengan unggah berkas (JPG/PNG/PDF maks 5 MB), serta daftar riwayat pengajuan lengkap dengan catatan pemohon, alasan penolakan petugas, dan tautan pratinjau dokumen aman via signed URL.
- [x] **Dashboard Pasien & Navigasi (`components/PasienDashboard.tsx` & `components/Navbar.tsx`)**:
  - Tab "Beranda": Kartu ringkas penjamin dan status verifikasi dengan badge status dan tombol pintas navigasi ke tab "Penjamin & Verifikasi".
  - Navigasi Cepat & Navbar: Penambahan tab *"Penjamin & Verifikasi"* di navbar dan tab navigasi utama dashboard.
- [x] **Pengujian & Validasi Nyata**:
  - Uji Impersonasi SQL Supabase MCP (lytera): Update penjamin pasien menjadi BPJS (`0001234567890`), submit pengajuan SKTM via `submit_verification`, dan verifikasi muncul di `list_my_verifications` teruji lolos 100%.
  - `npm run lint`: **0 error, 0 warning**.
  - `npm run build`: **Exit 0**, seluruh rute statis & dinamis Next.js 16 (Turbopack) berhasil dibangun tanpa galat tipe TypeScript.

### 21. Tahap Tera AI Assistant (Selesai)
- [x] **Arsitektur Core Engine Reusable (`lib/tera/`)**:
  - `types.ts`: Kontrak tipe data terstruktur (`TeraRole`, `TeraUserContext`, `TeraRecommendation`, `TeraMessage`, `TeraChatRequest`, `TeraChatResponse`).
  - `context.ts`: Context builder dan role-specific system prompt untuk 9 konteks: Landing, Pasien, Pasien Keluarga, Dokter, Puskesmas, Klinik, Rumah Sakit, Apotek, Verifikator, dan Dinkes. Dilengkapi chip saran pertanyaan cepat (`getQuickSuggestions`).
  - `tools.ts`: Controlled data tools yang aman mengakses RPC resmi Lytera (`list_active_facilities`, `list_active_doctors`), algoritma ranking kandidat berbobot hirarki wilayah (Kecamatan → Kabupaten/Kota → Provinsi → Luar), dan formatting kartu rekomendasi.
  - `engine.ts`: Orkestrasi Groq LLM server-only (`llama-3.3-70b-versatile`) dengan temperature rendah (0.3), data injection faskes nyata untuk mencegah halusinasi, dan intelligent fallback mode yang tetap merespons interaktif serta menampilkan data faskes nyata saat API eksternal bermasalah.
- [x] **Medical Safety Guardrails & UU PDP**:
  - Deteksi kata kunci kegawatdaruratan medis (nyeri dada hebat, sesak napas berat, kejang, dll.) $\to$ peringatan tegas segera menuju IGD Rumah Sakit terdekat atau nomor darurat 119.
  - Penegakan larangan diagnosis pasti, larangan meresepkan/mengubah obat, dan larangan aksi sensitif diam-diam (tidak membuat/mengubah rujukan, token, atau verifikasi secara sepihak).
  - Isolasi data PDP: Verifikator dan Dinkes dilarang keras menerima data rekam medis pasien.
- [x] **Server Action Aman (`app/actions/tera.ts`)**:
  - Eksekusi server-only dengan otentikasi sesi via `createClient()`.
  - Mengambil profil, wilayah pasien, anggota keluarga, atau fasilitas dokter dari database server tanpa mengekspos token medis atau password ke client bundle.
- [x] **Komponen UI Tera Reusable (`components/Tera/`)**:
  - `TeraMark.tsx`: Logo/mark resmi Tera dengan **continuous moving border gradient animation** (hijau terang `#34D399` $\to$ hijau deep `#047857`) saat cursor berada di area tombol.
  - `TeraWidget.tsx`: Tombol mengambang di pojok kanan bawah dengan micro-tooltip "Tera", panel floating ringkas (360-390px $\times$ 520px) yang **tidak menutup navbar, tidak memakai backdrop blur/overlay modal, dan halaman tetap 100% bisa discroll**.
  - Varian Landing: menampilkan Mark + Teks "Tera". Varian Portal: menampilkan Mark saja.
  - Tampilan kartu rekomendasi faskes terstruktur dengan badge status, wilayah, alasan pemilihan, dan tautan aksi resmi.
- [x] **Integrasi Antarmuka**:
  - Terintegrasi di Landing Page (`app/page.tsx`).
  - Terintegrasi di Portal Pasien dan Fasilitas (`app/portal/[peran]/layout.tsx`).
  - Terintegrasi di Portal Dinas Kesehatan (`app/portal/dinkes/layout.tsx`).
- [x] **Kualitas & Validasi**:
  - `npm run lint`: **0 error, 0 warning**.
  - `npm run build`: **Exit 0**, seluruh 19 rute sukses dibangun tanpa error.
  - `npx tsc --noEmit`: 100% type-safe.

### 22. Tahap Tetra AI Context-Aware & Rebranding (Selesai)
- [x] **Rebranding & Visual Mark Tetra**:
  - Rebranding nama dari "Tera" menjadi "Tetra" secara konsisten di landing page, portal pengguna, widget UI, tooltip, dan modul kode (`lib/tetra/`, `components/Tetra/`, `app/actions/tetra.ts`).
  - Mark SVG `TetraMark.tsx` diperbarui dengan **tepat 4 garis diagonal** di 4 kuadran (merepresentasikan Tetra), dengan tetap mempertahankan animasi border gradient hijau berputar (`animate-tetra-spin`).
- [x] **Anonimitas Ketat Pengunjung Landing Page**:
  - Pada `app/actions/tetra.ts`, saat pengunjung berada di landing page (`clientContext?.role === 'landing'`), context dipaksa anonim (`isLanding = true`). Sistem tidak pernah membaca cookie sesi pengguna terdaftar atau membocorkan profil pasien demo.
  - Saat ditanya *"nama saya siapa"* atau identitas diri di landing page, Tetra menjawab secara jujur bahwa pengunjung belum login dan menawarkan bantuan terkait informasi Lytera.
- [x] **Klasifikasi Intent Deterministik & Non-Overfitting Recommendations**:
  - Engine `lib/tetra/router.ts` & `lib/tetra/engine.ts` memisahkan intent secara presisi:
    - Informasi & Edukasi: `identity`, `token_access` (izin akses 6 digit), `referral_flow` (alur berjenjang), `medical_record`, `payer_verification`, `general_info`, `unsupported`. Menghasilkan jawaban informatif tanpa menyertakan kartu rekomendasi fasilitas faskes.
    - Pencarian Faskes/Dokter: `search_referral_hospital`, `search_facility`, `search_doctor`, `search_poli`. Hanya menjalankan query database faskes/dokter ketika intent memang membutuhkan pencarian faskes.
    - Kegawatdaruratan: `emergency`. Langsung memberikan peringatan darurat ke IGD / 119 dan rekomendasi IGD rumah sakit terdekat.
- [x] **Quick Action Chips Terkalibrasi**:
  - Pertanyaan cepat per peran disesuaikan agar langsung memicu intent yang sesuai tanpa mengarahkan pengguna ke rekomendasi faskes yang tidak relevan.
- [x] **Pengujian & Validasi**:
  - 7 skenario pengujian riil terverifikasi via HTTP endpoint:
    1. Landing identity ("nama saya siapa"): Respon anonim, tanpa kartu faskes (PASS).
    2. Landing token ("apa itu izin akses 6 digit?"): Penjelasan token 6 digit PDP, tanpa kartu faskes (PASS).
    3. Landing alur rujukan ("bagaimana alur rujukan Lytera?"): Penjelasan 4 tahap rujukan berjenjang, tanpa kartu faskes (PASS).
    4. Landing cari RS ("carikan rumah sakit rujukan"): Kartu rekomendasi RS Colombia (PASS).
    5. Landing cari dokter ("carikan dokter spesialis"): Laporan ketersediaan dokter yang jujur (PASS).
    6. Portal pasien identity: Mengenali profil pasien login dengan benar (PASS).
    7. Medical emergency ("dada saya sesak sekali"): Peringatan bahaya IGD 119 + kartu IGD RS (PASS).
  - `npm run lint`: **0 error, 0 warning**.
  - `npm run build`: **Exit 0**, seluruh rute Next.js 16 berhasil dikompilasi tanpa galat.

### 23. Sub-tahap A: Finalisasi Keamanan Pendaftaran Nakes, Konsumsi Undangan Atomik & Integritas Tetra (Selesai)
- [x] **Skema Database & Migrasi Korektif (`20261009170000_register_facility_staff_and_guard.sql`)**:
  - Migrasi data dokter aktif legacy (dr. Andi Wicaksono) ke relasi resmi `facility_staff_specializations` (`is_verified = true`) untuk menjaga integritas data lama tanpa kehilangan spesialisasi.
  - Penutupan celah RPC mandiri: `consume_invitation_code` dinonaktifkan total dan seluruh hak akses `EXECUTE` dicabut dari `anon`, `authenticated`, dan `PUBLIC`. Kuota tidak dapat dihabiskan sembarangan.
  - Pengetatan validasi undangan: Overload lama 1-parameter dinonaktifkan; pemanggilan `validate_invitation_code` wajib menyertakan target role dan target profesi.
  - Perlindungan integritas Tetra: Fallback ke `fs.specialization` di `get_active_facility_doctors` dihapus total. Spesialisasi dokter hanya dikembalikan jika berstatus `is_verified = true` di relasi `facility_staff_specializations`. Klaim pendaftar yang belum diverifikasi tidak pernah bocor ke rekomendasi Tetra.
  - RPC Transaksional `register_facility_staff`:
    - Mengikat otorisasi pemanggil (`auth.uid() = p_profile_id` & `role = 'fasilitas'`).
    - Validasi fasilitas aktif atau fasilitas penerbit undangan yang sah (dipaksa di sisi database, kebal manipulasi client).
    - Row-level lock `FOR UPDATE` pada kuota undangan, validasi status aktif, kedaluwarsa, kuota, target role, dan target profesi.
    - Insert penempatan `facility_staff` berstatus `'menunggu'`.
    - Insert array spesialisasi yang diajukan ke `facility_staff_specializations` dengan status `'is_verified = false'`, pencegahan duplikasi, dan pencocokan katalog resmi `staff_specializations`.
    - Konsumsi kuota undangan tepat 1 kali hanya jika seluruh rangkaian penyimpanan domain berhasil. Rollback otomatis jika salah satu tahap gagal.
  - Riwayat migrasi `20261009170000` tercatat di `supabase_migrations.schema_migrations`.
- [x] **Server Action `submitPendaftaranAction` (`app/actions/pendaftaran.ts`)**:
  - Alur pendaftaran tenaga kesehatan beralih 100% ke RPC transaksional `register_facility_staff`.
  - Tidak ada lagi loop insert spesialisasi terpisah atau konsumsi kuota yang error-nya diabaikan; kegagalan database menghasilkan pesan galat yang jelas dan rollback penuh.
- [x] **Pengujian & Validasi Nyata**:
  - Standalone consume blocked: Pemanggilan mandiri `consume_invitation_code` melempar exception (PASS).
  - Validasi kode undangan: Kode valid (PASS), kode salah (PASS), target role tidak cocok (PASS), target profesi tidak cocok (PASS), overload lama 1-param diblokir (PASS).
  - Otorisasi caller: Caller mencoba mendaftar atas akun lain ditolak `Akses tidak sah` (PASS); pasien mencoba mendaftar nakes ditolak `Bukan akun tenaga fasilitas kesehatan` (PASS).
  - Transaksi pendaftaran nakes: Penempatan berstatus `'menunggu'`, relasi spesialisasi berstatus `is_verified = false`, dan kuota undangan terpotong tepat 1 kali (PASS).
  - Rollback atomik: Simulasi kegagalan database membatalkan seluruh operasi tanpa meninggalkan penempatan yatim atau membuang kuota (PASS).
  - Integritas data Tetra: Dokter dengan spesialisasi `is_verified = false` mengembalikan `specialization: null` pada `get_active_facility_doctors` dan tidak memuat klaim palsu (PASS). Dokter aktif terverifikasi (dr. Andi) mengembalikan `Penyakit Dalam` resmi (PASS).
  - Security Advisors: Bebas dari temuan kerentanan baru yang tidak diinginkan; `consume_invitation_code` bersih dari peringatan publik.
  - `npm run lint`: **0 error, 0 warning**.
  - `npm run build`: **Exit 0**, seluruh 19 rute Next.js 16 berhasil dikompilasi tanpa galat.

### 24. Sub-tahap B: Persetujuan Staf Faskes, Pengesahan Spesialisasi & Penolakan Berakar Alasan (Selesai)
- [x] **Skema Database & Migrasi Korektif (`20261009180000_subtahap_b_persetujuan_staf.sql`)**:
  - Penambahan kolom `rejection_reason text` pada tabel `facility_staff`.
  - RPC Transaksional `review_facility_staff(p_staff_id, p_decision, p_staff_role, p_verified_spec_ids, p_rejection_reason)`:
    - Otorisasi ketat: hanya admin fasilitas terkait (`is_facility_admin(facility_id)`) atau akun `dinkes` yang dapat mengeksekusi peninjauan.
    - Opsi persetujuan (`'aktif'`): penetapan role akses final (`'dokter' | 'petugas' | 'apoteker'`) dan pengesahan spesialisasi per item (menandai `is_verified = true`, `verified_by = auth.uid()`, `verified_at = now()`). Spesialisasi yang tidak dipilih tetap `is_verified = false`.
    - Opsi penolakan (`'ditolak'`): mewajibkan alasan penolakan (`p_rejection_reason` tidak boleh kosong), mencatatnya ke `facility_staff.rejection_reason`, serta membatalkan status verifikasi spesialisasi.
    - Hak akses: dicabut dari publik/anon, hanya diberikan ke `authenticated`.
  - Riwayat migrasi `20261009180000` tercatat di `supabase_migrations.schema_migrations`.
- [x] **Server Actions (`app/actions/staf.ts`)**:
  - `StaffItem` diperluas dengan kolom `profession`, `rejection_reason`, serta array relasi `specializations` (`id`, `name`, `is_verified`).
  - `getAdminFacilityStaffAction`: Mengambil data staf lengkap dengan profesi, STR, SIP, alasan penolakan, serta join ke `facility_staff_specializations`.
  - `reviewFacilityStaffAction`: Server action aman yang memanggil RPC `review_facility_staff` dengan validasi parameter server-side.
  - `updateStaffStatusAction`: Dipertahankan untuk kompatibilitas mundur.
- [x] **Antarmuka Pengguna Admin Faskes (`app/portal/[peran]/[subperan]/staf/page.tsx`)**:
  - Kolom tabel menampilkan Profesi, No. STR, No. SIP secara terpisah dan terstruktur.
  - Badge spesialisasi menampilkan status pengesahan: hijau dengan ikon centang untuk yang telah diverifikasi, abu-abu untuk yang belum diverifikasi.
  - Modal Persetujuan & Pengesahan Staf:
    - Menampilkan ringkasan nakes (Nama, Profesi, STR, SIP).
    - Pilihan role akses final (Dokter / Petugas / Apoteker) interaktif.
    - Checklist pengesahan bidang spesialisasi per item yang diajukan oleh nakes.
  - Modal Penolakan Staf:
    - Input wajib alasan penolakan (textarea) dengan validasi form.
  - Modal Lihat Alasan: Memungkinkan admin/staf melihat catatan alasan jika permohonan berstatus ditolak.
- [x] **Pengujian & Validasi Nyata**:
  - Persetujuan & pengesahan staf: Teruji nyata via impersonasi SQL admin faskes Kedung Rejo. Staf berubah menjadi `'aktif'`, spesialisasi terverifikasi (`is_verified = true`), dan dokter langsung terbukti muncul di hasil `get_active_facility_doctors` untuk Tetra (PASS).
  - Penolakan tanpa alasan: Dicegat dan ditolak oleh database (PASS).
  - Penolakan dengan alasan sah: Status berubah menjadi `'ditolak'` dan alasan tersimpan rapi (PASS).
  - Otorisasi akun tidak sah: Pasien atau staf luar yang mencoba mereview staf faskes lain ditolak 100% oleh guard database (PASS).
  - Security Advisors: Bebas dari temuan kerentanan baru (PASS).
  - `npm run lint`: **0 error, 0 warning**.
  - `npm run build`: **Exit 0**, seluruh 19 rute Next.js 16 berhasil dikompilasi tanpa galat.

### 25. Verifikasi Siklus End-to-End Nakes & Integritas Tetra (Selesai)
- [x] **Alur Pendaftaran $\to$ Isolasi Menunggu**:
  - Dokter spesialis baru mendaftar penempatan di Puskesmas Kedung Rejo dengan spesialisasi `Anak`.
  - Terverifikasi pada database: status penempatan `'menunggu'`, spesialisasi `is_verified = false`.
  - Verifikasi isolasi data Tetra: RPC `get_active_facility_doctors` menghasilkan **0 dokter** (`before_count = 0`). Klaim pendaftar yang belum diverifikasi terbukti tidak bocor ke publik atau asisten AI Tetra.
- [x] **Alur Peninjauan Admin Faskes $\to$ Pengesahan Spesialisasi**:
  - Admin fasilitas kesehatan Kedung Rejo meninjau permohonan via RPC transaksional `review_facility_staff`.
  - Admin menyetujui peran `'dokter'` dan mengesahkan spesialisasi `Anak` (`is_verified = true`).
  - Verifikasi data Tetra: seketika setelah disahkan, dokter langsung muncul pada hasil `get_active_facility_doctors` dengan spesialisasi resmi `Anak`.
- [x] **Alur Persetujuan Dokter Umum Tanpa Pengesahan Spesialisasi**:
  - Jika admin menyetujui nakes sebagai dokter aktif namun tidak mengesahkan klaim spesialisasi (array verified kosong), dokter berstatus aktif tetapi spesialisasinya di Tetra bernilai `<NULL>` (dokter umum), tanpa klaim unverified yang menyesatkan.
- [x] **Kualitas Kode & Linting**:
  - `npm run lint`: **0 error, 0 warning**.
  - `npm run build`: **Exit 0**, seluruh 19 rute Next.js 16 berhasil dikompilasi tanpa galat.

### 26. Rujukan Berjenjang & Validasi Faskes Tujuan (Selesai)
- [x] **Penyelarasan RPC `list_active_doctors` ke Spesialisasi Terverifikasi**:
  - Migrasi `20261010010000_update_list_active_doctors.sql` diterapkan ke Supabase Lytera.
  - RPC `list_active_doctors(p_facility_id)` kini membaca agregat spesialisasi resmi dari tabel relasi `facility_staff_specializations` (`is_verified = true`), sinkron 100% dengan `get_active_facility_doctors` dan sistem peninjauan nakes Sub-tahap B.
  - Hak eksekusi `EXECUTE` diberikan ke peran `authenticated` dan `anon`.
- [x] **Koneksi Cerdas Dokter Spesialis & Poli di Formulir Rujukan Primer**:
  - Pada formulir penerbitan rujukan (`app/portal/[peran]/[subperan]/rujukan/baru/page.tsx`), pemilihan dokter tujuan dari rumah sakit rujukan kini langsung menyelaraskan pilihan Poli secara cerdas via mapping spesialisasi (misal dokter spesialis Anak otomatis mengarahkan ke Poli Anak, Penyakit Dalam ke Poli Penyakit Dalam, dll.).
  - Penanganan transparan dan ramah jika rumah sakit rujukan belum memiliki daftar dokter terdaftar: rujukan tetap dapat dikirimkan ke poli tujuan, dengan penugasan Dokter Penanggung Jawab Pelayanan (DPJP) dilakukan oleh pihak Rumah Sakit saat penjadwalan.
- [x] **Penyempurnaan Alur Penjadwalan Rujukan di Rumah Sakit**:
  - Pada modal aksi rumah sakit (`app/portal/[peran]/[subperan]/rujukan/page.tsx`), petugas rumah sakit dapat melihat dengan jelas poli rujukan yang diminta sebelum menugaskan dokter DPJP spesialis terverifikasi.
- [x] **Pengujian & Validasi Nyata**:
  - Uji impersonasi SQL MCP Supabase Lytera: `list_active_doctors` faskes Kedung Rejo berhasil mengembalikan dr. Andi Wicaksono dengan spesialisasi `Penyakit Dalam` (PASS).
  - Alur rujukan lengkap teruji via SQL impersonasi: penerbitan rujukan faskes primer -> status awal `diajukan` -> penerimaan oleh admin RS -> penjadwalan pemeriksaan -> penyelesaian tindakan berstatus `selesai` dan seluruh event linimasa tercatat persisten (PASS).
  - Security Advisors: Bersih tanpa temuan kerentanan baru (PASS).
  - `npm run lint`: **0 error, 0 warning**.
  - `npm run build`: **Exit 0**, seluruh 19 rute Next.js 16 berhasil dikompilasi tanpa galat.

### 27. Tetra Intelligence & Data Integrity (Selesai)
- [x] **Ekstraksi Intent Cerdas (Katalog Spesialisasi & Wilayah)**:
  - Pada `lib/tetra/router.ts`, fungsi `extractSpecialization` mendeteksi seluruh 20 katalog spesialisasi resmi Lytera (Penyakit Dalam, Jantung & Pembuluh Darah, Anak, Bedah, Kebidanan & Kandungan, Paru, Mata, THT-KL, Saraf, Jiwa, Kulit & Kelamin, dll.) dan sinonim sehari-hari.
  - Fungsi `extractLocation` mengenali target nama wilayah yang disebutkan pengguna (misal: "di Solo", "di Semarang", "wilayah Surakarta").
  - `IntentMatchResult` kini memuat metadata `targetLocation` untuk navigasi rujukan bertingkat.
- [x] **Pencarian Dokter Bertingkat & Eliminasi Async Storage Hang**:
  - Pada `lib/tetra/tools.ts`, fungsi `getClient` diperbaiki untuk menggunakan `createSupabaseClient<any, "public", any>` mandiri dengan batas waktu `AbortSignal.timeout(6000)` agar pemanggilan RPC publik (`list_active_facilities`, `get_active_facility_doctors`) tidak memicu `await cookies()` dari Next.js Server Client yang dapat menggantung di background.
  - `searchDoctorsWithLocationHierarchy`: Pembersihan `nameQuery` dari kata kunci umum ("cari", "dokter", "spesialis") agar tidak menyaring nama dokter secara keliru saat spesialisasi sudah terdeteksi.
  - Pembobotan `rankFacilities`: Menambahkan bobot preferensi wilayah target pengguna (+45 poin).
- [x] **Logika Respons Bertingkat & Grounding Data Groq**:
  - Pada `lib/tetra/engine.ts`:
    - **Kasus 1 (Exact Match)**: Jika dokter ditemukan di wilayah yang diminta (misal: "Semarang" -> dr. Andi Wicaksono), rekomendasi disajikan langsung dengan badge faskes dan spesialisasi resmi.
    - **Kasus 2 (Broader/Alternatif)**: Jika wilayah yang diminta belum memiliki dokter spesialis terkait (misal: "Solo"), sistem secara jujur dan transparan menjelaskan bahwa wilayah tersebut belum memiliki dokter spesialis tersebut, lalu menyajikan alternatif dokter terdekat dari wilayah lain yang terdaftar (Kota Semarang).
    - **Kasus 3 (Spesialisasi Kosong)**: Jika spesialisasi belum terdaftar di sistem sama sekali (misal: "Jantung di Solo"), jelaskan secara jujur dan berikan rekomendasi Rumah Sakit rujukan berjenjang terdekat.
    - **Ground-Truth Injeksi Groq**: Ringkasan dokter aktif terverifikasi (`doctorsSummary`) diinjeksikan ke dalam system prompt Groq bersama `facilitiesSummary` agar LLM tidak mengarang nama dokter atau faskes fiktif.
- [x] **Pengujian & Validasi Nyata (8/8 Skenario PASS)**:
  - Skenario 1 (Izin Akses Token 6 Digit): Teruji intent `token_access`, edukasi PDP tanpa kartu faskes yang tidak relevan (PASS).
  - Skenario 2 (Alur Rujukan Berjenjang): Teruji intent `referral_flow`, edukasi faskes primer tingkat pertama (PASS).
  - Skenario 3 (Cari Dokter Spesialis Penyakit Dalam di Semarang): dr. Andi Wicaksono terverifikasi tampil sebagai exact match (PASS).
  - Skenario 4 (Cari Dokter Spesialis Penyakit Dalam di Solo): Penjelasan transparan ketiadaan di Solo + sajian alternatif dr. Andi di Kota Semarang (PASS).
  - Skenario 5 (Cari Dokter Spesialis Jantung di Solo): Penjelasan transparan spesialisasi belum ada di sistem + rekomendasi RS rujukan terdekat (PASS).
  - Skenario 6 (Pasien Keluarga): Kenali identitas dan sapaan pasien keluarga (Budi Santoso) (PASS).
  - Skenario 7 (Landing Page Anonim): Tolak tebakan nama pengguna dan arahkan login (PASS).
  - Skenario 8 (Quick Action): Penelusuran RS rujukan mengembalikan RS Colombia (PASS).
- [x] **Kualitas Kode & Linting**:
  - `npm run lint`: **0 error, 0 warning**.
  - `npm run build`: **Exit 0**, seluruh 19 rute Next.js 16 berhasil dikompilasi tanpa galat.

---

### 28. Pengujian Alur Pasien Keluarga & Demo Interaktif (Selesai)
- [x] **Validasi & Simulasi Siklus End-to-End Database Pasien Keluarga (8 Skenario Lolos 100%)**:
  1. *Perwalian & Pendaftaran Keluarga*: Penambahan baris anggota keluarga (`family_members`) di bawah wali `iwak peyek` (anak 'Bocil Peyek', NIK 16 digit, penjamin BPJS).
  2. *Pencarian NIK Anak oleh Dokter Primer*: Dokter aktif (dr. Andi Wicaksono) memanggil `find_patient_by_nik` untuk NIK anak, data anak ditemukan dengan `family_member_id` terisi, hubungan `'anak'`, dan log audit tercatat persisten di `patient_lookup_logs`.
  3. *Penerbitan Rujukan Anak*: Dokter menerbitkan rujukan dengan `patient_id` wali dan `family_member_id` anak ke Poli Anak Rumah Sakit Colombia dengan status awal `diajukan`.
  4. *Akses Rujukan Keluarga Pasien*: Wali mengakses portal pasien via `list_my_referrals()`. Rujukan anak langsung tampil dengan `is_family = true`, nama subjek `'Bocil Peyek'`, nomor penjamin termasker (`payer_number_masked`), serta status verifikasi domisili terhubung.
  5. *Pembuatan Token Otorisasi Pasien*: Wali membuat token akses medis 6 digit via `create_patient_access_token()`.
  6. *Otorisasi Dokter Membuka Rekam Medis Anak*: Dokter membuka rekam medis anak via `open_patient_medical_record(patient_id, token_code, family_member_id)` dengan token izin wali; log `medical_record_access_logs` berstatus `berhasil` tercatat.
  7. *Pencatatan Rekam Medis Anak*: Dokter mencatat diagnosis ICD-10 (`J00`) dan terapi anak melalui `add_medical_record` dengan verifikasi token wali.
  8. *Transparansi Rekam Medis di Portal Wali*: Wali melihat rekam medis anak di riwayat medis via `list_my_medical_records()`.
- [x] **Penyempurnaan Demo Interaktif Visual (?demo=1)**:
  - Pada `components/PasienDashboard.tsx`: Saat mode `?demo=1` diakses untuk subperan keluarga, dashboard secara otomatis menyajikan data simulasi perwalian (pasangan Siti Rahmawati dan anak Dimas Santoso), kartu rujukan aktif anak Dimas Santoso ke Poli Anak RS Colombia, serta penjamin BPJS keluarga.
  - Pada `components/PenjaminVerifikasiSection.tsx`: Tab Penjamin Biaya dan Verifikasi Administrasi secara interaktif menyediakan pemilih subjek anggota keluarga (Wali Budi Santoso, Pasangan Siti Rahmawati, Anak Dimas Santoso), form kartu penjamin, serta riwayat verifikasi domisili simulasi yang siap dipresentasikan kepada dewan juri tanpa perlu dependensi sesi login aktif.
- [x] **Kualitas Kode, Linting & Build**:
  - `npm run lint`: **0 error, 0 warning**.
  - `npm run build`: **Exit 0**, seluruh 19 rute Next.js 16 berhasil dikompilasi tanpa galat.

---

### Berikutnya
- Persiapan Final Berkas Proyek & Dokumentasi Penjurian: Audit akhir seluruh alur platform (Landing page, Pasien Pribadi/Keluarga, Faskes Primer, RS Rujukan, Verifikator, Dinkes), pembuatan panduan demo penjurian, dan verifikasi akhir security advisors Supabase.







