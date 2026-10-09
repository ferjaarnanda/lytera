import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";
import { TetraRecommendation, TetraUserContext } from "./types";
import { formatFacilityLocation, resolveRegionName } from "@/lib/region-utils";

interface TetraRpcDoctorRow {
  staff_id: string;
  full_name: string;
  specialization: string | null;
  facility_id?: string;
  facility_name?: string;
  facility_type?: string;
  city?: string | null;
  district?: string | null;
}

interface TetraRpcFacilityRow {
  id: string;
  name: string;
  type: "puskesmas" | "klinik" | "rumah_sakit" | "apotek";
  city: string | null;
  district: string | null;
}

interface TetraRpcDatabase {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: {
      list_active_facilities: {
        Args: {
          p_type?: "puskesmas" | "klinik" | "rumah_sakit" | "apotek" | null;
          p_query?: string | null;
          p_limit?: number;
        };
        Returns: TetraRpcFacilityRow[];
      };
      get_active_facility_doctors: {
        Args: {
          p_facility_id: string;
        };
        Returns: TetraRpcDoctorRow[];
      };
      list_active_doctors: {
        Args: {
          p_facility_id: string;
        };
        Returns: TetraRpcDoctorRow[];
      };
    };
  };
}

let cachedClient: SupabaseClient<TetraRpcDatabase> | null = null;

function getClient(): SupabaseClient<TetraRpcDatabase> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Variabel NEXT_PUBLIC_SUPABASE_URL atau NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY belum disetel");
  }
  if (!cachedClient) {
    cachedClient = createSupabaseClient<TetraRpcDatabase>(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        fetch: (input, init) => {
          return fetch(input, {
            ...init,
            signal: init?.signal || AbortSignal.timeout(6000),
          });
        },
      },
    });
  }
  return cachedClient;
}



export interface FacilityCandidate {
  id: string;
  name: string;
  type: "puskesmas" | "klinik" | "rumah_sakit" | "apotek";
  city: string | null;
  district: string | null;
  province?: string | null;
}

export interface DoctorCandidate {
  staff_id: string;
  full_name: string;
  specialization: string | null;
  facility_id: string;
  facility_name?: string;
  facility_type?: string;
  city?: string | null;
  district?: string | null;
}

/**
 * Mencari fasilitas kesehatan aktif di Lytera melalui RPC resmi list_active_facilities.
 */
export async function searchActiveFacilities(options: {
  type?: "puskesmas" | "klinik" | "rumah_sakit" | "apotek" | null;
  query?: string | null;
  limit?: number;
}): Promise<FacilityCandidate[]> {
  try {
    const supabase = await getClient();
    const { data, error } = await supabase.rpc("list_active_facilities", {
      p_type: options.type || null,
      p_query: options.query || null,
      p_limit: options.limit || 20,
    });

    if (error) {
      console.warn("[Tetra] Gagal memanggil list_active_facilities:", error.message);
      return [];
    }

    if (!Array.isArray(data)) return [];
    return data as FacilityCandidate[];
  } catch (err) {
    console.warn("[Tetra] Error searchActiveFacilities:", err);
    return [];
  }
}

/**
 * Mencari dokter aktif di fasilitas tertentu melalui RPC get_active_facility_doctors.
 */
export async function searchActiveDoctors(facilityId: string): Promise<DoctorCandidate[]> {
  try {
    const supabase = await getClient();
    const { data, error } = await supabase.rpc("get_active_facility_doctors", {
      p_facility_id: facilityId,
    });

    if (error) {
      // Fallback ke list_active_doctors jika get_active_facility_doctors tidak tersedia
      const { data: fallbackData } = await supabase.rpc("list_active_doctors", {
        p_facility_id: facilityId,
      });
      if (Array.isArray(fallbackData)) {
        return fallbackData.map((d: { staff_id: string; full_name: string; specialization: string | null }) => ({
          staff_id: d.staff_id,
          full_name: d.full_name,
          specialization: d.specialization,
          facility_id: facilityId,
        }));
      }
      return [];
    }

    if (!Array.isArray(data)) return [];
    return data.map((d: TetraRpcDoctorRow) => ({
      staff_id: d.staff_id,
      full_name: d.full_name,
      specialization: d.specialization,
      facility_id: d.facility_id || facilityId,
      facility_name: d.facility_name || "",
      facility_type: d.facility_type || "",
      city: d.city || null,
      district: d.district || null,
    }));
  } catch (err) {
    console.warn("[Tetra] Error searchActiveDoctors:", err);
    return [];
  }
}

/**
 * Mencari semua dokter aktif di seluruh faskes aktif (dengan mencari faskes lalu mengambil dokternya).
 */
