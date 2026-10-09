import {
  TetraChatRequest,
  TetraChatResponse,
  TetraRecommendation,
  TetraUserContext,
} from "./types";
import { classifyTetraIntent } from "./router";
import { buildSystemPrompt, getQuickSuggestions } from "./context";
import {
  searchActiveFacilities,
  searchAllActiveDoctors,
  rankFacilities,
  buildFacilityRecommendations,
  buildDoctorRecommendations,
  FacilityCandidate,
} from "./tools";
import { formatFacilityLocation } from "@/lib/region-utils";

/**
 * Fallback Generator berbasis Intent yang cerdas, faktual, dan patuh guardrails.
 */
async function generateIntentResponse(
  input: string,
  context: TetraUserContext,
  availableFacilities: FacilityCandidate[]
): Promise<TetraChatResponse> {
  const match = classifyTetraIntent(input);
  const intent = match.intent;
  const suggestions = getQuickSuggestions(context);

  // =========================================================================
  // 1. INTENT: KONDISI DARURAT MEDIS (EMERGENCY)
  // =========================================================================
  if (intent === "emergency") {
    const rsOnly = availableFacilities.filter((f) => f.type === "rumah_sakit");
    const rankedRS = rankFacilities(rsOnly, {
      preferredType: "rumah_sakit",
      userCity: context.city,
      userDistrict: context.district,
    });
    const recommendations = buildFacilityRecommendations(rankedRS, 2, context);

    return {
      success: true,
      intent: "emergency",
      message:
        "⚠️ **PERINGATAN KONDISI DARURAT MEDIS**\n\n" +
        "Keluhan yang kamu sebutkan berpotensi merupakan kondisi gawat darurat yang memerlukan penanganan medis segera. " +
        "Mohon segera bawa pasien ke **Instalasi Gawat Darurat (IGD) Rumah Sakit terdekat** atau hubungi nomor darurat medis **119**.\n\n" +
        "Jangan menunggu antrean atau pengajuan rujukan digital biasa.",
      recommendations,
      suggestions: ["Cari IGD RS Terdekat", "Nomor Darurat 119"],
    };
  }

  // =========================================================================
  // 2. INTENT: IDENTITAS DIRI (IDENTITY)
  // =========================================================================
  if (intent === "identity") {
    if (context.role === "landing") {
      return {
        success: true,
        intent: "identity",
        message:
          "Karena kamu saat ini sedang berada di halaman beranda dan **belum masuk (login)** ke platform Lytera, Tetra belum mengetahui nama atau identitasmu.\n\n" +
          "Jika kamu sudah memiliki akun, silakan klik tombol **Masuk** di pojok kanan atas, atau pilih **Daftar** untuk membuat akun baru sesuai peranmu (Pasien, Fasilitas Kesehatan, atau Verifikator).",
        recommendations: undefined, // TIDAK memunculkan faskes
        suggestions,
      };
    }

    const roleLabel =
      context.role === "pasien"
        ? context.subRole === "keluarga"
          ? "Pasien Keluarga"
          : "Pasien Mandiri"
        : context.role === "dokter"
        ? "Dokter / Tenaga Medis"
        : context.role === "verifikator"
        ? "Petugas Verifikator"
        : context.role === "dinkes"
        ? "Dinas Kesehatan"
        : "Pengguna Terdaftar";

    return {
      success: true,
      intent: "identity",
      message:
        `Kamu saat ini terdaftar dan masuk sebagai **${context.fullName || "Pengguna"}** dengan peran **${roleLabel}** di Lytera.\n\n` +
        (context.facilityName ? `Bertugas di fasilitas: **${context.facilityName}**.\n` : "") +
        (context.district || context.city ? `Wilayah: ${[context.district, context.city].filter(Boolean).join(", ")}.` : ""),
      recommendations: undefined,
      suggestions,
    };
  }

  // =========================================================================
  // 3. INTENT: IZIN AKSES / TOKEN 6 DIGIT (TOKEN_ACCESS)
  // =========================================================================
  if (intent === "token_access") {
    return {
      success: true,
      intent: "token_access",
      message:
        "🔐 **Kode Izin Akses Rekam Medis 6 Digit (UU PDP)**\n\n" +
        "Di Lytera, dokter dan rumah sakit tidak dapat membuka riwayat medis tanpa persetujuan pasien. Mekanisme ini dirancang sesuai mandat UU Perlindungan Data Pribadi:\n\n" +
        "1. **Dibuat Mandiri**: Pasien membuat kode 6 digit di menu **Izin Akses**.\n" +
        "2. **Berlaku 60 Menit**: Kode memiliki hitung mundur aktif 60 menit dan otomatis hangus setelah waktu habis.\n" +
        "3. **Batas Percobaan**: Maksimal 5 kali salah input sebelum token terkunci demi keamanan.\n" +
        "4. **Dapat Dicabut Sewaktu-waktu**: Pasien memiliki hak penuh untuk mencabut izin akses kapan saja melalui tombol *Cabut Izin*.",
      recommendations: undefined, // TIDAK memunculkan faskes
      suggestions,
    };
  }

  // =========================================================================
  // 4. INTENT: ALUR RUJUKAN LYTERA (REFERRAL_FLOW)
  // =========================================================================
  if (intent === "referral_flow") {
    return {
      success: true,
      intent: "referral_flow",
      message:
        "📋 **Alur Rujukan Digital Berjenjang di Lytera:**\n\n" +
        "1. **Pemeriksaan di Faskes Primer**: Dokter di Puskesmas atau Klinik memeriksa pasien, mengisi anamnesis klinis, dan menerbitkan rujukan digital ke Rumah Sakit tujuan.\n" +
        "2. **Verifikasi & Penjadwalan RS**: Rumah Sakit tujuan menerima berkas rujukan secara real-time dan menetapkan jadwal pemeriksaan dokter spesialis.\n" +
        "3. **Pemeriksaan Lanjutan Berizin Pasien**: Pasien datang ke RS sesuai jadwal dan membagikan kode izin 6 digit agar dokter spesialis dapat membuka rekam medis.\n" +
        "4. **Resume Medis Terpadu**: Setelah selesai, resume tindakan otomatis terhubung kembali ke faskes perujuk.",
      recommendations: undefined, // TIDAK memunculkan faskes
      suggestions,
    };
  }

  // =========================================================================
  // 5. INTENT: REKAM MEDIS (MEDICAL_RECORD)
  // =========================================================================
  if (intent === "medical_record") {
    return {
      success: true,
      intent: "medical_record",
      message:
        "📁 **Rekam Medis Digital Terpadu Lytera**\n\n" +
        "Seluruh catatan medis, diagnosa ICD-10, dan resume tindakan tersimpan secara aman dan terenkripsi.\n\n" +
        "• Pasien dapat meninjau riwayat kunjungan dan daftar faskes yang pernah memeriksa di tab **Riwayat Medis**.\n" +
        "• Dokter pemeriksa hanya dapat membuka rekam medis jika memiliki kode izin 6 digit yang masih aktif dari pasien.\n" +
        "• Setiap akses rekam medis tercatat secara transparan di log audit akses.",
      recommendations: undefined,
      suggestions,
    };
  }

  // =========================================================================
  // 6. INTENT: PENJAMIN & VERIFIKASI ADMINISTRASI (PAYER_VERIFICATION)
  // =========================================================================
  if (intent === "payer_verification") {
    return {
      success: true,
      intent: "payer_verification",
      message:
        "💳 **Penjamin Biaya & Verifikasi Administrasi**\n\n" +
        "Di Lytera, pasien dapat memilih jenis penjamin pembiayaan kesehatan:\n" +
        "• **Mandiri / Umum** (Default)\n" +
        "• **BPJS Kesehatan**\n" +
        "• **Asuransi Swasta**\n" +
        "• **Jaminan Daerah / Kurang Mampu (SKTM)**\n\n" +
        "Verifikasi domisili dan jaminan daerah dilakukan oleh petugas verifikator kelurahan/kecamatan/dinas sosial dan **bersifat opsional** sehingga tidak pernah menghambat proses rujukan medis.",
      recommendations: undefined,
      suggestions,
    };
  }

  // =========================================================================
  // 7. INTENT: INFORMASI UMUM LYTERA (GENERAL_INFO)
  // =========================================================================
  if (intent === "general_info") {
    return {
      success: true,
      intent: "general_info",
      message:
        "✨ **Lytera — Sistem Digital Rujukan & Rekam Medis Terpadu**\n\n" +
        "Lytera menghubungkan pasien, puskesmas, klinik, rumah sakit, apotek, dan dinas kesehatan dalam satu ekosistem rujukan berjenjang yang aman dan patuh UU Perlindungan Data Pribadi.\n\n" +
        "Saya **Tetra**, asisten AI resmi Lytera. Saya siap membantu mencari fasilitas rujukan, dokter spesialis, serta menjawab alur rujukan digital.",
      recommendations: undefined,
      suggestions,
    };
  }

  // =========================================================================
  // 8. INTENT: PENCARIAN DOKTER / SPESIALIS (SEARCH_DOCTOR)
  // =========================================================================
  if (intent === "search_doctor") {
    const { searchDoctorsWithLocationHierarchy } = await import("./tools");
    const searchResult = await searchDoctorsWithLocationHierarchy({
      specialization: match.targetSpecialization,
      location: match.targetLocation,
      userCity: context.city,
      userDistrict: context.district,
      query: match.extractedQuery,
    });

    const requestedSpec = match.targetSpecialization;
    const requestedLoc = match.targetLocation;

    // KASUS 1: Ada kecocokan dokter di wilayah yang diminta
    if (searchResult.exactMatches.length > 0) {
      const recommendations = buildDoctorRecommendations(searchResult.exactMatches, 3);
      
      const msg = requestedLoc
        ? `Berikut adalah dokter aktif${requestedSpec ? ` spesialis **${requestedSpec}**` : ""} di wilayah **${requestedLoc}**:`
        : `Berikut adalah dokter aktif${requestedSpec ? ` spesialis **${requestedSpec}**` : ""} yang terdaftar di platform Lytera:`;

      return {
        success: true,
        intent: "search_doctor",
        message: msg,
        recommendations,
        suggestions,
      };
    }

    // KASUS 2: Pengguna meminta lokasi tertentu, tidak ditemukan di wilayah itu, tetapi ada di wilayah lain
    if (requestedLoc && searchResult.broaderMatches.length > 0) {
      const recommendations = buildDoctorRecommendations(searchResult.broaderMatches, 3);
      const availableLocations = Array.from(
        new Set(searchResult.broaderMatches.map((d) => d.city).filter(Boolean))
      ).join(", ");

      const msg =
        `Tidak ditemukan data dokter aktif${requestedSpec ? ` spesialis **${requestedSpec}**` : ""} yang bertugas di wilayah **${requestedLoc}** pada sistem Lytera.\n\n` +
        `Sebagai alternatif faskes rujukan di wilayah lain${availableLocations ? ` (${availableLocations})` : ""}, berikut dokter spesialis terverifikasi yang tersedia:`;

      return {
        success: true,
        intent: "search_doctor",
        message: msg,
        recommendations,
        suggestions,
      };
    }

    // KASUS 3: Spesialisasi yang dicari memang belum ada di basis data Lytera
    if (requestedSpec) {
      let msg = requestedLoc
        ? `Saat ini belum ditemukan dokter spesialis **${requestedSpec}** di wilayah **${requestedLoc}** maupun di fasilitas terdaftar lainnya pada basis data sistem Lytera.\n\n`
        : `Saat ini belum ada dokter aktif dengan spesialisasi **${requestedSpec}** yang terdaftar di basis data sistem Lytera.\n\n`;

      msg +=
        `Untuk penanganan keluhan medis terkait, Tetra menyarankan untuk mengunjungi Rumah Sakit rujukan terdekat atau berkonsultasi ke faskes primer terdekat (Puskesmas/Klinik) terlebih dahulu guna evaluasi awal.`;

      const rsOnly = availableFacilities.filter((f) => f.type === "rumah_sakit");
      const rsRecs = rsOnly.length > 0
        ? buildFacilityRecommendations(rankFacilities(rsOnly, { targetLocation: requestedLoc, userCity: context.city }), 2, context)
        : undefined;

      return {
        success: true,
        intent: "search_doctor",
        message: msg,
        recommendations: rsRecs,
        suggestions,
      };
    }

    // KASUS 4: Pencarian dokter umum / kriteria lain tidak menghasilkan data
    return {
      success: true,
      intent: "search_doctor",
      message:
        `Saat ini belum ada dokter aktif dengan kriteria yang dicari di database sistem Lytera. ` +
        `Tetra menyarankan untuk memeriksa fasilitas Rumah Sakit rujukan yang tersedia.`,
      recommendations: undefined,
      suggestions,
    };
  }

  // =========================================================================
  // 9. INTENT: PENCARIAN RUMAH SAKIT RUJUKAN (SEARCH_REFERRAL_HOSPITAL)
  // =========================================================================
  if (intent === "search_referral_hospital") {
    const rsOnly = availableFacilities.filter((f) => f.type === "rumah_sakit");
    const rankedRS = rankFacilities(rsOnly, {
      preferredType: "rumah_sakit",
      query: match.extractedQuery,
      userCity: context.city,
      userDistrict: context.district,
      userProvince: context.province,
    });
    const recommendations = buildFacilityRecommendations(rankedRS, 3, context);

    let prefixMessage = "Berikut adalah Rumah Sakit rujukan aktif di sistem Lytera:";
    if (context.role === "landing" && !context.city) {
      prefixMessage =
        "Berikut Rumah Sakit rujukan aktif yang terdaftar di Lytera. " +
        "Kamu juga dapat menyebutkan kota atau kecamatan tempat tinggalmu untuk rekomendasi yang lebih spesifik:";
    } else if (context.role === "dokter" || context.role === "puskesmas") {
      prefixMessage =
        "Berikut Rumah Sakit rujukan lanjutan aktif yang dapat dituju. " +
        "Silakan gunakan menu **Buat Rujukan** untuk melengkapi diagnosa ICD-10 pasien:";
    }

    return {
      success: true,
      intent: "search_referral_hospital",
      message: prefixMessage,
      recommendations,
      suggestions,
    };
  }

  // =========================================================================
  // 10. INTENT: PENCARIAN POLI / FASILITAS (SEARCH_POLI / SEARCH_FACILITY)
  // =========================================================================
  if (intent === "search_poli" || intent === "search_facility") {
    const ranked = rankFacilities(availableFacilities, {
      preferredType: match.targetType,
      query: match.extractedQuery,
      userCity: context.city,
      userDistrict: context.district,
      userProvince: context.province,
    });
    const recommendations = buildFacilityRecommendations(ranked, 3, context);

    let replyMsg = "Berikut fasilitas kesehatan aktif di Lytera yang sesuai dengan pencarianmu:";
    if (context.role === "landing" && !context.city) {
      replyMsg =
        "Berikut fasilitas kesehatan aktif yang terdaftar di Lytera. " +
        "Sebutkan nama kecamatan atau kota tempat tinggalmu agar Tetra dapat mencocokkan faskes yang paling dekat dengan lokasimu:";
    }

    return {
      success: true,
      intent,
      message: replyMsg,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
      suggestions,
    };
  }

  // =========================================================================
  // 11. INTENT: UNSUPPORTED / SALAM PEMBUKA
  // =========================================================================
  return {
    success: true,
    intent: "unsupported",
    message:
      `Halo! Saya **Tetra**, asisten digital resmi Lytera. ` +
      `Saya siap membantu mencari informasi fasilitas kesehatan aktif, dokter spesialis, alur rujukan berjenjang, dan panduan izin akses rekam medis. ` +
      `Ada yang bisa Tetra bantu?`,
    recommendations: undefined, // JANGAN MEMASUKKAN REKOMENDASI FASILITAS UNTUK SALAM UMUM
    suggestions,
  };
}

