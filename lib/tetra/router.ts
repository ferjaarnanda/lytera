import { TetraIntent } from "./types";

export interface IntentMatchResult {
  intent: TetraIntent;
  confidence: number;
  extractedQuery?: string;
  targetType?: "puskesmas" | "klinik" | "rumah_sakit" | "apotek";
  targetSpecialization?: string;
  targetLocation?: string;
  targetFacility?: string;
  isFacilityDoctorInquiry?: boolean;
  isRelativeFacility?: boolean;
}

export interface FacilityExtractionResult {
  facilityName?: string;
  isRelativeFacility?: boolean;
}

/**
 * Ekstraksi nama fasilitas spesifik atau penanda fasilitas relatif dari teks input.
 */
export function extractFacility(input: string): FacilityExtractionResult {
  const lower = input.toLowerCase();

  // 1. Rujukan relatif ke fasilitas (misal: "rumah sakit ini", "faskes ini", "fasilitas ini", "di sini", "disini")
  if (
    /\b(?:rumah sakit|rs|puskesmas|klinik|faskes|fasilitas)\s+(?:ini|tersebut)\b/i.test(lower) ||
    lower.includes("di faskes ini") ||
    lower.includes("di fasilitas ini") ||
    lower.includes("fasilitas ini") ||
    lower.includes("di sini") ||
    lower.includes("disini")
  ) {
    return { isRelativeFacility: true };
  }

  // 2. Pola nama fasilitas diawali tipe faskes: "puskesmas hamster sejahtera", "rumah sakit kucing garong", "rs colombia", dll.
  const facMatch = input.match(
    /\b(rumah sakit|rs|puskesmas|klinik|apotek)\s+([a-zA-Z0-9\s]+?)(?:\s+(?:ada|punya|mempunyai|tersedia|yang|untuk|dengan|buka|di|ini|terdekat|aktif|nggak|ngga|gak|apakah|berapa|siapa|apa)|[.,?!]|$)/i
  );
  if (facMatch && facMatch[2]) {
    const rawSuffix = facMatch[2].trim();
    const stopwords = [
      "ini",
      "itu",
      "tersebut",
      "rujukan",
      "terdekat",
      "aktif",
      "daerah",
      "wilayah",
      "kota",
      "kabupaten",
      "saya",
      "kami",
      "kita",
    ];
    if (rawSuffix.length >= 3 && !stopwords.includes(rawSuffix.toLowerCase())) {
      const full = `${facMatch[1].trim()} ${rawSuffix}`.toLowerCase();
      return { facilityName: full };
    }
  }

  // 3. Pola bertugas di / terdaftar di [nama faskes]
  const bertugasMatch = input.match(
    /\b(?:bertugas di|terdaftar di|pada)\s+(?:faskes|fasilitas|rumah sakit|rs|puskesmas|klinik|apotek)?\s*([a-zA-Z0-9\s]+?)(?:\s+(?:yang|ada|tersedia|aktif)|[.,?!]|$)/i
  );
  if (bertugasMatch && bertugasMatch[1]) {
    const raw = bertugasMatch[1].trim();
    if (raw.length >= 3 && !["ini", "itu", "tersebut"].includes(raw.toLowerCase())) {
      return { facilityName: raw.toLowerCase() };
    }
  }

  return {};
}

/**
 * Ekstraksi spesialisasi medis dari teks input berdasarkan katalog spesialisasi resmi Lytera.
 * Urutan evaluasi: istilah majemuk / lebih spesifik diperiksa terlebih dahulu agar tidak salah tertangkap istilah umum.
 */
