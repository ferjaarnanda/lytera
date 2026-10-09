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

import { classifyTetraIntent } from "../lib/tetra/router";
import { searchDoctorsWithLocationHierarchy } from "../lib/tetra/tools";
import { executeTetraChat } from "../lib/tetra/engine";
import { TetraUserContext } from "../lib/tetra/types";

async function runTests() {
  console.log("=== MEMULAI TEST SUITE TETRA INTELLIGENCE (DENGAN DATA NYATA SUPABASE) ===");

  // TEST 1: Izin akses 6 digit
  console.log("\n[TEST 1] Pertanyaan tentang izin akses 6 digit");
  const res1 = await executeTetraChat({
    userInput: "Apa itu izin akses 6 digit?",
    messages: [],
    context: { role: "landing", page: "/" },
  });
  console.log("Intent:", res1.intent);
  console.log("Pesan memuat 'UU Perlindungan Data Pribadi'?", res1.message.includes("UU Perlindungan Data Pribadi"));
  console.log("Ada kartu faskes?", res1.recommendations !== undefined ? "ADA (GAGAL)" : "TIDAK (PASS)");

  // TEST 2: Penjelasan alur rujukan
  console.log("\n[TEST 2] Penjelasan alur rujukan");
  const res2 = await executeTetraChat({
    userInput: "Bagaimana alur rujukan di Lytera?",
    messages: [],
    context: { role: "landing", page: "/" },
  });
  console.log("Intent:", res2.intent);
  console.log("Pesan memuat 'Faskes Primer'?", res2.message.includes("Faskes Primer"));
  console.log("Ada kartu faskes?", res2.recommendations !== undefined ? "ADA (GAGAL)" : "TIDAK (PASS)");

  // TEST 3: Pencarian dokter dengan spesialisasi dan wilayah yang ADA (Semarang)
  console.log("\n[TEST 3] Pencarian dokter spesialis penyakit dalam di Semarang");
  const res3 = await executeTetraChat({
    userInput: "Cari dokter spesialis penyakit dalam di Semarang",
    messages: [],
    context: { role: "landing", page: "/" },
  });
  console.log("Intent:", res3.intent);
  console.log("Jumlah rekomendasi dokter:", res3.recommendations?.length);
  if (res3.recommendations && res3.recommendations.length > 0) {
    console.log("Dokter ditemukan:", res3.recommendations[0].name, "-", res3.recommendations[0].category, "-", res3.recommendations[0].location);
  }

  // TEST 4 & 5: Pencarian dokter spesialis penyakit dalam di Solo (Solo tidak ada -> alternatif Semarang)
  console.log("\n[TEST 4 & 5] Pencarian dokter di Solo (wilayah awal kosong -> alternatif wilayah lain)");
  const res4 = await executeTetraChat({
    userInput: "Cari dokter spesialis penyakit dalam di Solo",
    messages: [],
    context: { role: "landing", page: "/" },
  });
  console.log("Intent:", res4.intent);
  console.log("Menjelaskan Solo tidak ditemukan?", res4.message.includes("Solo"));
  console.log("Menyebutkan alternatif wilayah lain?", res4.message.includes("alternatif"));
  console.log("Jumlah rekomendasi alternatif:", res4.recommendations?.length);
  if (res4.recommendations && res4.recommendations.length > 0) {
    console.log("Dokter alternatif:", res4.recommendations[0].name, "-", res4.recommendations[0].location);
  }

  // TEST: Pencarian dokter spesialis jantung di Solo (Spesialisasi jantung belum ada di sistem sama sekali)
  console.log("\n[TEST SPESIALISASI KOSONG] Cari dokter spesialis jantung di Solo");
  const resSpec = await executeTetraChat({
    userInput: "Cari dokter spesialis jantung di Solo",
    messages: [],
    context: { role: "landing", page: "/" },
  });
  console.log("Intent:", resSpec.intent);
  console.log("Menjelaskan belum ditemukan spesialis jantung?", resSpec.message.includes("Jantung"));
  console.log("Menyarankan RS rujukan terdekat?", resSpec.message.includes("Rumah Sakit"));

  // TEST 6: Konteks Pasien dan Pasien Keluarga
  console.log("\n[TEST 6] Penggunaan konteks pasien keluarga");
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
  console.log("Mengenali nama Budi Santoso?", res6.message.includes("Budi Santoso"));
  console.log("Peran Pasien Keluarga?", res6.message.includes("Pasien Keluarga"));

  // TEST 7: Pertanyaan identitas anonim (Landing) vs Login
  console.log("\n[TEST 7] Identitas anonim saat di Landing page");
  const res7 = await executeTetraChat({
    userInput: "nama saya siapa",
    messages: [],
    context: { role: "landing", page: "/" },
  });
  console.log("Menolak tebak nama & menyatakan belum login?", res7.message.includes("belum masuk") || res7.message.includes("belum login"));

  // TEST 8: Quick Action
  console.log("\n[TEST 8] Quick action: 'Cari Rumah Sakit Rujukan'");
  const res8 = await executeTetraChat({
    userInput: "Cari Rumah Sakit Rujukan",
    messages: [],
    context: { role: "landing", page: "/" },
  });
  console.log("Intent:", res8.intent);
  console.log("Ada rekomendasi RS?", res8.recommendations && res8.recommendations.length > 0);
  if (res8.recommendations && res8.recommendations.length > 0) {
    console.log("RS ditemukan:", res8.recommendations[0].name);
  }

  console.log("\n=== TEST SELESAI DENGAN SUKSES ===");
}

runTests().catch(console.error);
