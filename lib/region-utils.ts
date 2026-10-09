/**
 * Helper normalisasi dan resolusi nama wilayah Indonesia.
 * Mendukung data berbasis nama maupun kode administratif Kemendagri.
 */

// Singkatan dan angka Romawi yang harus tetap kapital
const KEEP_UPPER = new Set([
  "DKI",
  "DI",
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "D.K.I.",
  "D.I.",
]);

/**
 * Format string nama wilayah ke Title Case dengan aturan singkatan resmi.
 */
export function formatRegionName(name: string): string {
  if (!name) return "";

  return name
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((word) => {
      const upper = word.toUpperCase();
      if (KEEP_UPPER.has(upper)) {
        return upper;
      }
      if (word.includes("-")) {
        return word
          .split("-")
          .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : ""))
          .join("-");
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Pemetaan resmi kode administratif Kemendagri ke nama wilayah manusiawi.
 */
export const KNOWN_REGION_CODES: Record<string, string> = {
  // --- PROVINSI (2 Digit) ---
  "11": "Aceh",
  "12": "Sumatera Utara",
  "13": "Sumatera Barat",
  "14": "Riau",
  "15": "Jambi",
  "16": "Sumatera Selatan",
  "17": "Bengkulu",
  "18": "Lampung",
  "19": "Kepulauan Bangka Belitung",
  "21": "Kepulauan Riau",
  "31": "DKI Jakarta",
  "32": "Jawa Barat",
  "33": "Jawa Tengah",
  "34": "DI Yogyakarta",
  "35": "Jawa Timur",
  "36": "Banten",
  "51": "Bali",
  "52": "Nusa Tenggara Barat",
  "53": "Nusa Tenggara Timur",
  "61": "Kalimantan Barat",
  "62": "Kalimantan Tengah",
  "63": "Kalimantan Selatan",
  "64": "Kalimantan Timur",
  "65": "Kalimantan Utara",
  "71": "Sulawesi Utara",
  "72": "Sulawesi Tengah",
  "73": "Sulawesi Selatan",
  "74": "Sulawesi Tenggara",
  "75": "Gorontalo",
  "76": "Sulawesi Barat",
  "81": "Maluku",
  "82": "Maluku Utara",
  "91": "Papua",
  "92": "Papua Barat",
  "93": "Papua Selatan",
  "94": "Papua Tengah",
  "95": "Papua Pegunungan",
  "96": "Papua Barat Daya",

  // --- KABUPATEN / KOTA JAWA TENGAH (4 Digit) ---
  "3374": "Kota Semarang",
  "3371": "Kota Magelang",
  "3372": "Kota Surakarta",
  "3373": "Kota Salatiga",
  "3375": "Kota Pekalongan",
  "3376": "Kota Tegal",
  "3301": "Kabupaten Cilacap",
  "3302": "Kabupaten Banyumas",
  "3303": "Kabupaten Purbalingga",
  "3304": "Kabupaten Banjarnegara",
  "3305": "Kabupaten Kebumen",
  "3306": "Kabupaten Purworejo",
  "3307": "Kabupaten Wonosobo",
  "3308": "Kabupaten Magelang",
  "3309": "Kabupaten Boyolali",
  "3310": "Kabupaten Klaten",
  "3311": "Kabupaten Sukoharjo",
  "3312": "Kabupaten Wonogiri",
  "3313": "Kabupaten Karanganyar",
  "3314": "Kabupaten Sragen",
  "3315": "Kabupaten Grobogan",
  "3316": "Kabupaten Blora",
  "3317": "Kabupaten Rembang",
  "3318": "Kabupaten Pati",
  "3319": "Kabupaten Kudus",
  "3320": "Kabupaten Jepara",
  "3321": "Kabupaten Demak",
  "3322": "Kabupaten Semarang",
  "3323": "Kabupaten Temanggung",
  "3324": "Kabupaten Kendal",
  "3325": "Kabupaten Batang",
  "3326": "Kabupaten Pekalongan",
  "3327": "Kabupaten Pemalang",
  "3328": "Kabupaten Tegal",
  "3329": "Kabupaten Brebes",

  // --- KOTA BESAR & PILIHAN DI WILAYAH LAIN ---
  "3171": "Kota Jakarta Pusat",
  "3172": "Kota Jakarta Utara",
  "3173": "Kota Jakarta Barat",
  "3174": "Kota Jakarta Selatan",
  "3175": "Kota Jakarta Timur",
  "3273": "Kota Bandung",
  "3275": "Kota Bekasi",
  "3276": "Kota Depok",
  "3271": "Kota Bogor",
  "3471": "Kota Yogyakarta",
  "3404": "Kabupaten Sleman",
  "3402": "Kabupaten Bantul",
  "3578": "Kota Surabaya",
  "3573": "Kota Malang",
  "5171": "Kota Denpasar",
  "5108": "Kabupaten Buleleng",
  "5106": "Kabupaten Bangli",
  "1105": "Kabupaten Aceh Barat",

  // --- KECAMATAN KOTA SEMARANG (6 Digit) ---
  "337401": "Semarang Tengah",
  "337402": "Semarang Utara",
  "337403": "Semarang Timur",
  "337404": "Gayamsari",
  "337405": "Genuk",
  "337406": "Pedurungan",
  "337407": "Semarang Selatan",
  "337408": "Candisari",
  "337409": "Gajahmungkur",
  "337410": "Tembalang",
  "337411": "Banyumanik",
  "337412": "Gunungpati",
  "337413": "Semarang Barat",
  "337414": "Mijen",
  "337415": "Ngaliyan",
  "337416": "Tugu",

  // --- KECAMATAN DATA UJI LAIN ---
  "510802": "Banjar",
  "510604": "Kintamani",
  "110501": "Johan Pahlawan",
};

/**
 * Cek apakah string merupakan kode administratif numerik (misal: "33", "3374", "337401").
 */
export function isAdministrativeCode(val: string | null | undefined): boolean {
  if (!val) return false;
  const trimmed = val.trim();
  return /^\d{2,10}$/.test(trimmed);
}

/**
 * Dapatkan nama wilayah dari kode administratif Kemendagri.
 */
export function getRegionNameFromCode(code: string | null | undefined): string | null {
  if (!code) return null;
  const trimmed = code.trim();
  return KNOWN_REGION_CODES[trimmed] || null;
}

/**
 * Resolusi nilai wilayah serbaguna:
 * - Jika berupa kode administratif numerik ("337401", "3374"), dicari di pemetaan resmi.
 *   Jika kode tidak ditemukan, mengembalikan null (jangan menampilkan kode mentah sebagai nama).
 * - Jika sudah berupa nama ("Semarang Tengah", "Kota Semarang"), diformat ke Title Case.
 */
export function resolveRegionName(val: string | null | undefined): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  if (!trimmed) return null;

  if (isAdministrativeCode(trimmed)) {
    return getRegionNameFromCode(trimmed);
  }

  return formatRegionName(trimmed);
}

/**
 * Format string gabungan lokasi fasilitas yang siap ditampilkan ke antarmuka pengguna:
 * Menggabungkan kecamatan, kota/kabupaten, dan provinsi yang valid tanpa menampilkan kode mentah.
 */
export function formatFacilityLocation(options: {
  district?: string | null;
  city?: string | null;
  province?: string | null;
  address?: string | null;
}): string {
  const resolvedDistrict = resolveRegionName(options.district);
  const resolvedCity = resolveRegionName(options.city);
  const resolvedProvince = resolveRegionName(options.province);

  const parts = [resolvedDistrict, resolvedCity, resolvedProvince].filter(Boolean) as string[];

  if (parts.length > 0) {
    return parts.join(", ");
  }

  // Fallback ke alamat jika ada
  if (options.address && options.address.trim()) {
    return options.address.trim();
  }

  return "Wilayah belum tercatat";
}