export function extractSpecialization(input: string): string | undefined {
  const lower = input.toLowerCase();

  // 1. Prioritas istilah majemuk / spesifik
  if (lower.includes("gigi anak") || lower.includes("pedodonsia")) return "Gigi Anak (Pedodonsia)";
  if (lower.includes("bedah mulut") || lower.includes("maksilofasial")) return "Bedah Mulut dan Maksilofasial";
  if (lower.includes("konservasi gigi") || lower.includes("endodonsia") || lower.includes("dokter gigi") || lower.includes("spesialis gigi"))
    return "Konservasi Gigi (Endodonsia)";
  if (lower.includes("penyakit dalam") || lower.includes("sp.pd") || lower.includes("internist") || lower.includes("internis"))
    return "Penyakit Dalam";
  if (lower.includes("jantung") || lower.includes("kardiolog") || lower.includes("sp.jp"))
    return "Jantung dan Pembuluh Darah";
  if (
    lower.includes("saraf") ||
    lower.includes("syaraf") ||
    lower.includes("neurolog") ||
    lower.includes("neurologi") ||
    lower.includes("sp.s") ||
    lower.includes("sp.n")
  )
    return "Saraf (Neurologi)";
  if (lower.includes("mata") || lower.includes("oftalmolog") || lower.includes("sp.m"))
    return "Mata";
  if (
    lower.includes("kandungan") ||
    lower.includes("kebidanan") ||
    lower.includes("obgyn") ||
    lower.includes("sp.og")
  )
    return "Obstetri dan Ginekologi (Kebidanan & Kandungan)";
  if (lower.includes("tht") || lower.includes("telinga") || lower.includes("hidung") || lower.includes("sp.tht"))
    return "THT-KL";
  if (lower.includes("paru") || lower.includes("pulmonolog") || lower.includes("pulmonologi") || lower.includes("sp.p"))
    return "Paru (Pulmonologi)";
  if (
    lower.includes("kulit") ||
    lower.includes("kelamin") ||
    lower.includes("dermatolog") ||
    lower.includes("sp.kk") ||
    lower.includes("sp.dv")
  )
    return "Kulit dan Kelamin (Dermatologi)";
  if (lower.includes("jiwa") || lower.includes("psikiater") || lower.includes("psikiatri") || lower.includes("sp.kj"))
    return "Kedokteran Jiwa (Psikiatri)";
  if (lower.includes("ortopedi") || lower.includes("tulang") || lower.includes("traumatologi") || lower.includes("sp.ot"))
    return "Ortopedi dan Traumatologi";
  if (lower.includes("pediatri") || lower.includes("sp.a") || /\b(?:dokter\s+)?anak\b/i.test(lower))
    return "Anak";
  if (lower.includes("sp.b") || /\b(?:dokter\s+)?bedah\b/i.test(lower))
    return "Bedah";
  if (lower.includes("anestesi") || lower.includes("sp.an"))
    return "Anestesiologi dan Terapi Intensif";
  if (lower.includes("radiolog") || lower.includes("radiologi") || lower.includes("sp.rad"))
    return "Radiologi";
  if (lower.includes("rehabilitasi") || lower.includes("fisioterapi") || lower.includes("sp.kfr"))
    return "Rehabilitasi Medik";
  if (lower.includes("patologi") || lower.includes("sp.pk"))
    return "Patologi Klinik";
  if (lower.includes("periodonsia") || lower.includes("gusi"))
    return "Periodonsia";
  if (lower.includes("gigi"))
    return "Konservasi Gigi (Endodonsia)";

  return undefined;
}

/**
 * Ekstraksi nama wilayah (kota, kabupaten, kecamatan) dari teks input.
 * Menjamin tidak menangkap nama fasilitas kesehatan sebagai wilayah.
 */
