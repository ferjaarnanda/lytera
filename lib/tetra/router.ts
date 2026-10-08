import { TetraIntent } from "./types";

export interface IntentMatchResult {
  intent: TetraIntent;
  confidence: number;
  extractedQuery?: string;
  targetType?: "puskesmas" | "klinik" | "rumah_sakit" | "apotek";
  targetSpecialization?: string;
}

/**
 * Mendeteksi intent dari pesan pengguna secara deterministik dan berbasis semantik.
 */
export function classifyTetraIntent(rawInput: string): IntentMatchResult {
  const input = rawInput.toLowerCase().trim();

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
    return { intent: "emergency", confidence: 0.99 };
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
  const isDoctorSearch = doctorKeywords.some((k) => input.includes(k));
  if (isDoctorSearch && (input.includes("cari") || input.includes("carikan") || input.includes("rekomendasi") || input.includes("daftar") || input.includes("siapa"))) {
    let spec = undefined;
    if (input.includes("dalam") || input.includes("penyakit dalam")) spec = "Penyakit Dalam";
    if (input.includes("jantung")) spec = "Jantung";
    if (input.includes("anak")) spec = "Anak";
    if (input.includes("bedah")) spec = "Bedah";
    return {
      intent: "search_doctor",
      confidence: 0.9,
      targetSpecialization: spec,
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
  if (isRSSearch && (input.includes("cari") || input.includes("carikan") || input.includes("rekomendasi") || input.includes("rujukan") || input.includes("mana"))) {
    return {
      intent: "search_referral_hospital",
      confidence: 0.9,
      targetType: "rumah_sakit",
      extractedQuery: input,
    };
  }

  // 9. PENCARIAN POLI
  if (input.includes("poli") && (input.includes("cari") || input.includes("tersedia") || input.includes("buka"))) {
    return {
      intent: "search_poli",
      confidence: 0.85,
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
    if (input.includes("cari") || input.includes("carikan") || input.includes("dekat") || input.includes("terdekat") || input.includes("rekomendasi") || input.includes("daftar")) {
      let ftype: "puskesmas" | "klinik" | "rumah_sakit" | "apotek" | undefined = undefined;
      if (input.includes("puskesmas")) ftype = "puskesmas";
      else if (input.includes("klinik")) ftype = "klinik";
      else if (input.includes("apotek")) ftype = "apotek";

      return {
        intent: "search_facility",
        confidence: 0.88,
        targetType: ftype,
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
