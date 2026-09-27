export type FacilityTingkat = 1 | 2 | 3;

export interface Facility {
  nama: string;
  daerah: string;
  jenis: string;
  tingkat: FacilityTingkat;
}

export const REGION_NAME = "Kota Semarang, Jawa Tengah";

// Daftar Fasilitas Tingkat 1 (Primer) - 6 fasilitas
export const TINGKAT_1_FACILITIES: Facility[] = [
  {
    nama: "Puskesmas Pandanaran",
    daerah: REGION_NAME,
    jenis: "Puskesmas",
    tingkat: 1,
  },
  {
    nama: "Puskesmas Srondol",
    daerah: REGION_NAME,
    jenis: "Puskesmas",
    tingkat: 1,
  },
  {
    nama: "Puskesmas Ngaliyan",
    daerah: REGION_NAME,
    jenis: "Puskesmas",
    tingkat: 1,
  },
  {
    nama: "Puskesmas Mijen",
    daerah: REGION_NAME,
    jenis: "Puskesmas",
    tingkat: 1,
  },
  {
    nama: "Klinik Polrestabes Semarang",
    daerah: REGION_NAME,
    jenis: "Klinik Pratama",
    tingkat: 1,
  },
  {
    nama: "Poliklinik UNNES",
    daerah: REGION_NAME,
    jenis: "Klinik Pratama",
    tingkat: 1,
  },
];

// Daftar Fasilitas Tingkat 2 (Sekunder) - 5 fasilitas
export const TINGKAT_2_FACILITIES: Facility[] = [
  {
    nama: "RSUD Kota Semarang",
    daerah: REGION_NAME,
    jenis: "RSUD",
    tingkat: 2,
  },
  {
    nama: 'RS Panti Wilasa "Dr. Cipto"',
    daerah: REGION_NAME,
    jenis: "Rumah Sakit Umum",
    tingkat: 2,
  },
  {
    nama: "RS Panti Wilasa Citarum",
    daerah: REGION_NAME,
    jenis: "Rumah Sakit Umum",
    tingkat: 2,
  },
  {
    nama: "RS St. Elisabeth Semarang",
    daerah: REGION_NAME,
    jenis: "Rumah Sakit Umum",
    tingkat: 2,
  },
  {
    nama: "RS Roemani Muhammadiyah",
    daerah: REGION_NAME,
    jenis: "Rumah Sakit Umum",
    tingkat: 2,
  },
];

// Daftar Fasilitas Tingkat 3 (Tersier) - 5 fasilitas
export const TINGKAT_3_FACILITIES: Facility[] = [
  {
    nama: "RSUP Dr. Kariadi",
    daerah: REGION_NAME,
    jenis: "RSUP",
    tingkat: 3,
  },
  {
    nama: "RS Umum Sultan Agung Semarang",
    daerah: REGION_NAME,
    jenis: "Rumah Sakit Umum",
    tingkat: 3,
  },
  {
    nama: "RS Nasional Diponegoro",
    daerah: REGION_NAME,
    jenis: "Rumah Sakit Umum",
    tingkat: 3,
  },
  {
    nama: "RS Khusus Bedah Columbia Asia Semarang",
    daerah: REGION_NAME,
    jenis: "Rumah Sakit Khusus",
    tingkat: 3,
  },
  {
    nama: "RSJD Dr. Amino Gondohutomo",
    daerah: REGION_NAME,
    jenis: "Rumah Sakit Khusus",
    tingkat: 3,
  },
];

// Label lencana per tingkat
export const TINGKAT_LABELS: Record<FacilityTingkat, string> = {
  1: "Faskes Tingkat 1 (Primer)",
  2: "Faskes Tingkat 2 (Sekunder)",
  3: "Faskes Tingkat 3 (Tersier)",
};

// Urutan tingkat baris atas yang berulang (11 langkah: 6 kali tingkat 1, 5 kali tingkat 2)
export const TOP_SEQUENCE: readonly (1 | 2)[] = [
  1, 2, 1, 1, 2, 2, 1, 2, 1, 2, 1,
];

// Konstanta waktu rotasi serempak (6000ms = 6 detik per siklus) dan durasi fade
export const ROTATION_INTERVAL_MS = 6000;
export const BOTTOM_OFFSET_MS = 0;
export const FADE_DURATION_MS = 500;

export const ALL_FACILITIES: Facility[] = [
  ...TINGKAT_1_FACILITIES,
  ...TINGKAT_2_FACILITIES,
  ...TINGKAT_3_FACILITIES,
];

export const DEMO_FACILITIES = ALL_FACILITIES.map((f) => ({
  ...f,
  name: f.nama,
  type: f.jenis,
  tier: f.tingkat,
}));
