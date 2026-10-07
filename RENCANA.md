# Rencana kerja Lytera

Kerjakan berurutan. Catat status tiap tahap di PROGRESS.md (tabel: Tahap | Status | Commit | Catatan). Jangan ulang tahap berstatus SELESAI.

## Keputusan produk (final)
- Rujukan medis: dokter faskes tingkat 1 ke rumah sakit. TIDAK melewati kelurahan atau kecamatan (sesuai alur JKN). Status: diajukan, diterima, dijadwalkan, selesai (atau ditolak).
- Verifikasi Administrasi (kelurahan, kecamatan, dinas sosial) adalah jalur OPSIONAL terpisah untuk jaminan atau SKTM pasien non-BPJS. Tidak menghalangi rujukan. Portalnya tidak dibangun sekarang.
- Hanya dokter yang membuat rujukan. Admin faskes mengurus staf dan data faskes.
- Dinkes tidak melihat data medis maupun identitas lengkap pasien.

## Tahap 0: Persiapan
1. Baca AGENTS.md. Pastikan MCP Supabase menunjuk proyek lytera (list_tables harus memuat referrals dan patient_lookup_logs). Jika tidak, berhenti dan lapor.
2. Verifikasi database dengan impersonasi (uji lalu rollback): (a) dokter 093c6b36… cari NIK 1111111111111111 hasil 1 baris; (b) list_active_facilities('rumah_sakit','col') memuat rumah sakit colombia; (c) dokter membuat rujukan ke RS colombia, status otomatis diajukan; (d) dokter asal mengubah status ditolak; (e) staf berstatus menunggu TIDAK melihat rujukan faskesnya (fungsi user_facility_ids baru diperbaiki hanya menghitung staf dan faskes aktif). Jika ada yang gagal, perbaiki lewat migrasi lalu ulangi.
3. Jalankan get_advisors (security) dan lapor ringkas. Buat PROGRESS.md bila belum ada.

## Tahap 1: Perbaiki Buat Rujukan
Halaman rujukan/baru (dokter aktif di faskes aktif).
- Cari pasien: server action memanggil rpc find_patient_by_nik. Tampilkan kartu hasil (nama, NIK dimasker, tanggal lahir, jenis kelamin, kota; badge "Anggota keluarga (relasi)" bila family_member_id terisi). Bila lebih dari satu, dokter memilih. Tampilkan galat RPC dalam bahasa Indonesia (bukan dokter aktif, NIK bukan 16 digit, terlalu banyak pencarian). Nol hasil: "Pasien tidak ditemukan atau akunnya belum aktif". Jangan tampilkan data medis apa pun.
- Rumah sakit tujuan: kotak cari yang bisa diketik (pakai FacilityCombobox, p_type 'rumah_sakit'), urutan dari server, ketik "col" harus memunculkan rumah sakit colombia.
- Dokter tujuan (opsional): rpc list_active_doctors, default "Tanpa dokter tertentu".
- Submit (zod di server): insert referrals (patient_id, family_member_id, origin_facility_id dari faskes dokter, destination_facility_id, destination_doctor_id, poli, priority, diagnosis_icd10, catatan_klinis, created_by) lalu insert referral_events (status diajukan, catatan "Rujukan dibuat"). Status tidak perlu dikirim. Tampilkan pesan galat database. Sukses: pindah ke Riwayat Rujukan.
- Selesai bila: diuji nyata (UI dan MCP) membuat rujukan untuk pasien iwak peyek ke rumah sakit colombia, baris muncul di referrals dan referral_events.

