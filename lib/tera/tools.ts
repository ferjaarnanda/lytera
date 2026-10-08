import { createClient } from "@/lib/supabase/server";
import { TeraRecommendation, TeraUserContext } from "./types";

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
 * Menghindari query langsung untuk kepatuhan RLS.
 */
export async function searchActiveFacilities(options: {
  type?: "puskesmas" | "klinik" | "rumah_sakit" | "apotek" | null;
  query?: string | null;
  limit?: number;
}): Promise<FacilityCandidate[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_active_facilities", {
      p_type: options.type || null,
      p_query: options.query || null,
      p_limit: options.limit || 20,
    });

    if (error) {
      console.warn("[Tera] Gagal memanggil list_active_facilities:", error.message);
      return [];
    }

    if (!Array.isArray(data)) return [];
    return data as FacilityCandidate[];
  } catch (err) {
    console.warn("[Tera] Error searchActiveFacilities:", err);
    return [];
  }
}

/**
 * Mencari dokter aktif di fasilitas tertentu melalui RPC resmi list_active_doctors.
 */
export async function searchActiveDoctors(facilityId: string): Promise<DoctorCandidate[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_active_doctors", {
      p_facility_id: facilityId,
    });

    if (error) {
      console.warn("[Tera] Gagal memanggil list_active_doctors:", error.message);
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
    console.warn("[Tera] Error searchActiveDoctors:", err);
    return [];
  }
}

/**
 * Sistem ranking kandidat fasilitas kesehatan berdasarkan:
 * 1. Kecocokan kebutuhan / keluhan / jenis faskes
 * 2. Tingkat faskes yang tepat (primer vs lanjutan)
 * 3. Kedekatan wilayah (Kecamatan -> Kota/Kabupaten -> Provinsi -> Luar)
 * 4. Ketersediaan dokter / layanan
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
      let score = 50; // Skor awal faskes aktif
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
 * Mengubah kandidat fasilitas terpilih menjadi kartu rekomendasi terstruktur untuk UI Tera.
 */
export function buildFacilityRecommendations(
  ranked: Array<{ facility: FacilityCandidate; relevanceReason: string }>,
  limit = 3,
  context?: TeraUserContext
): TeraRecommendation[] {
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
