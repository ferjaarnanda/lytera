import { TetraChatResponse, TetraUserContext } from "./types";
import { isSelfIdentityQuery } from "./router";
import { resolveRegionName } from "@/lib/region-utils";

/**
 * Penjaga privasi Tetra (server-side).
 *
 * Lapisan ini berjalan SEBELUM LLM dipanggil. Permintaan data sensitif dijawab
 * secara deterministik (tidak pernah sampai ke model), sedangkan nama dan alamat
 * milik pengguna sendiri hanya dijawab bila sesi autentikasi di server valid
 * (context.userId diisi oleh server action, bukan oleh klien).
 */

export type SensitiveType =
  | "nik"
  | "kk"
  | "credential"
  | "auth_token"
  | "medical"
  | "insurance"
  | "contact"
  | "personal_data";

export type AddressComponent = "province" | "city" | "district" | "village" | "street" | "postal";

export interface OwnAddress {
  province: string | null;
  city: string | null;
  district: string | null;
  village: string | null;
  address: string | null;
}

/** Konteks Tetra yang diperkaya server dengan alamat milik pengguna sendiri. */
export type TetraPrivacyContext = TetraUserContext & {
  ownAddress?: OwnAddress | null;
};

export interface PrivacyIntent {
  sensitive?: { type: SensitiveType; subject: "self" | "other" | "unspecified" };
  name?: boolean;
  address?: { components: AddressComponent[] | "full"; subject: "self" | "other" };
  clarify?: boolean;
}

type ChatMsg = { role: string; content: string };

// ---------------------------------------------------------------------------
// Normalisasi teks: huruf kecil, buang tanda baca, seragamkan kata ganti,
// singkatan, dan salah ketik wajar agar deteksi berbasis makna, bukan kata persis.
// ---------------------------------------------------------------------------
export function normalizePrivacyText(raw: string): string {
  let s = (raw || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/[-_/]/g, " ").replace(/[^a-z0-9?\s]/g, " ");
  s = s.replace(/\?/g, " ? ");
  // Salah ketik umum untuk NIK
  s = s.replace(/\b(n1k|nikk+|niik)\b/g, "nik");
  // Akhiran -ku / -nya yang menempel pada kata kunci
  const kw =
    "nik|ktp|kk|alamat|nama|rumah|password|sandi|token|kecamatan|kelurahan|desa|provinsi|kabupaten|kota|domisili|nomor|identitas";
  s = s.replace(new RegExp(`\\b(${kw})ku\\b`, "g"), "$1 saya");
  s = s.replace(new RegExp(`\\b(${kw})nya\\b`, "g"), "$1 nya");
  s = s.replace(/\b(aku|gue|gua|gw|ogut|sy|ku)\b/g, "saya");
  s = s.replace(/\b(no|nmr|nomer|nmor)\b/g, "nomor");
  s = s.replace(/\b(brp|berapakah|brapa)\b/g, "berapa");
  s = s.replace(/\b(dmn|dimana)\b/g, "di mana");
  s = s.replace(/\bkab\b/g, "kabupaten").replace(/\bkec\b/g, "kecamatan").replace(/\bkel\b/g, "kelurahan");
  s = s.replace(/\b(prov|propinsi|provinsinya)\b/g, "provinsi");
  s = s.replace(/\b(almt|alamt|almat|alamatt)\b/g, "alamat");
  s = s.replace(/\btau\b/g, "tahu");
  s = s.replace(/\b(sebutin|sebutkn|sebut|sebutkanlah)\b/g, "sebutkan");
  s = s.replace(/\bkodepos\b/g, "kode pos");
  return s.replace(/\s+/g, " ").trim();
}

const SELF_RE = /\b(saya|my|mine|me|i|milik saya)\b/;
const QUESTION_RE =
  /\?|\b(berapa|apa|apakah|siapa|mana|sebutkan|ulangi|ulang|tampilkan|tunjukkan|kasih|beritahu|cek|lihat|tahu|ingat|coba|tulis|eja|bacakan|what|where|tell|show|give|repeat|know|which)\b/;
const HARD_REQUEST_RE =
  /\b(berapa|sebutkan|ulangi|ulang|tampilkan|tunjukkan|bacakan|eja|tuliskan|tulis|kasih tahu|beritahu|bocorkan|cetak|repeat|tell me|show me|give me)\b/;
