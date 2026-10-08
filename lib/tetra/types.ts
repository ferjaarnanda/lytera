export type TetraRole =
  | "landing"
  | "pasien"
  | "dokter"
  | "puskesmas"
  | "klinik"
  | "rumah_sakit"
  | "apotek"
  | "verifikator"
  | "dinkes";

export type TetraIntent =
  | "identity" // nama saya siapa, siapa saya, identitas
  | "search_facility" // cari puskesmas, klinik, apotek, faskes
  | "search_doctor" // cari dokter, spesialis
  | "search_referral_hospital" // cari rumah sakit rujukan
  | "search_poli" // cari poli tertentu
  | "referral_flow" // alur rujukan Lytera
  | "token_access" // izin akses 6 digit, token
  | "medical_record" // rekam medis
  | "payer_verification" // penjamin bpjs, asuransi, sktm, verifikasi domisili
  | "general_info" // tentang Lytera, fitur
  | "emergency" // gawat darurat medis
  | "unsupported"; // percakapan umum / di luar topik

export interface TetraUserContext {
  userId?: string;
  role: TetraRole;
  subRole?: string | null;
  fullName?: string;
  email?: string;
  // Wilayah pengguna / faskes
  province?: string | null;
  city?: string | null;
  district?: string | null;
  village?: string | null;
  // Khusus faskes / dokter
  facilityId?: string | null;
  facilityName?: string | null;
  facilityType?: "puskesmas" | "klinik" | "rumah_sakit" | "apotek" | null;
  // Khusus pasien keluarga
  familyMembers?: Array<{
    id: string;
    fullName: string;
    relation: string;
    dob?: string | null;
  }>;
  selectedFamilyMemberId?: string | null;
  selectedFamilyMemberName?: string | null;
  // Konteks halaman & rujukan aktif bila ada
  page?: string;
  activeReferralId?: string | null;
  activeDiagnosis?: string | null;
}

export interface TetraRecommendation {
  type: "facility" | "doctor" | "service" | "info";
  id?: string;
  name: string;
  category?: string; // misal: "Rumah Sakit", "Puskesmas", "Spesialis Penyakit Dalam"
  relevance: string; // Alasan kenapa kandidat dipilih (bahasa objektif & faktual)
  location?: string; // misal: "Semarang Tengah, Kota Semarang"
  badge?: string; // misal: "Faskes Aktif", "Dokter Spesialis"
  actionUrl?: string; // URL navigasi resmi di Lytera
  actionLabel?: string; // Label tombol
}

export interface TetraMessage {
  id: string;
  sender: "user" | "tetra" | "system";
  content: string;
  timestamp: number;
  recommendations?: TetraRecommendation[];
  suggestions?: string[];
  navigation?: {
    url: string;
    label: string;
  } | null;
  isError?: boolean;
}

export interface TetraChatRequest {
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  context: TetraUserContext;
  userInput: string;
}

export interface TetraChatResponse {
  success: boolean;
  message: string;
  intent?: TetraIntent;
  recommendations?: TetraRecommendation[];
  suggestions?: string[];
  navigation?: {
    url: string;
    label: string;
  } | null;
  error?: string;
}