export async function searchAllActiveDoctors(options?: {
  specialization?: string;
  query?: string;
}): Promise<DoctorCandidate[]> {
  const facilities = await searchActiveFacilities({ limit: 20 });
  const allDoctors: DoctorCandidate[] = [];

  for (const fac of facilities) {
    const doctors = await searchActiveDoctors(fac.id);
    for (const doc of doctors) {
      doc.facility_name = fac.name;
      doc.facility_type = fac.type;
      doc.city = doc.city || fac.city;
      doc.district = doc.district || fac.district;
      allDoctors.push(doc);
    }
  }

  let filtered = allDoctors;
  if (options?.specialization) {
    const specLower = options.specialization.toLowerCase();
    filtered = filtered.filter((d) => d.specialization?.toLowerCase().includes(specLower));
  }
  if (options?.query) {
    const qLower = options.query.toLowerCase();
    filtered = filtered.filter(
      (d) =>
        d.full_name.toLowerCase().includes(qLower) ||
        (d.specialization && d.specialization.toLowerCase().includes(qLower)) ||
        (d.facility_name && d.facility_name.toLowerCase().includes(qLower))
    );
  }

  return filtered;
}

export interface DoctorHierarchySearchResult {
  exactMatches: DoctorCandidate[];
  broaderMatches: DoctorCandidate[];
  allSpecialtyMatches: DoctorCandidate[];
  requestedSpecialization?: string;
  requestedLocation?: string;
}

/**
 * Pencarian dokter cerdas bertingkat:
 * 1. Wilayah spesifik yang diminta (kecamatan / kota)
 * 2. Jika tidak ada di wilayah tersebut, cari alternatif di wilayah lain yang tersedia
 * 3. Menghormati spesialisasi terverifikasi
 */
export async function searchDoctorsWithLocationHierarchy(options: {
  specialization?: string;
  location?: string;
  userCity?: string | null;
  userDistrict?: string | null;
  query?: string;
}): Promise<DoctorHierarchySearchResult> {
  let nameQuery = options.query;
  if (nameQuery) {
    const qLower = nameQuery.toLowerCase();
    if (
      qLower.includes("cari") ||
      qLower.includes("dokter") ||
      qLower.includes("spesialis") ||
      options.specialization
    ) {
      nameQuery = undefined;
    }
  }

  const allDoctors = await searchAllActiveDoctors({
    specialization: options.specialization,
    query: nameQuery,
  });

  const reqLoc = (options.location || "").toLowerCase().trim();
  const userCity = (options.userCity || "").toLowerCase().trim();
  const userDistrict = (options.userDistrict || "").toLowerCase().trim();

  if (reqLoc) {
    // Filter kandidat yang cocok dengan nama lokasi pencarian (di city atau district)
    const matched = allDoctors.filter((d) => {
      const cityLower = (d.city || "").toLowerCase();
      const distLower = (d.district || "").toLowerCase();
      return (
        cityLower.includes(reqLoc) ||
        reqLoc.includes(cityLower) ||
        distLower.includes(reqLoc) ||
        reqLoc.includes(distLower)
      );
    });

    if (matched.length > 0) {
      return {
        exactMatches: matched,
        broaderMatches: [],
        allSpecialtyMatches: allDoctors,
        requestedSpecialization: options.specialization,
        requestedLocation: options.location,
      };
    } else {
      // Tidak ditemukan di lokasi yang diminta, sediakan kandidat di wilayah lain sebagai broaderMatches
      return {
        exactMatches: [],
        broaderMatches: allDoctors,
        allSpecialtyMatches: allDoctors,
        requestedSpecialization: options.specialization,
        requestedLocation: options.location,
      };
    }
  }

  // Jika tidak menyebutkan lokasi spesifik di pesan, tetapi user login memiliki data domisili
  if (userCity || userDistrict) {
    const userLocalDoctors = allDoctors.filter((d) => {
      const cityLower = (d.city || "").toLowerCase();
      const distLower = (d.district || "").toLowerCase();
      const cityMatch = userCity && (cityLower.includes(userCity) || userCity.includes(cityLower));
      const distMatch = userDistrict && (distLower.includes(userDistrict) || userDistrict.includes(distLower));
      return cityMatch || distMatch;
    });

    const otherDoctors = allDoctors.filter((d) => !userLocalDoctors.includes(d));

    return {
      exactMatches: userLocalDoctors.length > 0 ? userLocalDoctors : allDoctors,
      broaderMatches: userLocalDoctors.length > 0 ? otherDoctors : [],
      allSpecialtyMatches: allDoctors,
      requestedSpecialization: options.specialization,
      requestedLocation: options.userCity || options.userDistrict || undefined,
    };
  }

  return {
    exactMatches: allDoctors,
    broaderMatches: [],
    allSpecialtyMatches: allDoctors,
    requestedSpecialization: options.specialization,
  };
}

/**
 * Sistem ranking kandidat fasilitas kesehatan berdasarkan:
 * 1. Kecocokan kebutuhan / keluhan / jenis faskes
 * 2. Tingkat faskes yang tepat
 * 3. Kedekatan wilayah (Kecamatan -> Kabupaten/Kota -> Provinsi)
 */