const EDU_RE =
  /\b(apa itu|apa arti|arti dari|apa kepanjangan|kepanjangan|singkatan|mengapa|kenapa|why|fungsi|kegunaan|manfaat|pentingnya|penting|definisi|pengertian|bagaimana cara|cara membuat|cara mengurus|cara mengecek|cara melihat|format penulisan|format|contoh|what is a|what is an|what does|how to|how do|bagaimana format|aturan)\b/;
const ANAPHORA_RE =
  /\b(itu|tadi|tersebut|nya|lagi|sekali lagi|terakhir|depan|belakang|lengkapnya|sekalian|kalau|terus|lalu|that|it|again)\b/;
const REPEAT_RE =
  /\b(ulangi|ulang|sebutkan lagi|apa yang tadi|pesan pertama|pesan sebelumnya|pesan tadi|yang saya kirim|yang saya kasih|yang saya tulis|yang saya ketik|repeat|what did i)\b/;
const SEARCH_RE =
  /\b(cari|carikan|terdekat|dekat|faskes|fasilitas|puskesmas|klinik|rs|rumah sakit|dokter|apotek|rekomendasi|spesialis|poli|igd)\b/;
const THIRD_PARTY_RE =
  /\b(pasien|dokter|orang lain|orang|ibu|ayah|bapak|bu|pak|istri|suami|anak|adik|kakak|teman|tetangga|dia|beliau|mereka|petugas|staf|admin|nakes|perawat|bidan|anggota keluarga|pengguna lain|user lain|his|her|their|someone|somebody)\b/;
const FACILITY_RE = /\b(rumah sakit|rs|puskesmas|klinik|apotek|faskes|fasilitas|dinkes|kantor|lytera)\b/;
const INJECTION_RE =
  /\b(abaikan|ignore|lupakan aturan|pura pura|anggap kamu|anggap saja|mode developer|developer mode|jailbreak|override|bypass|kamu sekarang admin|sebagai admin|system prompt)\b/;

const SENSITIVE_PATTERNS: Array<{ type: SensitiveType; re: RegExp }> = [
  {
    type: "nik",
    re: /\b(nik|nomor induk kependudukan|induk kependudukan|nomor identitas|identitas kependudukan|nomor ktp|ktp|e ktp|ektp|nomor kependudukan|id number|national id|identity number|identity card)\b/,
  },
  { type: "kk", re: /\b(nomor kk|kk saya|kartu keluarga|family card)\b/ },
  { type: "credential", re: /\b(password|kata sandi|sandi|pin|kredensial|credential|credentials|passcode)\b/ },
  {
    type: "auth_token",
    re: /\b(token|kode izin|kode akses|jwt|api key|apikey|service role|access token|refresh token|session|sesi login|otp|cookie)\b/,
  },
  {
    type: "medical",
    re: /\b(rekam medis|riwayat medis|riwayat penyakit|riwayat kesehatan|diagnosa|diagnosis|hasil lab|hasil laboratorium|alergi|golongan darah|resep|catatan dokter|resume medis|medical record|medical history)\b/,
  },
  {
    type: "insurance",
    re: /\b(nomor (kartu )?(bpjs|jkn|kis|asuransi|polis|kepesertaan)|nomor peserta|polis)\b/,
  },
  { type: "contact", re: /\b(nomor (hp|handphone|telepon|telp|wa|whatsapp|ponsel)|email|e mail|surel|phone number)\b/ },
  { type: "personal_data", re: /\b(data pribadi|data pasien|data sensitif|database|basis data|tabel patients|isi tabel)\b/ },
];

const ADDRESS_RE =
  /\b(alamat|domisili|tinggal|rumah saya|kode pos|address|live|reside|provinsi|province|kabupaten|kota|city|kecamatan|kelurahan|desa|village|rt|rw|nomor rumah|jalan|daerah)\b/;

function detectSensitiveType(n: string): SensitiveType | null {
  for (const p of SENSITIVE_PATTERNS) if (p.re.test(n)) return p.type;
  return null;
}

/** Deteksi angka panjang menyerupai NIK / KK / BPJS / nomor HP (>= 10 digit). */
const LONG_NUMBER_RE = /(?:\d[\s.\-]?){10,}\d?/g;

export function containsSensitiveNumber(text: string): boolean {
  LONG_NUMBER_RE.lastIndex = 0;
  return LONG_NUMBER_RE.test(text || "");
}

