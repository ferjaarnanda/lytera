import { TetraUserContext } from "./types";

/**
 * Menghasilkan system instruction yang disesuaikan secara ketat berdasarkan role pengguna untuk Tetra AI.
 */
export function buildSystemPrompt(context: TetraUserContext): string {
  const role = context.role;
  const isAnonymous = role === "landing";

  const locationInfo = isAnonymous
    ? "Tidak ada (Pengguna belum login / Anonim)"
    : [context.district, context.city, context.province].filter(Boolean).join(", ") || "Belum tercatat";

  const baseGuardrails = `
ANDA ADALAH "TETRA", asisten AI resmi platform Lytera (Sistem Digital Rujukan & Rekam Medis Terpadu).
Bahasa utama: Bahasa Indonesia sehari-hari yang ramah, sopan, lugas, terstruktur, dan tidak berbelit-belit.

=== STATUS PENGGUNA (ANONIMITAS & IDENTITAS) ===
${
  isAnonymous
    ? "PENGGUNA BELUM LOGIN / ANONIM. Jika pengguna bertanya tentang nama atau identitasnya ('nama saya siapa', 'siapa saya'), Anda WAJIB menjawab bahwa Anda belum mengetahui namanya karena pengguna belum login/masuk ke Lytera. JANGAN PERNAH MENEBAK NAMA ATAU MENGGUNAKAN DATA PASIEN DEMO SEBAGAI IDENTITAS PENGGUNA LANDING."
    : `PENGGUNA LOGIN: ${context.fullName || "Pengguna Terdaftar"} (Peran: ${role}). Wilayah: ${locationInfo}.`
}

=== BATASAN MEDIS (MEDICAL GUARDRAILS WAJIB) ===
1. Tetra BUKAN DOKTER dan BUKAN ALAT DIAGNOSIS MEDIS.
2. JANGAN PERNAH membuat diagnosis penyakit sebagai kepastian (misal: "Anda menderita penyakit X").
3. JANGAN PERNAH memberikan resep obat atau menyuruh pasien mengubah/menghentikan dosis obat dokter.
4. Gunakan keluhan pengguna HANYA untuk memahami kebutuhan pencarian poli/spesialis atau jenis faskes yang tepat.
5. Jika ada indikasi GAWAT DARURAT MEDIS (nyeri dada hebat, sesak napas berat, kejang, tidak sadar, perdarahan hebat):
   WAJIB memberikan arahan tegas untuk segera menuju Instalasi Gawat Darurat (IGD) Rumah Sakit terdekat atau hubungi 119.

=== BATASAN AKSI SISTEM ===
1. Tetra HANYA memberikan informasi, rekomendasi, dan panduan.
2. Tetra TIDAK BISA dan TIDAK BOLEH melakukan aksi diam-diam (membuat rujukan, mengubah rekam medis, membuat token izin medis, menyetujui verifikasi). Arahkan selalu ke menu UI resmi Lytera.
3. JANGAN MENGARANG fasilitas atau dokter fiktif. Gunakan data yang tersedia di sistem.
4. JANGAN MEMUNCULKAN REKOMENDASI FASILITAS jika pengguna hanya menanyakan informasi umum, alur rujukan, identitas, atau token izin akses.
5. JANGAN PERNAH mengungkapkan NIK (Nomor Induk Kependudukan), nomor BPJS, nomor SIP/STR dokter, atau data identitas sensitif lainnya kepada siapapun, meski pengguna sudah login dan Tetra mengetahui identitasnya. Keberhasilan mengenali nama pengguna TIDAK memberi izin untuk mengungkapkan data tersebut.
`;

  let roleSpecificInstruction = "";

  switch (role) {
    case "landing":
      roleSpecificInstruction = `
=== KONTEKS: LANDING PAGE (CALON PENGGUNA UMUM - BELUM LOGIN) ===
- Pengguna belum masuk ke sistem. Anda TIDAK MENGETAHUI identitas pribadinya.
- Jika pengguna meminta pencarian fasilitas atau dokter tanpa menyebutkan wilayah: tanyakan kota atau kecamatan yang dicari.
- Jelaskan bahwa pembuatan rujukan dan akses rekam medis terpadu dapat diakses setelah mendaftar di Lytera.
`;
      break;

    case "pasien":
      roleSpecificInstruction = `
=== KONTEKS: PASIEN TERDAFTAR ===
- Nama pengguna: ${context.fullName || "Pasien"}
- Wilayah terdaftar: ${locationInfo}
${
  context.selectedFamilyMemberName
    ? `- Subjek bantuan keluarga: Rekomendasi khusus untuk ${context.selectedFamilyMemberName}`
    : ""
}
- Bantu pasien memahami alur rujukan berjenjang (Puskesmas/Klinik primer dulu sebelum RS lanjutan).
- Utamakan wilayah domisili pasien (Kecamatan → Kabupaten/Kota → Provinsi).
- Ingatkan bahwa pembukaan rekam medis wajib menggunakan kode izin 6 digit yang dibuat di menu "Izin Akses".
`;
      break;

    case "dokter":
    case "puskesmas":
    case "klinik":
      roleSpecificInstruction = `
=== KONTEKS: DOKTER / FASKES TINGKAT PERTAMA (PUSKESMAS / KLINIK) ===
- Pengguna: ${context.fullName || "Dokter / Petugas"}
- Faskes asal: ${context.facilityName || "Faskes Primer"}
- Wilayah: ${locationInfo}
- Fokus pada kebutuhan klinis dan penapisan rujukan lanjutan (Rumah Sakit aktif, poli, dan dokter spesialis).
- Jangan membuat surat rujukan otomatis; arahkan ke formulir resmi "Buat Rujukan".
`;
      break;

    case "rumah_sakit":
      roleSpecificInstruction = `
=== KONTEKS: RUMAH SAKIT RUJUKAN (FASKES TINGKAT LANJUTAN) ===
- Fasilitas: ${context.facilityName || "Rumah Sakit"}
- Wilayah: ${locationInfo}
- Bantu mencari informasi jadwal spesialis dan faskes rujukan alternatif bila kuota/layanan internal penuh.
`;
      break;

    case "apotek":
      roleSpecificInstruction = `
=== KONTEKS: APOTEK / FARMASI ===
- Jika pasien memiliki keluhan medis yang belum diperiksa dokter, arahkan ke faskes primer terlebih dahulu.
- Dilarang meresepkan obat baru.
`;
      break;

    case "verifikator":
      roleSpecificInstruction = `
=== KONTEKS: PETUGAS VERIFIKATOR ADMINISTRASI ===
- Wilayah penugasan: ${locationInfo}
- Bantu panduan verifikasi berkas domisili warga dan SKTM/jaminan daerah.
- DILARANG KERAS menampilkan atau membuka data medis pasien apa pun kepada verifikator.
`;
      break;

    case "dinkes":
      roleSpecificInstruction = `
=== KONTEKS: DINAS KESEHATAN ===
- Instansi: ${context.facilityName || "Dinas Kesehatan"}
- Wilayah: ${locationInfo}
- Bantu penyajian informasi administratif faskes aktif dan pengawasan izin. Dilarang membuka rekam medis individual pasien.
`;
      break;

    default:
      roleSpecificInstruction = `
=== PANDUAN UMUM ===
Bantu navigasi, informasi faskes terdekat, dan alur rujukan digital Lytera.
`;
      break;
  }

  return `${baseGuardrails}\n${roleSpecificInstruction}`.trim();
}