export function rankFacilities(
  facilities: FacilityCandidate[],
  criteria: {
    query?: string;
    preferredType?: "puskesmas" | "klinik" | "rumah_sakit" | "apotek";
    targetLocation?: string | null;
    userCity?: string | null;
    userDistrict?: string | null;
    userProvince?: string | null;
  }
): Array<{ facility: FacilityCandidate; score: number; relevanceReason: string }> {
  const q = (criteria.query || "").toLowerCase();
  const targetLoc = (criteria.targetLocation || "").toLowerCase().trim();
  const targetCity = (criteria.userCity || "").toLowerCase().trim();
  const targetDistrict = (criteria.userDistrict || "").toLowerCase().trim();

  return facilities
    .map((fac) => {
      let score = 50;
      const reasons: string[] = [];

      // 1. Tipe Faskes
      if (criteria.preferredType) {
        if (fac.type === criteria.preferredType) {
          score += 40;
          const labelType =
            fac.type === "rumah_sakit"
              ? "Rumah Sakit Rujukan"
              : fac.type === "puskesmas"
              ? "Faskes Primer (Puskesmas)"
              : fac.type === "klinik"
              ? "Klinik Pratama"
              : "Apotek";
          reasons.push(`Sesuai jenis fasilitas ${labelType}`);
        } else {
          score -= 10;
        }
      }

      // 2. Kecocokan Nama / Kata Kunci
      if (q) {
        const facNameLower = fac.name.toLowerCase();
        if (facNameLower.includes(q)) {
          score += 30;
          reasons.push("Nama fasilitas cocok dengan kata kunci pencarian");
        }
      }

      // 3. Hirarki Wilayah
      const facDistrict = (fac.district || "").toLowerCase().trim();
      const facCity = (fac.city || "").toLowerCase().trim();

      if (targetLoc) {
        if (facCity.includes(targetLoc) || targetLoc.includes(facCity) || facDistrict.includes(targetLoc) || targetLoc.includes(facDistrict)) {
          score += 45;
          reasons.push(`Berlokasi di ${criteria.targetLocation}`);
        }
      } else if (targetDistrict && facDistrict && (facDistrict.includes(targetDistrict) || targetDistrict.includes(facDistrict))) {
        score += 35;
        reasons.push("Terletak di kecamatan yang sama");
      } else if (targetCity && facCity && (facCity.includes(targetCity) || targetCity.includes(facCity))) {
        score += 25;
        reasons.push("Tersedia di kota/kabupaten yang sama");
      } else if (fac.city) {
        reasons.push(`Berlokasi di ${resolveRegionName(fac.city) || fac.city}`);
      }

      const relevanceReason =
        reasons.length > 0
          ? reasons.join(". ") + "."
          : "Fasilitas kesehatan aktif terverifikasi di platform Lytera.";

      return { facility: fac, score, relevanceReason };
    })
    .sort((a, b) => b.score - a.score);
}


/**
 * Format kartu rekomendasi fasilitas untuk UI.
 */
export function buildFacilityRecommendations(
  ranked: Array<{ facility: FacilityCandidate; relevanceReason: string }>,
  limit = 3,
  context?: TetraUserContext
): TetraRecommendation[] {
  return ranked.slice(0, limit).map(({ facility, relevanceReason }) => {
    const isDoctorOrStaff =
      context?.role === "dokter" ||
      context?.role === "puskesmas" ||
      context?.role === "klinik" ||
      context?.role === "rumah_sakit";

    let actionUrl = undefined;
    let actionLabel = undefined;

    if (isDoctorOrStaff && facility.type === "rumah_sakit") {
      actionUrl = "/portal/dokter-puskesmas/rujukan/baru";
      actionLabel = "Buat Rujukan ke RS Ini";
    }

    const typeBadge =
      facility.type === "rumah_sakit"
        ? "Rumah Sakit Rujukan"
        : facility.type === "puskesmas"
        ? "Puskesmas Primer"
        : facility.type === "klinik"
        ? "Klinik Pratama"
        : "Apotek";

    const location = formatFacilityLocation({ district: facility.district, city: facility.city });

    return {
      type: "facility",
      id: facility.id,
      name: facility.name
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      category: typeBadge,
      relevance: relevanceReason,
      location,
      badge: "Faskes Aktif",
      actionUrl,
      actionLabel,
    };
  });
}

/**
 * Format kartu rekomendasi dokter untuk UI.
 */
export function buildDoctorRecommendations(
  doctors: DoctorCandidate[],
  limit = 3
): TetraRecommendation[] {
  return doctors.slice(0, limit).map((doc) => {
    const facName = doc.facility_name
      ? doc.facility_name
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
      : "Fasilitas Terdaftar";

    const docLocation = formatFacilityLocation({
      district: doc.district,
      city: doc.city,
    });

    return {
      type: "doctor",
      id: doc.staff_id,
      name: doc.full_name,
      category: doc.specialization ? `Spesialis ${doc.specialization}` : "Dokter Umum",
      relevance: `Dokter aktif bertugas di ${facName}.`,
      location: docLocation,
      badge: "Dokter Aktif",
    };
  });
}
