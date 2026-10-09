import { TetraIntent } from "./types";

export interface IntentMatchResult {
  intent: TetraIntent;
  confidence: number;
  extractedQuery?: string;
  targetType?: "puskesmas" | "klinik" | "rumah_sakit" | "apotek";
  targetSpecialization?: string;
  targetLocation?: string;
}

/**
 * Ekstraksi spesialisasi medis dari teks input berdasarkan katalog spesialisasi resmi Lytera.
 */
export function extractSpecialization(input: string): string | undefined {
  const lower = input.toLowerCase();
  if (lower.includes("penyakit dalam") || lower.includes("sp.pd") || lower.includes("internist")) return "Penyakit Dalam";
  if (lower.includes("jantung") || lower.includes("kardiolog") || lower.includes("sp.jp")) return "Jantung dan Pembuluh Darah";
  if (lower.includes("anak") || lower.includes("pediatri") || lower.includes("sp.a")) return "Anak";
  if (lower.includes("bedah mulut")) return "Bedah Mulut dan Maksilofasial";
  if (lower.includes("bedah") || lower.includes("sp.b")) return "Bedah";
  if (lower.includes("saraf") || lower.includes("neurolog") || lower.includes("sp.s") || lower.includes("sp.n")) return "Saraf (Neurologi)";
  if (lower.includes("mata") || lower.includes("oftalmolog") || lower.includes("sp.m")) return "Mata";
  if (lower.includes("kandungan") || lower.includes("kebidanan") || lower.includes("obgyn") || lower.includes("sp.og")) return "Obstetri dan Ginekologi (Kebidanan & Kandungan)";
  if (lower.includes("tht") || lower.includes("telinga") || lower.includes("hidung") || lower.includes("sp.tht")) return "THT-KL";
  if (lower.includes("paru") || lower.includes("pulmonolog") || lower.includes("sp.p")) return "Paru (Pulmonologi)";
  if (lower.includes("kulit") || lower.includes("kelamin") || lower.includes("dermatolog") || lower.includes("sp.kk") || lower.includes("sp.dv")) return "Kulit dan Kelamin (Dermatologi)";
  if (lower.includes("jiwa") || lower.includes("psikiater") || lower.includes("psikiatri") || lower.includes("sp.kj")) return "Kedokteran Jiwa (Psikiatri)";
  if (lower.includes("ortopedi") || lower.includes("tulang") || lower.includes("sp.ot")) return "Ortopedi dan Traumatologi";
  if (lower.includes("gigi anak")) return "Gigi Anak (Pedodonsia)";
  if (lower.includes("gigi")) return "Konservasi Gigi (Endodonsia)";
  if (lower.includes("anestesi")) return "Anestesiologi dan Terapi Intensif";
  if (lower.includes("radiolog")) return "Radiologi";
  if (lower.includes("rehabilitasi") || lower.includes("fisioterapi")) return "Rehabilitasi Medik";
  return undefined;
}

/**
 * Ekstraksi nama wilayah (kota, kabupaten, kecamatan) dari teks input.
 */
export function extractLocation(input: string): string | undefined {
  const match = input.match(/\b(?:di|wilayah|daerah|kota|kecamatan)\s+([a-zA-Z\s]+?)(?:\s+(?:yang|untuk|dengan|terdekat|aktif|ada|tersedia)|[.,?!]|$)/i);
  if (match && match[1]) {
    const loc = match[1].trim();
    const stopwords = [
      "lytera", "sini", "mana", "faskes", "rumah", "sakit", "rs",
      "puskesmas", "klinik", "dokter", "spesialis", "poli", "rujukan",
      "terdekat", "aktif", "atas", "bawah"
    ];
    if (loc.length >= 3 && !stopwords.includes(loc.toLowerCase())) {
      return loc;
    }
  }
  return undefined;
}

/**
 * Mendeteksi intent dari pesan pengguna secara deterministik dan berbasis semantik.
 */
