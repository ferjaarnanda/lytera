import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { TetraRecommendation, TetraUserContext } from "./types";

async function getClient() {
  try {
    return await createServerClient();
  } catch {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (url && key) {
      return createSupabaseClient(url, key);
    }
    throw new Error("Supabase environment variables missing");
  }
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
 * Mencari dokter aktif di fasilitas tertentu melalui RPC resmi list_active_doctors.
 */
export async function searchActiveDoctors(facilityId: string): Promise<DoctorCandidate[]> {
  try {
    const supabase = await getClient();
    const { data, error } = await supabase.rpc("list_active_doctors", {
      p_facility_id: facilityId,
    });

    if (error) {
      console.warn("[Tetra] Gagal memanggil list_active_doctors:", error.message);
      return [];
    }

    if (!Array.isArray(data)) return [];
    return data.map((d: { staff_id: string; full_name: string; specialization: string | null }) => ({
      staff_id: d.staff_id,
      full_name: d.full_name,
      specialization: d.specialization,
      facility_id: facilityId,
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
      doc.city = fac.city;
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
    userCity?: string | null;
    userDistrict?: string | null;
    userProvince?: string | null;
  }
): Array<{ facility: FacilityCandidate; score: number; relevanceReason: string }> {
  const q = (criteria.query || "").toLowerCase();
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

      // 3. Hirarki Wilayah (Kecamatan -> Kabupaten/Kota -> Provinsi)
      const facDistrict = (fac.district || "").toLowerCase().trim();
      const facCity = (fac.city || "").toLowerCase().trim();

      if (targetDistrict && facDistrict && (facDistrict.includes(targetDistrict) || targetDistrict.includes(facDistrict))) {
        score += 35;
        reasons.push("Terletak di kecamatan yang sama");
      } else if (targetCity && facCity && (facCity.includes(targetCity) || targetCity.includes(facCity))) {
        score += 25;
        reasons.push("Tersedia di kota/kabupaten yang sama");
      } else if (fac.city) {
        reasons.push(`Berlokasi di ${fac.city}`);
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

    const locParts = [facility.district, facility.city].filter(Boolean);
    const location = locParts.length > 0 ? locParts.join(", ") : "Wilayah terdaftar";

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

    return {
      type: "doctor",
      id: doc.staff_id,
      name: doc.full_name,
      category: doc.specialization ? `Spesialis ${doc.specialization}` : "Dokter Umum",
      relevance: `Dokter aktif bertugas di ${facName}.`,
      location: doc.city || "Kota Semarang",
      badge: "Dokter Aktif",
    };
  });
}