export function extractLocation(input: string, targetFacility?: string): string | undefined {
  const match = input.match(
    /\b(?:di|wilayah|daerah|lokasi|kota|kabupaten|kab|kecamatan|kec)\s+([a-zA-Z0-9\s]+?)(?:\s+(?:siapa|ada|yang|untuk|dengan|terdekat|aktif|tersedia|nggak|ngga|gak|bisa|saja|aja|dong|apa)|[.,?!]|$)/i
  );
  if (match && match[1]) {
    let loc = match[1].trim();

    // Jika loc mengandung kata fasilitas kesehatan, ini bukan wilayah
    if (/\b(?:rumah sakit|rs|puskesmas|klinik|apotek|faskes|fasilitas)\b/i.test(loc)) {
      return undefined;
    }

    if (targetFacility && targetFacility.toLowerCase().includes(loc.toLowerCase())) {
      return undefined;
    }

    // Bersihkan trailing partikel/kata tanya
    loc = loc.replace(/\s+(?:siapa saja|siapa aja|siapa|ada siapa|saja|aja|dong|ya)$/i, "").trim();

    const stopwords = [
      "lytera",
      "sini",
      "mana",
      "faskes",
      "rumah",
      "sakit",
      "rs",
      "puskesmas",
      "klinik",
      "dokter",
      "spesialis",
      "poli",
      "rujukan",
      "terdekat",
      "aktif",
      "atas",
      "bawah",
      "ini",
      "itu",
      "tersebut",
      "saya",
      "kamu",
    ];
    if (loc.length >= 3 && !stopwords.includes(loc.toLowerCase())) {
      return loc;
    }
  }
  return undefined;
}

/**
 * Mengecek apakah pesan pengguna merupakan pertanyaan tentang identitas atau nama pengguna sendiri.
 * Mendukung variasi bahasa formal, informal, bahasa gaul (gw, gue, gua), bahasa Inggris,
 * serta pertanyaan lanjutan berbasis konteks percakapan.
 */
