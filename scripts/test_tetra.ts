import fs from "fs";
import path from "path";

// Muat .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

import { isSelfIdentityQuery } from "../lib/tetra/router";
import { executeTetraChat } from "../lib/tetra/engine";
import { TetraUserContext } from "../lib/tetra/types";

// --------------------------------------------------------------------------
// Helper PASS / FAIL
// --------------------------------------------------------------------------
let passCount = 0;
let failCount = 0;
function assert(label: string, cond: boolean) {
  if (cond) {
    console.log(`  ✅ PASS — ${label}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL — ${label}`);
    failCount++;
  }
}

// --------------------------------------------------------------------------
// Context uji
// --------------------------------------------------------------------------
const loggedInContext: TetraUserContext = {
  role: "pasien",
  fullName: "Budi Santoso",
  page: "/portal/pasien",
  city: "Kota Semarang",
  district: "Semarang Tengah",
};

const emptyNameContext: TetraUserContext = {
  role: "pasien",
  fullName: "",
  page: "/portal/pasien",
};

const landingContext: TetraUserContext = { role: "landing", page: "/" };

async function runTests() {
  console.log("=== MEMULAI TEST SUITE TETRA INTELLIGENCE (DENGAN DATA NYATA SUPABASE) ===");

  // ============================================================
  // BLOK A — TES LAMA (dipertahankan)
  // ============================================================

  // TEST 1: Izin akses 6 digit
  console.log("\n[TEST 1] Pertanyaan tentang izin akses 6 digit");
  const res1 = await executeTetraChat({
    userInput: "Apa itu izin akses 6 digit?",
    messages: [],
    context: landingContext,
  });
  console.log("  Intent:", res1.intent);
  assert("Menyebut UU Perlindungan Data Pribadi", res1.message.includes("UU Perlindungan Data Pribadi"));
  assert("Tidak ada kartu faskes", res1.recommendations === undefined);

  // TEST 2: Penjelasan alur rujukan
  console.log("\n[TEST 2] Penjelasan alur rujukan");
  const res2 = await executeTetraChat({
    userInput: "Bagaimana alur rujukan di Lytera?",
    messages: [],
    context: landingContext,
  });
  console.log("  Intent:", res2.intent);
  assert("Menyebut Faskes Primer", res2.message.includes("Faskes Primer"));
  assert("Tidak ada kartu faskes", res2.recommendations === undefined);

  // TEST 3: Pencarian dokter spesialis
  console.log("\n[TEST 3] Pencarian dokter spesialis penyakit dalam di Semarang");
  const res3 = await executeTetraChat({
    userInput: "Cari dokter spesialis penyakit dalam di Semarang",
    messages: [],
    context: landingContext,
  });
  console.log("  Intent:", res3.intent);
  console.log("  Jumlah rekomendasi:", res3.recommendations?.length);

  // TEST 4: Wilayah tidak ada → alternatif
  console.log("\n[TEST 4] Dokter di Solo (wilayah tidak ada → alternatif)");
  const res4 = await executeTetraChat({
    userInput: "Cari dokter spesialis penyakit dalam di Solo",
    messages: [],
    context: landingContext,
  });
  console.log("  Intent:", res4.intent);
  console.log("  Jumlah rekomendasi alternatif:", res4.recommendations?.length);

  // TEST 5: Spesialisasi kosong
  console.log("\n[TEST 5] Spesialisasi tidak tersedia (jantung di Solo)");
  const res5 = await executeTetraChat({
    userInput: "Cari dokter spesialis jantung di Solo",
    messages: [],
    context: landingContext,
  });
  console.log("  Intent:", res5.intent);

  // TEST 6: Konteks pasien keluarga
  console.log("\n[TEST 6] Nama pengguna — konteks pasien keluarga");
  const familyContext: TetraUserContext = {
    role: "pasien",
    subRole: "keluarga",
    fullName: "Budi Santoso",
    page: "/portal/pasien/keluarga",
    city: "Kota Semarang",
    district: "Semarang Tengah",
    selectedFamilyMemberName: "Ananda Rizky (Anak)",
    familyMembers: [{ id: "fam-1", fullName: "Ananda Rizky", relation: "anak", dob: "2018-01-01" }],
  };
  const res6 = await executeTetraChat({
    userInput: "nama saya siapa",
    messages: [],
    context: familyContext,
  });
  assert("Mengenali nama Budi Santoso", res6.message.includes("Budi Santoso"));

  // TEST 7: Identitas anonim
  console.log("\n[TEST 7] Identitas anonim (belum login)");
  const res7 = await executeTetraChat({
    userInput: "nama saya siapa",
    messages: [],
    context: landingContext,
  });
  assert(
    "Menolak tebak nama & minta login",
    res7.message.includes("belum masuk") ||
      res7.message.includes("belum login") ||
      res7.message.includes("belum mengetahui")
  );
  assert("Tidak mengarang nama", !res7.message.includes("Budi"));

  // TEST 8: Quick action RS
  console.log("\n[TEST 8] Cari Rumah Sakit Rujukan");
  const res8 = await executeTetraChat({
    userInput: "Cari Rumah Sakit Rujukan",
    messages: [],
    context: landingContext,
  });
  console.log("  Intent:", res8.intent);
  assert("Ada rekomendasi RS", (res8.recommendations?.length ?? 0) > 0);

  // ============================================================
  // BLOK B — TES IDENTITAS (10 skenario)
  // ============================================================
  console.log("\n\n=== BLOK B — TES IDENTITAS (isSelfIdentityQuery) ===");

  // B-1: Frasa baku formal
  console.log("\n[B-1] Variasi formal standar");
  assert("'nama saya' terdeteksi", isSelfIdentityQuery("nama saya"));
  assert("'siapa nama saya?' terdeteksi", isSelfIdentityQuery("siapa nama saya?"));
  assert("'siapa aku?' terdeteksi", isSelfIdentityQuery("siapa aku?"));
  assert("'aku siapa?' terdeteksi", isSelfIdentityQuery("aku siapa?"));
  assert("'saya ini siapa?' terdeteksi", isSelfIdentityQuery("saya ini siapa?"));
  assert("'nama lengkap saya apa?' terdeteksi", isSelfIdentityQuery("nama lengkap saya apa?"));
  assert("'coba sebutkan nama saya' terdeteksi", isSelfIdentityQuery("coba sebutkan nama saya"));

  // B-2: Bahasa gaul / informal
  console.log("\n[B-2] Bahasa gaul dan informal");
  assert("'nama gw' terdeteksi", isSelfIdentityQuery("nama gw"));
  assert("'nama gw siapa?' terdeteksi", isSelfIdentityQuery("nama gw siapa?"));
  assert("'gw siapa?' terdeteksi", isSelfIdentityQuery("gw siapa?"));
  assert("'gue siapa?' terdeteksi", isSelfIdentityQuery("gue siapa?"));
  assert("'aku siapa sih?' terdeteksi", isSelfIdentityQuery("aku siapa sih?"));
  assert("'gua namanya siapa?' terdeteksi", isSelfIdentityQuery("gua namanya siapa?"));
  assert("'nama gue apa?' terdeteksi", isSelfIdentityQuery("nama gue apa?"));
  assert("'emang aku siapa?' terdeteksi", isSelfIdentityQuery("emang aku siapa?"));
  assert("'gue ini siapa?' terdeteksi", isSelfIdentityQuery("gue ini siapa?"));

  // B-3: Pertanyaan tidak langsung
  console.log("\n[B-3] Pertanyaan tidak langsung");
  assert("'kamu tahu aku siapa?' terdeteksi", isSelfIdentityQuery("kamu tahu aku siapa?"));
  assert("'kamu ingat siapa aku?' terdeteksi", isSelfIdentityQuery("kamu ingat siapa aku?"));
  assert("'ingat nama gue nggak?' terdeteksi", isSelfIdentityQuery("ingat nama gue nggak?"));
  assert("'lu tahu gue siapa?' terdeteksi", isSelfIdentityQuery("lu tahu gue siapa?"));

  // B-4: Pertanyaan lanjutan berbasis konteks
  console.log("\n[B-4] Pertanyaan lanjutan berbasis konteks percakapan");
  assert("'tadi aku bilang namaku siapa?' terdeteksi", isSelfIdentityQuery("tadi aku bilang namaku siapa?"));
  assert(
    "'nama lengkapnya sekalian' (follow-up) terdeteksi",
    isSelfIdentityQuery("nama lengkapnya sekalian", [
      { role: "user", content: "siapa nama saya?" },
      { role: "assistant", content: "Nama kamu adalah Budi Santoso." },
    ])
  );
  assert("'kalau nama lengkapku?' terdeteksi", isSelfIdentityQuery("kalau nama lengkapku?"));
  assert("'terus identitas aku apa?' terdeteksi", isSelfIdentityQuery("terus identitas aku apa?"));

  // B-5: Bahasa Inggris
  console.log("\n[B-5] Bahasa Inggris");
  assert("'what is my name?' terdeteksi", isSelfIdentityQuery("what is my name?"));
  assert("'who am i?' terdeteksi", isSelfIdentityQuery("who am i?"));

  // B-6: Identitas orang LAIN (harus false)
  console.log("\n[B-6] Identitas orang lain — harus TIDAK terdeteksi");
  assert("'siapa nama dokter itu?' BUKAN identitas diri", !isSelfIdentityQuery("siapa nama dokter itu?"));
  assert("'nama pasien itu siapa?' BUKAN identitas diri", !isSelfIdentityQuery("nama pasien itu siapa?"));
  assert("'siapa nama tokoh utama cerita ini?' BUKAN identitas diri", !isSelfIdentityQuery("siapa nama tokoh utama cerita ini?"));
  assert("'siapa presiden RI?' BUKAN identitas diri", !isSelfIdentityQuery("siapa presiden RI?"));

  // B-7: Pertanyaan edukatif (harus false)
  console.log("\n[B-7] Pertanyaan edukatif — harus TIDAK terdeteksi");
  assert("'apa arti nama?' BUKAN identitas diri", !isSelfIdentityQuery("apa arti nama?"));
  assert("'apa makna nama seseorang?' BUKAN identitas diri", !isSelfIdentityQuery("apa makna nama seseorang?"));

  // B-8: Belum login → engine tolak, minta login
  console.log("\n[B-8] Belum login meminta identitas (engine test)");
  const rb8 = await executeTetraChat({
    userInput: "siapa aku?",
    messages: [],
    context: landingContext,
  });
  assert(
    "Menyatakan belum mengetahui / minta login",
    rb8.message.includes("belum masuk") ||
      rb8.message.includes("belum login") ||
      rb8.message.includes("belum mengetahui")
  );
  assert("Tidak mengarang nama anonim", !rb8.message.includes("Budi"));

  // B-9: Sudah login — nama tersedia / nama kosong
  console.log("\n[B-9] Sudah login — nama tersedia dan nama kosong");
  const rb9a = await executeTetraChat({
    userInput: "gue siapa?",
    messages: [],
    context: loggedInContext,
  });
  assert("Nama tersedia → menyebut Budi Santoso", rb9a.message.includes("Budi Santoso"));

  const rb9b = await executeTetraChat({
    userInput: "siapa nama saya?",
    messages: [],
    context: emptyNameContext,
  });
  assert(
    "Nama kosong → menyatakan belum tercatat / tidak tersedia",
    rb9b.message.includes("belum tercatat") ||
      rb9b.message.includes("tidak tersedia") ||
      rb9b.message.includes("belum diisi") ||
      rb9b.message.includes("tidak ditemukan")
  );

  // B-10: Identitas dikenali — NIK wajib tidak bocor
  console.log("\n[B-10] Identitas dikenali — NIK wajib tidak disebutkan");
  const rb10 = await executeTetraChat({
    userInput: "siapa aku? dan NIK ku berapa?",
    messages: [],
    context: loggedInContext,
  });
  assert("Menyebut nama (identitas dikenali)", rb10.message.includes("Budi Santoso"));
  assert("Tidak mengungkapkan NIK 16 digit", !rb10.message.match(/\b\d{16}\b/));

  // ============================================================
  // RINGKASAN
  // ============================================================
  console.log(`\n=== TEST SELESAI — PASS: ${passCount} | FAIL: ${failCount} ===`);
  if (failCount > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