/** Samarkan total (bukan sebagian) angka identitas sebelum teks dikirim ke LLM atau ditampilkan. */
export function redactSensitiveText(text: string): string {
  return (text || "").replace(LONG_NUMBER_RE, "[data disamarkan]");
}

export function redactHistory<T extends ChatMsg>(messages: T[]): T[] {
  return messages.map((m) => ({ ...m, content: redactSensitiveText(m.content) }));
}

function addressComponents(n: string): AddressComponent[] | "full" {
  if (/\b(lengkap|full|semua|seluruh|complete|dari provinsi|sampai detail)\b/.test(n)) return "full";
  const comps: AddressComponent[] = [];
  if (/\b(provinsi|province)\b/.test(n)) comps.push("province");
  if (/\b(kabupaten|kota|city|regency)\b/.test(n)) comps.push("city");
  if (/\b(kecamatan|district)\b/.test(n)) comps.push("district");
  if (/\b(kelurahan|desa|village)\b/.test(n)) comps.push("village");
  if (/\b(jalan|nomor rumah|rt|rw|detail|street|blok|gang)\b/.test(n)) comps.push("street");
  if (/\b(kode pos|postal|zip)\b/.test(n)) comps.push("postal");
  return comps.length > 0 ? comps : "full";
}

/** Analisis satu pesan tanpa konteks percakapan. */
function analyzeSingle(raw: string): PrivacyIntent {
  const n = normalizePrivacyText(raw);
  if (!n) return {};
  const words = n.replace(/\?/g, "").trim().split(" ").filter(Boolean);
  const self = SELF_RE.test(n);
  const hard = HARD_REQUEST_RE.test(n);
  const edu = EDU_RE.test(n) && !hard;
  const injection = INJECTION_RE.test(n);
  const third = THIRD_PARTY_RE.test(n);
  const result: PrivacyIntent = {};

  // Kata kunci tunggal yang ambigu → minta klarifikasi tanpa membuka data
  if (words.length === 1 && /^(nik|ktp|kk|alamat|identitas|password|domisili)$/.test(words[0])) {
    return { clarify: true };
  }

  // 1. Data sensitif
  const sType = detectSensitiveType(n);
  if (sType && !edu) {
    const generalOnly = sType === "auth_token" || sType === "medical" || sType === "personal_data";
    const asks = self || hard || third || injection || (!generalOnly && QUESTION_RE.test(n));
    if (asks) {
      result.sensitive = {
        type: sType,
        subject: third ? "other" : self ? "self" : "unspecified",
      };
    }
  }

  // 2. Alamat
  if (ADDRESS_RE.test(n) && !edu && !SEARCH_RE.test(n)) {
    const isRequest = QUESTION_RE.test(n) || words.length <= 4;
    if (third && /\b(alamat|domisili|tinggal|rumah)\b/.test(n)) {
      result.address = { components: "full", subject: "other" };
    } else if (self && isRequest) {
      result.address = { components: addressComponents(n), subject: "self" };
    } else if (
      /\balamat\b/.test(n) &&
      hard &&
      !FACILITY_RE.test(n) &&
      !ANAPHORA_RE.test(n)
    ) {
      // "Sebutkan alamat Budi" → alamat milik pihak lain
      result.address = { components: "full", subject: "other" };
    }
  }

  // 3. Nama / identitas profil diri (memakai detektor identitas yang sudah ada)
  if (!result.sensitive) {
    if (isSelfIdentityQuery(raw)) result.name = true;
    if (!result.name && /\b(nama|name)\b/.test(n) && self && QUESTION_RE.test(n) && !third && !edu) {
      result.name = true;
    }
  } else {
    // Jika pesan juga mengandung pertanyaan eksplisit tentang nama / siapa diri
    if (/\b(nama|name|siapa\s+(?:aku|saya|gue|gw|gua|ogut)|who\s+am\s+i)\b/i.test(raw)) {
      result.name = true;
    }
  }

  return result;
}

function isEmpty(i: PrivacyIntent): boolean {
  return !i.sensitive && !i.name && !i.address && !i.clarify;
}

/**
 * Deteksi maksud privasi dengan mempertimbangkan pesan sebelumnya (pertanyaan lanjutan,
 * kata ganti, permintaan mengulang data yang pernah diberikan).
 */
