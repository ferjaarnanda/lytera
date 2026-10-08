import {
  TeraChatRequest,
  TeraChatResponse,
  TeraRecommendation,
  TeraUserContext,
} from "./types";
import { buildSystemPrompt, getQuickSuggestions } from "./context";
import {
  searchActiveFacilities,
  rankFacilities,
  buildFacilityRecommendations,
  FacilityCandidate,
} from "./tools";

/**
 * Mendeteksi kata kunci medis darurat (red flags) untuk keselamatan pasien.
 */
function checkEmergencyKeywords(input: string): boolean {
  const lower = input.toLowerCase();
  const emergencyKeywords = [
    "darurat",
    "gawat darurat",
    "kejang",
    "tidak sadar",
    "pingsan",
    "sesak napas berat",
    "sesak nafas parah",
    "nyeri dada hebat",
    "serangan jantung",
    "muntah darah",
    "pendarahan hebat",
    "perdarahan banyak",
    "koma",
  ];
  return emergencyKeywords.some((k) => lower.includes(k));
}

/**
 * Deteksi intent jenis fasilitas yang dicari dari input pengguna.
 */
function detectPreferredFacilityType(
  input: string
): "puskesmas" | "klinik" | "rumah_sakit" | "apotek" | undefined {
  const lower = input.toLowerCase();
  if (lower.includes("rumah sakit") || lower.includes(" rs ") || lower.startsWith("rs ") || lower.includes("rujukan lanjutan") || lower.includes("spesialis")) {
    return "rumah_sakit";
  }
  if (lower.includes("puskesmas") || lower.includes("faskes 1") || lower.includes("primer") || lower.includes("faskes tingkat pertama")) {
    return "puskesmas";
  }
  if (lower.includes("klinik")) {
    return "klinik";
  }
  if (lower.includes("apotek") || lower.includes("obat") || lower.includes("resep")) {
    return "apotek";
  }
  return undefined;
}

/**
 * Fallback generator ketika API eksternal LLM tidak tersedia atau mengalami kendala kuota/koneksi.
 * Tetap menggunakan data nyata Lytera dan mematuhi guardrails.
 */
async function generateFallbackResponse(
  input: string,
  context: TeraUserContext,
  availableFacilities: FacilityCandidate[]
): Promise<TeraChatResponse> {
  const lowerInput = input.toLowerCase().trim();
  const suggestions = getQuickSuggestions(context);
  let recommendations: TeraRecommendation[] = [];
  let replyText = "";

  // 1. Cek Kegawatdaruratan Medis
  if (checkEmergencyKeywords(input)) {
    replyText =
      "⚠️ **PERINGATAN KONDISI DARURAT MEDIS**\n\n" +
      "Gejala yang kamu sebutkan berpotensi merupakan kondisi gawat darurat yang membutuhkan tindakan segera. " +
      "Mohon segera bawa pasien ke **Instalasi Gawat Darurat (IGD) Rumah Sakit terdekat** atau hubungi panggilan darurat medis 119.\n\n" +
      "Jangan menunggu jadwal antrean atau proses rujukan digital saat kondisi kritis.";

    const rsOnly = availableFacilities.filter((f) => f.type === "rumah_sakit");
    if (rsOnly.length > 0) {
      const rankedRS = rankFacilities(rsOnly, {
        preferredType: "rumah_sakit",
        userCity: context.city,
        userDistrict: context.district,
      });
      recommendations = buildFacilityRecommendations(rankedRS, 2, context);
    }

    return {
      success: true,
      message: replyText,
      recommendations,
      suggestions: ["Cari IGD RS Terdekat", "Nomor Darurat 119"],
    };
  }

  // 2. Kueri Fasilitas atau Dokter
  const preferredType = detectPreferredFacilityType(input);
  const isAskingFacility =
    Boolean(preferredType) ||
    lowerInput.includes("faskes") ||
    lowerInput.includes("cari") ||
    lowerInput.includes("rekomendasi") ||
    lowerInput.includes("dokter") ||
    lowerInput.includes("dekat");

  if (isAskingFacility || availableFacilities.length > 0) {
    const ranked = rankFacilities(availableFacilities, {
      query: input,
      preferredType,
      userCity: context.city,
      userDistrict: context.district,
      userProvince: context.province,
    });

    recommendations = buildFacilityRecommendations(ranked, 3, context);

    if (context.role === "landing") {
      replyText =
        "Tera telah mencarikan fasilitas kesehatan aktif di platform Lytera yang paling relevan dengan kebutuhanmu. " +
        "Untuk mendaftar, menerbitkan rujukan, atau mengakses rekam medis digital terpadu, kamu dapat membuat akun secara mandiri.";
    } else if (context.role === "pasien") {
      const subjek = context.selectedFamilyMemberName
        ? `untuk anggota keluarga **${context.selectedFamilyMemberName}**`
        : "berdasarkan lokasi domisili terdaftarmu";
      replyText =
        `Berikut adalah fasilitas kesehatan aktif terdekat ${subjek} di sistem Lytera. ` +
        "Kamu dapat mengunjungi faskes primer terlebih dahulu untuk konsultasi dan penerbitan rujukan digital bila diperlukan tindakan spesialis.";
    } else if (context.role === "dokter" || context.role === "puskesmas" || context.role === "klinik") {
      replyText =
        "Berikut rekomendasi rumah sakit rujukan aktif di sistem Lytera yang dapat dituju. " +
        "Silakan buka menu **Buat Rujukan** pada bilah navigasi untuk melengkapi formulir klinis dan diagnosis ICD-10.";
    } else {
      replyText =
        "Berikut data fasilitas kesehatan aktif di Lytera yang sesuai dengan kueri pencarian.";
    }
  }

  // 3. Kueri Panduan Alur / Token
  if (!replyText) {
    if (lowerInput.includes("token") || lowerInput.includes("izin") || lowerInput.includes("kode")) {
      replyText =
        "🔐 **Kode Izin Akses Rekam Medis (UU PDP)**\n\n" +
        "Di Lytera, dokter tidak dapat membuka rekam medis tanpa izin pasien. " +
        "Pasien dapat membuat kode izin 6 digit di menu **Izin Akses**. " +
        "Kode ini berlaku selama 60 menit dan hanya dapat digunakan oleh dokter yang sedang memeriksa. Pasien juga dapat mencabut izin kapan saja.";
    } else if (lowerInput.includes("alur") || lowerInput.includes("cara kerja") || lowerInput.includes("rujukan")) {
      replyText =
        "📋 **Alur Rujukan Digital Berjenjang Lytera:**\n\n" +
        "1. **Pemeriksaan di Faskes Primer**: Dokter di Puskesmas atau Klinik memeriksa pasien dan menerbitkan surat rujukan digital.\n" +
        "2. **Penerimaan di Rumah Sakit**: Rumah Sakit rujukan memverifikasi berkas klinis dan menentukan jadwal periksa dokter spesialis.\n" +
        "3. **Pemeriksaan Lanjutan**: Pasien datang sesuai jadwal dan membagikan kode izin 6 digit untuk akses rekam medis.\n" +
        "4. **Resume Medis Kembali**: Hasil tindakan klinis dikirimkan kembali ke faskes perujuk secara terintegrasi.";
    } else {
      replyText =
        `Halo! Saya **Tera**, asisten digital resmi Lytera. ` +
        `Saya siap membantu mencari informasi fasilitas kesehatan aktif, dokter spesialis, alur rujukan berjenjang, dan panduan otorisasi rekam medis berizin pasien. ` +
        `Ada yang bisa Tera bantu?`;
    }
  }

  return {
    success: true,
    message: replyText,
    recommendations: recommendations.length > 0 ? recommendations : undefined,
    suggestions,
  };
}