export function classifyTetraIntent(rawInput: string): IntentMatchResult {
  const input = rawInput.toLowerCase().trim();
  const detectedLocation = extractLocation(rawInput);
  const detectedSpecialization = extractSpecialization(rawInput);

  // 1. KONDISI DARURAT MEDIS (PRIORITAS TERTINGGI)
  const emergencyKeywords = [
    "darurat",
    "gawat darurat",
    "kejang",
    "tidak sadar",
    "pingsan",
    "sesak napas",
    "sesak nafas",
    "sesak sekali",
    "sesak berat",
    "sesak parah",
    "nyeri dada",
    "sakit dada",
    "dada sakit",
    "dada sesak",
    "serangan jantung",
    "muntah darah",
    "pendarahan hebat",
    "perdarahan banyak",
    "pendarahan",
    "perdarahan",
    "koma",
    "tersedak",
  ];
  const hasEmergencyWord = emergencyKeywords.some((k) => input.includes(k));
  const hasSesakAndDada = input.includes("sesak") && input.includes("dada");
  if (hasEmergencyWord || hasSesakAndDada) {
    return { intent: "emergency", confidence: 0.99, targetLocation: detectedLocation };
  }

  // 2. IDENTITAS DIRI / PERSONAL CONTEXT
  // "nama saya siapa", "siapa saya", "nama saya", "siapa namaku", "apakah kamu tahu nama saya"
  const identityPatterns = [
    /\bnama saya siapa\b/,
    /\bsiapa saya\b/,
    /\bsiapa nama saya\b/,
    /\bsiapa namaku\b/,
    /\bnama saya\b/,
    /\bidentitas saya\b/,
    /\btahu nama saya\b/,
    /\bapakah kamu tahu nama saya\b/,
    /\bakun saya siapa\b/,
  ];
  if (identityPatterns.some((pattern) => pattern.test(input))) {
    return { intent: "identity", confidence: 0.95 };
  }

  // 3. IZIN AKSES / TOKEN 6 DIGIT
  // "apa itu izin akses 6 digit?", "token izin", "kode akses", "cabut izin", dsb.
  const tokenKeywords = [
    "izin akses",
    "token",
    "6 digit",
    "kode akses",
    "kode izin",
    "buka rekam medis",
    "cabut izin",
    "pdp",
  ];
  if (tokenKeywords.some((k) => input.includes(k))) {
    return { intent: "token_access", confidence: 0.9 };
  }

  // 4. ALUR RUJUKAN LYTERA
  // "bagaimana alur rujukan di lytera?", "cara kerja rujukan", "syarat rujukan", dsb.
  const referralFlowKeywords = [
    "alur rujukan",
    "cara kerja rujukan",
    "bagaimana alur",
    "syarat rujukan",
    "tahapan rujukan",
    "cara rujukan",
    "prosedur rujukan",
    "proses rujukan",
  ];
  if (referralFlowKeywords.some((k) => input.includes(k))) {
    return { intent: "referral_flow", confidence: 0.9 };
  }

  // 5. PENJAMIN / VERIFIKASI ADMINISTRASI (BPJS, ASURANSI, SKTM, DOMISILI)
  const payerKeywords = [
    "penjamin",
    "bpjs",
    "asuransi",
    "sktm",
    "kurang mampu",
    "verifikasi domisili",
    "jaminan daerah",
  ];
  if (payerKeywords.some((k) => input.includes(k))) {
    return { intent: "payer_verification", confidence: 0.88 };
  }

  // 6. REKAM MEDIS
  const medicalRecordKeywords = [
    "rekam medis",
    "riwayat medis",
    "catatan dokter",
    "resume medis",
    "riwayat kunjungan",
    "diagnosa saya",
  ];
  if (medicalRecordKeywords.some((k) => input.includes(k))) {
    return { intent: "medical_record", confidence: 0.85 };
  }

  // 7. PENCARIAN DOKTER / SPESIALIS
  // "cari dokter", "dokter spesialis", "carikan dokter", "spesialis penyakit dalam", dsb.
  const doctorKeywords = [
    "dokter",
    "spesialis",
    "dr.",
    "sp.pd",
    "sp.jp",
    "sp.a",
    "sp.b",
  ];
  const isDoctorSearch = doctorKeywords.some((k) => input.includes(k)) || !!detectedSpecialization;
  if (isDoctorSearch && (input.includes("cari") || input.includes("carikan") || input.includes("rekomendasi") || input.includes("daftar") || input.includes("siapa") || input.includes("tersedia") || input.includes("ada"))) {
    return {
      intent: "search_doctor",
      confidence: 0.95,
      targetSpecialization: detectedSpecialization,
      targetLocation: detectedLocation,
      extractedQuery: input,
    };
  }

  // 8. PENCARIAN RUMAH SAKIT RUJUKAN
  // "cari rumah sakit rujukan", "carikan rumah sakit", "rs rujukan", dsb.
  const rsKeywords = [
    "rumah sakit",
    "rs rujukan",
    "faskes lanjutan",
    "rs terdekat",
    "rs colombia",
  ];
  const isRSSearch = rsKeywords.some((k) => input.includes(k));
  if (isRSSearch && (input.includes("cari") || input.includes("carikan") || input.includes("rekomendasi") || input.includes("rujukan") || input.includes("mana") || input.includes("daftar") || input.includes("di "))) {
    return {
      intent: "search_referral_hospital",
      confidence: 0.9,
      targetType: "rumah_sakit",
      targetLocation: detectedLocation,
      extractedQuery: input,
    };
  }

  // 9. PENCARIAN POLI
  if (input.includes("poli") && (input.includes("cari") || input.includes("tersedia") || input.includes("buka"))) {
    return {
      intent: "search_poli",
      confidence: 0.85,
      targetLocation: detectedLocation,
      extractedQuery: input,
    };
  }

  // 10. PENCARIAN FASILITAS (PUSKESMAS / KLINIK / APOTEK / UMUM)
  if (
    input.includes("puskesmas") ||
    input.includes("klinik") ||
    input.includes("apotek") ||
    input.includes("faskes") ||
    input.includes("fasilitas")
  ) {
    if (input.includes("cari") || input.includes("carikan") || input.includes("dekat") || input.includes("terdekat") || input.includes("rekomendasi") || input.includes("daftar") || input.includes("di ")) {
      let ftype: "puskesmas" | "klinik" | "rumah_sakit" | "apotek" | undefined = undefined;
      if (input.includes("puskesmas")) ftype = "puskesmas";
      else if (input.includes("klinik")) ftype = "klinik";
      else if (input.includes("apotek")) ftype = "apotek";

      return {
        intent: "search_facility",
        confidence: 0.88,
        targetType: ftype,
        targetLocation: detectedLocation,
        extractedQuery: input,
      };
    }
  }

  // 11. INFORMASI UMUM LYTERA
  const generalKeywords = [
    "apa itu lytera",
    "tentang lytera",
    "fitur lytera",
    "siapa tetra",
    "apa itu tetra",
    "bisa bantu apa",
  ];
  if (generalKeywords.some((k) => input.includes(k))) {
    return { intent: "general_info", confidence: 0.85 };
  }

  // 12. UNSUPPORTED / SALAM PEMBUKA UMUM
  return { intent: "unsupported", confidence: 0.5 };
}