export function detectPrivacyIntent(userInput: string, history: ChatMsg[] = []): PrivacyIntent {
  const direct = analyzeSingle(userInput);
  const n = normalizePrivacyText(userInput);

  // Riwayat tanpa pesan saat ini (widget mengirim pesan terakhir di dalam riwayat)
  const prior = [...history];
  const last = prior[prior.length - 1];
  if (last && last.role === "user" && last.content.trim() === userInput.trim()) prior.pop();
  const priorUser = prior.filter((m) => m.role === "user").slice(-3).reverse();

  // Permintaan mengulang data sensitif yang pernah diketik pengguna
  if (!direct.sensitive && REPEAT_RE.test(n)) {
    for (const m of priorUser) {
      const t = detectSensitiveType(normalizePrivacyText(m.content));
      if (containsSensitiveNumber(m.content) || (t && t !== "medical")) {
        direct.sensitive = { type: t || "nik", subject: "self" };
        break;
      }
    }
  }

  if (!isEmpty(direct)) return direct;

  // Pertanyaan lanjutan: warisi topik dari pesan pengguna sebelumnya
  for (const m of priorUser) {
    const prev = analyzeSingle(m.content);
    if (isEmpty(prev) || prev.clarify) continue;
    const followUp = ANAPHORA_RE.test(n) || QUESTION_RE.test(n) || n.split(" ").length <= 4;
    if (!followUp) break;

    if (prev.sensitive && (ANAPHORA_RE.test(n) || /\b(nomor|angka|digit|number)\b/.test(n))) {
      return { sensitive: prev.sensitive };
    }
    if (prev.address && prev.address.subject === "self" && !SEARCH_RE.test(n) && !THIRD_PARTY_RE.test(n)) {
      if (ADDRESS_RE.test(n) || /\b(lengkap|lengkapnya|sekalian|detail|nomor)\b/.test(n)) {
        return { address: { components: addressComponents(n), subject: "self" } };
      }
    }
    if (prev.name && /\b(lengkap|lengkapnya|panjang|full|nama)\b/.test(n)) {
      return { name: true };
    }
    break;
  }
  return {};
}

// ---------------------------------------------------------------------------
// Respons deterministik
// ---------------------------------------------------------------------------
const SENSITIVE_LABEL: Record<SensitiveType, string> = {
  nik: "NIK",
  kk: "nomor Kartu Keluarga (KK)",
  credential: "kata sandi atau kredensial akun",
  auth_token: "token, kode izin, atau kode autentikasi",
  medical: "data rekam medis",
  insurance: "nomor kepesertaan BPJS atau asuransi",
  contact: "nomor kontak atau email",
  personal_data: "data pribadi",
};

const SENSITIVE_GUIDE: Record<SensitiveType, string> = {
  nik: "Silakan periksa dokumen identitas Anda (KTP) melalui saluran resmi.",
  kk: "Silakan periksa dokumen Kartu Keluarga Anda melalui saluran resmi.",
  credential: "Tetra tidak menyimpan dan tidak pernah menampilkan kata sandi. Jangan bagikan kata sandi Anda kepada siapa pun, termasuk Tetra.",
  auth_token:
    "Kode izin 6 digit hanya ditampilkan sekali di menu Izin Akses saat dibuat, dan Tetra tidak dapat menampilkannya ulang.",
  medical: "Pemilik akun dapat melihat riwayatnya sendiri di menu Riwayat Medis portal pasien, dan dokter hanya dapat membukanya dengan kode izin pasien.",
  insurance: "Silakan periksa kartu kepesertaan Anda atau menu Penjamin di portal pasien.",
  contact: "Silakan periksa halaman profil akun Anda.",
  personal_data: "Tetra tidak membuka data pribadi pengguna maupun isi basis data Lytera.",
};

function sensitiveMessage(s: NonNullable<PrivacyIntent["sensitive"]>): string {
  const label = SENSITIVE_LABEL[s.type];
  if (s.subject === "other") {
    return (
      `Saya tidak memiliki izin untuk mengakses atau mengungkapkan ${label} milik orang lain. ` +
      `Data tersebut hanya dapat diakses pemiliknya atau pihak berwenang melalui alur resmi Lytera.`
    );
  }
  const owner = s.subject === "self" ? `${label} Anda` : `${label} tersebut`;
  return `Saya tidak memiliki izin untuk mengakses atau mengungkapkan ${owner}. ${SENSITIVE_GUIDE[s.type]}`;
}