/**
 * Main engine Tera yang mengorkestrasi Groq API dengan context builder dan controlled data tools.
 */
export async function executeTeraChat(request: TeraChatRequest): Promise<TeraChatResponse> {
  const { messages, context, userInput } = request;
  const groqApiKey = process.env.GROQ_API_KEY?.trim();
  const groqModel = process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";

  // 1. Ambil data fasilitas aktif nyata dari Lytera via RPC resmi
  const preferredType = detectPreferredFacilityType(userInput);
  const activeFacilities = await searchActiveFacilities({
    type: preferredType || null,
    limit: 20,
  });

  // Ranking awal fasilitas untuk kandidat rekomendasi
  const rankedFacilities = rankFacilities(activeFacilities, {
    query: userInput,
    preferredType,
    userCity: context.city,
    userDistrict: context.district,
    userProvince: context.province,
  });

  // 2. Jika tidak ada API key atau format key bukan gsk_ (misalnya placeholder atau xai-), gunakan fallback cerdas
  if (!groqApiKey || !groqApiKey.startsWith("gsk_")) {
    return generateFallbackResponse(userInput, context, activeFacilities);
  }

  // 3. Bangun System Prompt yang kuat & role-aware
  const systemPrompt = buildSystemPrompt(context);

  // Lampirkan konteks fasilitas nyata yang tersedia ke prompt model agar tidak halusinasi
  const facilitiesSummary = activeFacilities.slice(0, 8).map((f) => ({
    id: f.id,
    nama: f.name,
    jenis: f.type,
    wilayah: `${f.district || ""}, ${f.city || ""}`.trim(),
  }));

  const dataContextMessage =
    `DATA FASILITAS AKTIF DI PLATFORM LYTERA SAAT INI (GUNAKAN HANYA DATA INI, JANGAN MENGARANG NAMA FASKES/DOKTER LAIN):\n` +
    JSON.stringify(facilitiesSummary, null, 2);

  const formattedMessages = [
    { role: "system", content: systemPrompt },
    { role: "system", content: dataContextMessage },
    ...messages.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: groqModel,
        messages: formattedMessages,
        temperature: 0.3, // Rendah untuk kepatuhan fakta & guardrails
        max_tokens: 800,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[Tera] Groq API returned status ${res.status}. Memakai intelligent fallback.`);
      return generateFallbackResponse(userInput, context, activeFacilities);
    }

    const data = await res.json();
    const replyContent: string = data.choices?.[0]?.message?.content || "";

    if (!replyContent) {
      return generateFallbackResponse(userInput, context, activeFacilities);
    }

    // Bangun rekomendasi kartu bila relevan
    const isAskingFacility =
      Boolean(preferredType) ||
      userInput.toLowerCase().includes("faskes") ||
      userInput.toLowerCase().includes("rumah sakit") ||
      userInput.toLowerCase().includes("puskesmas") ||
      userInput.toLowerCase().includes("klinik") ||
      userInput.toLowerCase().includes("cari");

    const recommendations = isAskingFacility
      ? buildFacilityRecommendations(rankedFacilities, 3, context)
      : undefined;

    return {
      success: true,
      message: replyContent,
      recommendations,
      suggestions: getQuickSuggestions(context),
    };
  } catch (err) {
    console.warn("[Tera] Error calling Groq API:", err);
    return generateFallbackResponse(userInput, context, activeFacilities);
  }
}
