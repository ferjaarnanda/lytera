export type TeraRole =
  | "landing"
  | "pasien"
  | "dokter"
  | "puskesmas"
  | "klinik"
  | "rumah_sakit"
  | "apotek"
  | "verifikator"
  | "dinkes";

export interface TeraUserContext {
  userId?: string;
  role: TeraRole;
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

export interface TeraRecommendation {
  type: "facility" | "doctor" | "service" | "info";
  id?: string;
  name: string;
  category?: string; // misal: "Rumah Sakit", "Puskesmas", "Spesialis Penyakit Dalam"
  relevance: string; // Alasan kenapa kandidat dipilih (bahasa objektif & faktual)
  location?: string; // misal: "Semarang Tengah, Kota Semarang"
  badge?: string; // misal: "Faskes Aktif", "Rujukan Tingkat Lanjutan"
  actionUrl?: string; // URL navigasi resmi di Lytera
  actionLabel?: string; // Label tombol
}

export interface TeraMessage {
  id: string;
  sender: "user" | "tera" | "system";
  content: string;
  timestamp: number;
  recommendations?: TeraRecommendation[];
  suggestions?: string[];
  navigation?: {
    url: string;
    label: string;
  } | null;
  isError?: boolean;
}

export interface TeraChatRequest {
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  context: TeraUserContext;
  userInput: string;
}

export interface TeraChatResponse {
  success: boolean;
  message: string;
  recommendations?: TeraRecommendation[];
  suggestions?: string[];
  navigation?: {
    url: string;
    label: string;
  } | null;
  error?: string;
}