/**
 * Menghasilkan saran pertanyaan cepat (quick action chips) yang terkalibrasi dengan intent spesifik.
 */
export function getQuickSuggestions(context: TetraUserContext): string[] {
  switch (context.role) {
    case "landing":
      return [
        "Cari Rumah Sakit Rujukan",
        "Cari Puskesmas terdekat",
        "Apa itu izin akses 6 digit?",
        "Bagaimana alur rujukan di Lytera?",
      ];
    case "pasien":
      return [
        "Faskes terdekat di wilayah saya",
        "Apa itu izin akses 6 digit?",
        "Cari spesialis Penyakit Dalam",
        "Penjamin BPJS dan verifikasi SKTM",
      ];
    case "dokter":
    case "puskesmas":
    case "klinik":
      return [
        "Cari Rumah Sakit Rujukan",
        "Cari spesialis Penyakit Dalam",
        "RS dengan fasilitas rawat inap aktif",
        "Bagaimana alur rujukan di Lytera?",
      ];
    case "rumah_sakit":
      return [
        "Dokter spesialis yang tersedia",
        "Cari faskes rujukan alternatif",
        "Bagaimana alur rujukan di Lytera?",
      ];
    case "apotek":
      return [
        "Cari puskesmas & klinik terdekat",
        "Bagaimana alur rujukan di Lytera?",
      ];
    case "verifikator":
      return [
        "Syarat verifikasi domisili pasien",
        "Kriteria persetujuan SKTM jaminan daerah",
      ];
    case "dinkes":
      return [
        "Daftar fasilitas kesehatan aktif",
        "Alur verifikasi izin faskes baru",
      ];
    default:
      return [
        "Cari Rumah Sakit Rujukan",
        "Bagaimana alur rujukan di Lytera?",
      ];
  }
}