const LOGIN_MESSAGE = "Silakan login terlebih dahulu agar saya dapat membantu memeriksa informasi profil Anda.";

function isAuthenticated(ctx: TetraPrivacyContext): boolean {
  return Boolean(ctx.userId) && ctx.role !== "landing";
}

function meaningfulDetail(addr: string | null): string | null {
  if (!addr) return null;
  const t = addr.trim();
  // Detail alamat wajib memuat huruf (nama jalan/RT/RW); angka mentah tidak dianggap alamat.
  return /[a-zA-Z]/.test(t) ? t : null;
}

function nameMessage(ctx: TetraPrivacyContext): string {
  const name = ctx.fullName?.trim();
  return name
    ? `Nama yang tercatat di profil akun Anda: **${name}**.`
    : "Nama lengkap belum tercatat di profil akun Anda.";
}

function addressMessage(ctx: TetraPrivacyContext, components: AddressComponent[] | "full"): string {
  if (ctx.role !== "pasien") {
    return "Profil akun Anda di Lytera tidak menyimpan alamat tempat tinggal pribadi, jadi saya tidak dapat menampilkannya.";
  }
  const a = ctx.ownAddress;
  if (!a) {
    return "Data alamat untuk akun ini belum ditemukan di profil pasien Anda.";
  }
  const missing = "_belum tercatat_";
  const rows: Record<AddressComponent, string> = {
    province: `• Provinsi: ${resolveRegionName(a.province) || missing}`,
    city: `• Kabupaten/Kota: ${resolveRegionName(a.city) || missing}`,
    district: `• Kecamatan: ${resolveRegionName(a.district) || missing}`,
    village: `• Kelurahan/Desa: ${resolveRegionName(a.village) || missing}`,
    street: `• Detail alamat (jalan, nomor rumah, RT/RW): ${meaningfulDetail(a.address) || missing}`,
    postal: "• Kode pos: tidak disimpan di profil Lytera",
  };
  const order: AddressComponent[] =
    components === "full" ? ["province", "city", "district", "village", "street", "postal"] : components;
  const lines = order.map((c) => rows[c]);
  const anyMissing = lines.some((l) => l.includes(missing) || l.includes("tidak disimpan"));
  return (
    "Berikut alamat yang tercatat di profil akun Anda:\n\n" +
    lines.join("\n") +
    (anyMissing ? "\n\nBagian yang belum tercatat memang tidak tersimpan di profil Anda, jadi saya tidak menebaknya." : "")
  );
}

/**
 * Bangun respons privasi bila pesan termasuk cakupan penjaga. Mengembalikan null
 * bila pesan bukan permintaan data pribadi (diteruskan ke alur Tetra biasa).
 */
export function buildPrivacyResponse(
  userInput: string,
  history: ChatMsg[],
  ctx: TetraPrivacyContext,
  suggestions: string[]
): TetraChatResponse | null {
  const intent = detectPrivacyIntent(userInput, history);
  if (isEmpty(intent)) return null;

  if (intent.clarify) {
    return {
      success: true,
      intent: "identity",
      message:
        "Boleh diperjelas maksudnya? Saya bisa menjelaskan pengertian atau kegunaan data tersebut, " +
        "tetapi saya tidak akan menampilkan nilai data pribadi yang bersifat rahasia.",
      suggestions,
    };
  }

  const parts: string[] = [];
  if (intent.sensitive) parts.push(sensitiveMessage(intent.sensitive));

  const wantsProfile = intent.name || (intent.address && intent.address.subject === "self");
  if (intent.address && intent.address.subject === "other") {
    parts.push(
      "Saya tidak memiliki izin untuk mengakses atau mengungkapkan alamat maupun identitas milik orang lain."
    );
  }

  if (wantsProfile) {
    if (!isAuthenticated(ctx)) {
      parts.push(
        LOGIN_MESSAGE +
          (ctx.role === "landing" ? " Jika sudah login, buka portal akun Anda lalu tanyakan kembali dari sana." : "")
      );
    } else {
      if (intent.name) parts.push(nameMessage(ctx));
      if (intent.address && intent.address.subject === "self") {
        parts.push(addressMessage(ctx, intent.address.components));
      }
    }
  }

  return {
    success: true,
    intent: "identity",
    message: parts.join("\n\n"),
    recommendations: undefined,
    suggestions,
  };
}