## Tahap 2: Halaman staf
- Riwayat Rujukan (dokter/petugas puskesmas dan klinik): rpc list_facility_referrals('keluar'). Tabel (pasien dengan NIK dimasker, tujuan, dokter tujuan, poli, prioritas, status, tanggal), filter status, panel detail dengan timeline (list_referral_events), tombol Buat Rujukan.
- Rujukan Masuk (rumah sakit): rpc list_facility_referrals('masuk'). Tab Semua/Gawat Darurat/Urgent/Elektif. Panel detail: diagnosis dan catatan klinis. Aksi menurut status: diajukan, Terima atau Tolak (alasan wajib); diterima, Jadwalkan (tanggal dan jam wajib, dokter opsional dari list_active_doctors) atau Tolak; dijadwalkan, Tandai selesai. Tiap aksi: update referrals lalu insert referral_events berisi catatan.
- Jadwal Saya: rujukan masuk berstatus dijadwalkan, urut jadwal terdekat.
- Selesai bila: alur dua sisi teruji (buat rujukan, terima, jadwalkan, selesai) dan timeline mencatat tiap langkah. Butuh akun staf RS: minta user mendaftarkan dokter di RS colombia dan menyetujuinya lewat halaman Dokter & Petugas admin RS.

## Tahap 3: Halaman pasien
- Rujukan Saya: rpc list_my_referrals, kartu dengan status dan timeline, "Untuk: nama" bila rujukan anggota keluarga.
- Dashboard: kartu "Rujukan Aktif" menampilkan rujukan terbaru yang belum selesai atau ditolak (ganti keadaan kosong bila ada).
- Izin Akses (bagian awal): daftar "Siapa yang mencari data saya" dari rpc list_my_lookup_logs (waktu, dokter, fasilitas, keperluan). Bagian token diisi di Tahap 4.

## Tahap 4: Token akses, Riwayat Medis, Rekam Medis (kamu yang merancang skema)
Rancang skema sendiri lewat migrasi, dengan aturan:
- Token izin pasien 6 digit: disimpan sebagai hash (pgcrypto, ingat memakai extensions.crypt di fungsi ber-search_path public), kedaluwarsa 60 menit, bisa dicabut, satu token aktif per pasien, terkunci setelah 5 percobaan salah.
- Tabel kunjungan medis minimal (tanggal, fasilitas, dokter, diagnosis, ringkasan, rujukan terkait) dan log akses append-only (siapa, kapan, token mana).
- Semua akses lewat RPC SECURITY DEFINER dengan pemeriksaan peran dan token, tanpa membuka tabel langsung. Revoke execute dari anon.
- UI: pasien membuat token (kode tampil sekali, hitung mundur, tombol cabut) dan membaca Riwayat Medis serta log akses. Dokter membuka Rekam Medis dengan NIK (find_patient_by_nik) ditambah token. Dokter rumah sakit tujuan dapat menambah catatan kunjungan saat rujukan dijadwalkan atau selesai.
- Selesai bila: diuji impersonasi (token salah, kedaluwarsa, dicabut, terkunci, dokter tanpa token ditolak, pasien lain tidak melihat), get_advisors bersih untuk objek baru, dan alur UI teruji.

## Keputusan produk: Verifikasi Administrasi (pengganti yang lama)
- Hanya DUA fungsi, keduanya OPSIONAL dan tidak pernah menghalangi rujukan: (1) verifikasi domisili, (2) verifikasi kurang mampu untuk jaminan biaya (SKTM/jaminan daerah).
- Pasien memilih PENJAMIN saat daftar (BPJS, asuransi swasta, mandiri/umum, jaminan daerah/kurang mampu) dan bisa mengubahnya di halaman Penjamin & Verifikasi. Default: mandiri.
- Kepesertaan BPJS dan asuransi TIDAK diverifikasi ke pihak luar. Tampilkan label "dicatat sesuai pengakuan pasien (simulasi)".
- Rumah sakit hanya melihat STATUS (penjamin, domisili terverifikasi, jaminan daerah terverifikasi s.d. tanggal), tidak pernah dokumennya. Verifikator hanya melihat identitas dan data administratif, tanpa data medis.