/**
 * Main engine Tetra yang mengorkestrasi intent routing, Groq LLM, data tools Lytera, dan fallback.
 */
export async function executeTetraChat(request: TetraChatRequest): Promise<TetraChatResponse> {
  const { messages, context, userInput } = request;
  const groqApiKey = process.env.GROQ_API_KEY?.trim();
  const groqModel = process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";

  // 1. Klasifikasi Intent terlebih dahulu
  const intentMatch = classifyTetraIntent(userInput);

  // 2. Ambil data fasilitas aktif nyata dari Lytera via RPC resmi
  const activeFacilities = await searchActiveFacilities({
    type: intentMatch.targetType || null,
    limit: 20,
  });

  // 3. Jika API key Groq tidak tersedia atau formatnya bukan gsk_, gunakan deterministic intent engine
  if (!groqApiKey || !groqApiKey.startsWith("gsk_")) {
    return generateIntentResponse(userInput, context, activeFacilities);
  }

  // 4. Jika intent adalah informational murni (identity, token, referral flow, medical record, general info),
  // gunakan intent handler langsung agar akurat dan konsisten tanpa halusinasi kartu faskes
  if (
    intentMatch.intent === "identity" ||
    intentMatch.intent === "token_access" ||
    intentMatch.intent === "referral_flow" ||
    intentMatch.intent === "medical_record" ||
    intentMatch.intent === "payer_verification"
  ) {
    return generateIntentResponse(userInput, context, activeFacilities);
  }

  // 5. Panggilan ke Groq LLM untuk natural language reasoning
  const systemPrompt = buildSystemPrompt(context);

  const facilitiesSummary = activeFacilities.slice(0, 8).map((f) => ({
    id: f.id,
    nama: f.name,
    jenis: f.type,
    wilayah: formatFacilityLocation({ district: f.district, city: f.city }),
  }));

  const allActiveDoctors = await searchAllActiveDoctors();
  const doctorsSummary = allActiveDoctors.map((d) => ({
    nama: d.full_name,
    spesialisasi: d.specialization || "Dokter Umum",
    fasilitas: d.facility_name,
    wilayah: formatFacilityLocation({ district: d.district, city: d.city }),
  }));

  const dataContextMessage =
    `DATA RESMI AKTIF DI PLATFORM LYTERA SAAT INI (GUNAKAN HANYA DATA INI, JANGAN MENGARANG NAMA FASKES/DOKTER LAIN):\n\n` +
    `Fasilitas Kesehatan Terdaftar:\n` +
    JSON.stringify(facilitiesSummary, null, 2) +
    `\n\nDokter Spesialis Terverifikasi:\n` +
    JSON.stringify(doctorsSummary, null, 2);

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
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: groqModel,
        messages: formattedMessages,
        temperature: 0.3,
        max_tokens: 800,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[Tetra] Groq API returned status ${res.status}. Menggunakan intent engine.`);
      return generateIntentResponse(userInput, context, activeFacilities);
    }

    const data = await res.json();
    const replyContent: string = data.choices?.[0]?.message?.content || "";

    if (!replyContent) {
      return generateIntentResponse(userInput, context, activeFacilities);
    }

    // Bangun kartu rekomendasi HANYA JIKA intent memang pencarian atau emergency
    let recommendations: TetraRecommendation[] | undefined = undefined;

    if (intentMatch.intent === "search_doctor") {
      const { searchDoctorsWithLocationHierarchy } = await import("./tools");
      const searchResult = await searchDoctorsWithLocationHierarchy({
        specialization: intentMatch.targetSpecialization,
        location: intentMatch.targetLocation,
        userCity: context.city,
        userDistrict: context.district,
        query: intentMatch.extractedQuery,
      });

      const candidates =
        searchResult.exactMatches.length > 0
          ? searchResult.exactMatches
          : searchResult.broaderMatches;

      recommendations = candidates.length > 0 ? buildDoctorRecommendations(candidates, 3) : undefined;
    } else if (
      intentMatch.intent === "search_referral_hospital" ||
      intentMatch.intent === "search_facility" ||
      intentMatch.intent === "search_poli" ||
      intentMatch.intent === "emergency"
    ) {
      const ranked = rankFacilities(activeFacilities, {
        preferredType: intentMatch.targetType,
        query: intentMatch.extractedQuery,
        targetLocation: intentMatch.targetLocation,
        userCity: context.city,
        userDistrict: context.district,
        userProvince: context.province,
      });
      recommendations = buildFacilityRecommendations(ranked, 3, context);
    }

    return {
      success: true,
      intent: intentMatch.intent,
      message: replyContent,
      recommendations,
      suggestions: getQuickSuggestions(context),
    };
  } catch (err) {
    console.warn("[Tetra] Error calling Groq API:", err);
    return generateIntentResponse(userInput, context, activeFacilities);
  }
}