export function isSelfIdentityQuery(
  rawInput: string,
  conversationHistory?: Array<{ role: string; content: string }>
): boolean {
  const input = rawInput.toLowerCase().trim();
  if (!input) return false;

  // 1. FILTER NEGATIF: Pertanyaan edukatif / definisi konsep / arti kata
  // Contoh: "apa arti nama?", "arti nama", "apa makna nama", "apa itu nama"
  if (
    input.includes("arti nama") ||
    input.includes("makna nama") ||
    input.includes("definisi nama") ||
    input.startsWith("apa arti") ||
    input.startsWith("apa itu nama")
  ) {
    return false;
  }

  // 2. FILTER NEGATIF: Pertanyaan tentang identitas pihak ketiga / orang lain / entitas lain
  // Contoh: "siapa nama dokter itu?", "siapa nama pasien itu?", "siapa nama tokoh utama cerita ini?"
  const thirdPartyTargets = [
    "dokter",
    "pasien",
    "tokoh",
    "karakter",
    "penemu",
    "presiden",
    "menteri",
    "kadinkes",
    "gubernur",
    "walikota",
    "bupati",
    "orang itu",
    "orang lain",
    "dia",
    "mereka",
    "beliau",
    "rumah sakit",
    "faskes",
    "puskesmas",
    "klinik",
    "apotek",
    "obat",
    "penyakit",
  ];

  for (const target of thirdPartyTargets) {
    if (
      input.includes(`nama ${target}`) ||
      input.includes(`${target} itu`) ||
      input.includes(`${target} tersebut`)
    ) {
      return false;
    }
  }

  if (/\bsiapa\s+(?:nama\s+)?(?:dokter|pasien|tokoh|penemu|presiden)\b/.test(input)) {
    return false;
  }

  // 3. POLA LANGSUNG & PERCAKAPAN IDENTITAS DIRI
  // Pola A: "siapa aku/saya/gue/gw/gua", "aku/saya/gue/gw/gua siapa", "who am i"
  const whoAmIPattern = /\b(?:siapa\s+(?:sih\s+)?(?:aku|saya|gue|gua|gw|ogut|ku)|(?:aku|saya|gue|gua|gw|ogut)\s+(?:ini\s+|sih\s+)?siapa|who\s+am\s+i)\b/;
  if (whoAmIPattern.test(input)) {
    return true;
  }

  // Pola B: "nama saya", "siapa nama saya/aku/gue/gw", "namaku", "what is my name"
  const nameOfMePattern = /\b(?:(?:siapa\s+)?nama\s+(?:lengkap\s+)?(?:saya|aku|gue|gua|gw|ogut|ku)|namaku(?:\s+siapa|\s+apa)?|namasaya|namague|namagw|namagua|what(?:'s|\s+is)\s+my\s+name)\b/;
  if (nameOfMePattern.test(input)) {
    return true;
  }

  // Pola C: "saya/aku/gue/gw namanya siapa", "nama saya/aku/gue apa"
  const myNameWhoPattern = /\b(?:(?:saya|aku|gue|gua|gw)\s+(?:namanya\s+siapa|nama\s+lengkap\s+saya\s+apa)|nama\s+(?:saya|aku|gue|gua|gw)\s+apa)\b/;
  if (myNameWhoPattern.test(input)) {
    return true;
  }

  // Pola D: "kamu tahu/ingat aku siapa", "lu tau gue siapa", "ingat nama gue", "tahu nama saya"
  const doYouKnowMePattern = /\b(?:(?:kamu|lu|lo|kau|anda)\s+(?:tahu|tau|ingat|inget)\s+(?:siapa\s+(?:aku|saya|gue|gua|gw)|(?:aku|saya|gue|gua|gw)\s+siapa)|(?:ingat|inget|tahu|tau)\s+nama\s+(?:saya|aku|gue|gua|gw)|lu\s+tahu\s+gue\s+siapa|lu\s+tau\s+gue\s+siapa|kamu\s+tahu\s+aku\s+siapa|kamu\s+ingat\s+siapa\s+aku|do\s+you\s+know\s+who\s+i\s+am|do\s+you\s+know\s+my\s+name)\b/;
  if (doYouKnowMePattern.test(input)) {
    return true;
  }

  // Pola E: "emang aku siapa", "coba sebutkan nama saya", "sebutkan nama saya/aku", "coba panggil aku dengan nama"
  const callMePattern = /\b(?:emang\s+(?:aku|saya|gue|gw)\s+siapa|sebutkan\s+nama\s+(?:saya|aku|gue|gw)|panggil\s+(?:aku|saya|gue|gw)\s+(?:dengan\s+)?nama)\b/;
  if (callMePattern.test(input)) {
    return true;
  }

  // Pola F: "tadi aku bilang namaku siapa", "nama saya siapa tadi", "namaku siapa tadi"
  const recalledNamePattern = /\b(?:tadi\s+(?:aku|saya|gue|gw)\s+(?:bilang\s+)?nama(?:ku|\s+saya|\s+aku|\s+gue|\s+gw)\s+siapa|nama\s+(?:saya|aku|gue|gw)\s+siapa\s+tadi|namaku\s+siapa\s+tadi)\b/;
  if (recalledNamePattern.test(input)) {
    return true;
  }

  // Pola G: "identitas aku/saya/gue apa", "terus identitas aku apa"
  const identityPattern = /\b(?:identitas\s+(?:saya|aku|gue|gua|gw)|identitasku)\b/;
  if (identityPattern.test(input)) {
    return true;
  }

  // Pola H: "nama lengkapnya sekalian", "kalau nama lengkapku", "nama lengkapku"
  const isFollowUpNamePattern = /\b(?:nama\s+lengkapnya(?:\s+sekalian|\s+apa)?|kalau\s+nama\s+lengkapku|nama\s+lengkapku)\b/;
  if (isFollowUpNamePattern.test(input)) {
    return true;
  }

  // 4. PERTANYAAN LANJUTAN BERBASIS KONTEKS PERCAKAPAN
  if (conversationHistory && conversationHistory.length > 0) {
    const lastUserMsg = [...conversationHistory].reverse().find((m) => m.role === "user");
    if (lastUserMsg && isSelfIdentityQuery(lastUserMsg.content)) {
      if (
        input.includes("nama lengkap") ||
        input.includes("lengkapnya") ||
        input.includes("identitas") ||
        input.includes("siapa tadi")
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Mendeteksi intent dari pesan pengguna secara deterministik dan berbasis semantik.
 */
export function classifyTetraIntent(
  rawInput: string,
  conversationHistory?: Array<{ role: string; content: string }>
): IntentMatchResult {
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
  if (isSelfIdentityQuery(rawInput, conversationHistory)) {
    return { intent: "identity", confidence: 0.98 };
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

  // 7. PENCARIAN DOKTER / SPESIALIS / PERTANYAAN KETERSEDIAAN DOKTER FASKES
  const facilityResult = extractFacility(rawInput);
  const detectedLocationFinal = extractLocation(rawInput, facilityResult.facilityName);

  const doctorKeywords = [
    "dokter",
    "spesialis",
    "dr.",
    "sp.pd",
    "sp.jp",
    "sp.a",
    "sp.b",
    "sp.s",
    "sp.m",
    "neurologi",
    "neurolog",
    "internis",
    "internist",
  ];
  const hasDoctorKeyword =
    doctorKeywords.some((k) => input.includes(k)) || !!detectedSpecialization;

  const doctorQueryIndicators = [
    "cari",
    "carikan",
    "kasih",
    "minta",
    "tolong",
    "butuh",
    "mau",
    "tampilkan",
    "tunjukkan",
    "lihat",
    "daftar",
    "rekomendasi",
    "siapa",
    "siapa saja",
    "siapa aja",
    "ada",
    "ada siapa",
    "tersedia",
    "punya",
    "mempunyai",
    "bertugas",
    "terdaftar",
    "berapa",
    "buka",
    "jadwal",
    "apakah",
    "nggak",
    "ngga",
    "gak",
  ];
  const hasDoctorIndicator = doctorQueryIndicators.some((w) => input.includes(w));

  const isFacilityDoctorInquiry =
    (facilityResult.facilityName !== undefined || facilityResult.isRelativeFacility === true) &&
    hasDoctorKeyword &&
    hasDoctorIndicator;

  const isDoctorFollowUp =
    hasDoctorKeyword &&
    (input.startsWith("kalau ") ||
      input.startsWith("gimana ") ||
      input.startsWith("bagaimana ") ||
      input.startsWith("terus ") ||
      input.includes("mata?") ||
      input.includes("anak?"));

  const isDoctorSearch =
    hasDoctorKeyword &&
    (hasDoctorIndicator ||
      isDoctorFollowUp ||
      !!detectedLocationFinal ||
      !!facilityResult.facilityName);

  if (isDoctorSearch || isFacilityDoctorInquiry) {
    let targetLoc = detectedLocationFinal;
    let targetFac = facilityResult.facilityName;

    // Resolusi konteks percakapan untuk pertanyaan lanjutan
    if (conversationHistory && conversationHistory.length > 0) {
      const lastUser = [...conversationHistory].reverse().find((m) => m.role === "user");

      if (!targetFac && !targetLoc) {
        if (lastUser) {
          const userFac = extractFacility(lastUser.content);
          if (userFac.facilityName) {
            targetFac = userFac.facilityName;
          } else {
            const userLoc = extractLocation(lastUser.content);
            if (userLoc) {
              targetLoc = userLoc;
            }
          }
        }

        // Jika pada pesan user sebelumnya belum ditemukan, telusuri pesan-pesan sebelumnya
        if (!targetFac && !targetLoc) {
          const reversedMessages = [...conversationHistory].reverse();
          for (const msg of reversedMessages) {
            const prevFac = extractFacility(msg.content);
            if (prevFac.facilityName) {
              targetFac = prevFac.facilityName;
              break;
            }
            const prevLoc = extractLocation(msg.content);
            if (prevLoc) {
              targetLoc = prevLoc;
              break;
            }
          }
        }
      }
    }

    return {
      intent: "search_doctor",
      confidence: 0.95,
      targetSpecialization: detectedSpecialization,
      targetLocation: targetLoc,
      targetFacility: targetFac,
      isFacilityDoctorInquiry: isFacilityDoctorInquiry || facilityResult.isRelativeFacility,
      isRelativeFacility: facilityResult.isRelativeFacility,
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
      targetLocation: detectedLocationFinal,
      extractedQuery: input,
    };
  }

  // 9. PENCARIAN POLI
  if (input.includes("poli") && (input.includes("cari") || input.includes("tersedia") || input.includes("buka"))) {
    return {
      intent: "search_poli",
      confidence: 0.85,
      targetLocation: detectedLocationFinal,
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
        targetLocation: detectedLocationFinal,
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