## Tahap 5a: Database (tanpa UI)
1. patients dan family_members: tambah payer_type (bpjs|asuransi|mandiri|jaminan_daerah, default mandiri), insurance_name, insurance_policy_number. Kolom bpjs_number sudah ada.
2. Tabel verification_requests: id, patient_id, family_member_id (opsional), type (domisili|kurang_mampu), status (menunggu|disetujui|ditolak), document_paths text[], patient_note, review_note, reviewed_by, reviewed_at, valid_until date, snapshot wilayah (province, city, district, village berupa NAMA), created_at. Satu pengajuan berstatus menunggu per subjek dan jenis. RLS: pasien membaca miliknya; menulis hanya lewat RPC.
3. Bucket privat verification-documents (path "{patient_id}/..."): pasien mengunggah dan membaca miliknya; verifikator hanya lewat signed URL yang dibuat server setelah RPC memeriksa cakupan wilayah; pihak lain (dokter, rumah sakit, Dinkes) tidak punya akses.
4. RPC SECURITY DEFINER (revoke dari anon): submit_verification, list_my_verifications, list_verification_queue(p_status) untuk verifikator aktif dan hanya dalam cakupan wilayahnya (kelurahan: village+district+city sama; kecamatan: district+city; dinas_sosial: city; bandingkan tanpa beda huruf besar/kecil dan spasi), review_verification(p_id, p_decision, p_note, p_valid_until) (satu persetujuan dari verifikator berwenang cukup; tolak wajib alasan).
5. Perluas list_facility_referrals dan list_my_referrals: payer_type, nomor BPJS/polis dimasker (4 digit terakhir), domisili_terverifikasi, status jaminan daerah (belum|menunggu|terverifikasi + valid_until).
6. Persetujuan akun verifikator oleh Dinkes: RPC list_pending_verifiers() dan review_verifier(p_id, p_decision), hanya role dinkes.
7. Data uji lama: wilayah verifikator dan beberapa pasien uji masih berupa KODE (mis. 3374 / 337401 / 33740101). Perbarui lewat SQL ke NAMA wilayah seperti yang disimpan formulir sekarang agar pencocokan berfungsi.
8. Uji impersonasi: pasien tidak melihat pengajuan orang lain; verifikator di luar cakupan tidak melihat antrean; rumah sakit dan dokter tidak bisa membaca dokumen; setuju dan tolak tercatat; get_advisors bersih.

## Tahap 5b: Tampilan pasien
- Formulir daftar Pasien Pribadi (dan per anggota di Pasien Keluarga): pilihan Penjamin berupa kartu. BPJS: nomor 13 digit. Asuransi: nama dan nomor polis. Mandiri: tanpa isian. Jaminan daerah: keterangan "akan diverifikasi" dengan opsi ajukan sekarang. Bukan syarat daftar. Sertakan label simulasi.
- Halaman baru "Penjamin & Verifikasi" di portal pasien: ubah penjamin, daftar pengajuan dengan status dan alasan penolakan, tombol ajukan verifikasi domisili dan verifikasi kurang mampu (unggah PDF/JPG/PNG maks 5 MB ke bucket lalu submit_verification), badge "Terverifikasi s.d. ...".
- Dashboard: kartu ringkas penjamin dan status verifikasi.

## Tahap 5c: Verifikator, Dinkes, rumah sakit, teks
- Portal Verifikator (navbar Verifikasi, Riwayat): antrean dari list_verification_queue (nama, NIK dimasker, wilayah, jenis, tanggal), detail dengan dokumen (signed URL dari server), aksi Setujui (berlaku sampai opsional) atau Tolak (alasan wajib). Tanpa data medis.
- Dinkes: halaman "Verifikasi Petugas" untuk menyetujui akun verifikator.
- Rumah sakit: detail Rujukan Masuk menampilkan badge penjamin dan status verifikasi (status saja).
- Teks landing: kartu peran Verifikasi Administrasi menjadi "Opsional. Memverifikasi domisili dan keterangan kurang mampu untuk jaminan biaya. Tidak diperlukan untuk rujukan medis." Cara kerja langkah 2 menjadi "Rumah sakit menerima rujukan dan menetapkan jadwal". Timeline rujukan tidak menampilkan langkah verifikasi.
- Selesai bila alur dua sisi teruji: pasien mengajukan, verifikator menyetujui, pasien melihat status, rumah sakit melihat badge tanpa dokumen.

## Masalah terbuka (tanya user, jangan ubah sendiri)
- Akun Pasien Keluarga berstatus "menunggu" dan belum ada yang menyetujui, jadi belum bisa memakai portal. Saran: aktifkan otomatis untuk demo.