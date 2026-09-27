/**
 * lib/form-helpers.ts
 *
 * Helper bersama untuk penanganan validasi, stepper error state,
 * penentuan langkah (step) dari field yang gagal validasi, dan auto-focus field.
 */

export const COMMON_VALIDATION_ERROR_BANNER =
  "Ada isian yang belum sesuai, periksa kembali";

/**
 * Menentukan indeks langkah (0-indexed) di mana suatu field berada
 * berdasarkan peran, subperan, dan jalur (admin vs nakes).
 */
export function getFieldStep(
  peran: string,
  subperan: string,
  jalurFaskes: "admin" | "nakes",
  fieldName: string
): number {
  const f = fieldName.toLowerCase();

  // 1. PASIEN PRIBADI (3 Langkah: 0=Identitas, 1=Alamat & Medis, 2=Verifikasi)
  if (peran === "pasien" && subperan === "pribadi") {
    if (["nik", "nama", "tanggallahir", "jeniskelamin", "nohp"].includes(f)) {
      return 0;
    }
    if (
      [
        "provinsi",
        "kota",
        "kecamatan",
        "kelurahan",
        "alamatdetail",
        "nobpjs",
        "riwayatalergi",
      ].includes(f)
    ) {
      return 1;
    }
    if (
      [
        "email",
        "password",
        "konfirmasipassword",
        "setujuketentuan",
        "otp",
      ].includes(f)
    ) {
      return 2;
    }
    return 0;
  }

  // 2. PASIEN KELUARGA (4 Langkah: 0=Data Wali, 1=KK, 2=Anggota, 3=Verifikasi)
  if (peran === "pasien" && subperan === "keluarga") {
    if (["nikwali", "namawali", "nohpwali", "hubunganwali"].includes(f)) {
      return 0;
    }
    if (["nokk", "file", "berkaskk"].includes(f)) {
      return 1;
    }
    if (f.startsWith("anggota") || f === "anggotakeluarga") {
      return 2;
    }
    if (
      [
        "email",
        "emailwali",
        "password",
        "passwordwali",
        "konfirmasipassword",
        "konfirmasipasswordwali",
        "setujuketentuan",
        "otp",
      ].includes(f)
    ) {
      return 3;
    }
    return 0;
  }

  // 3. FASILITAS (3 Langkah: 0, 1, 2)
  if (peran === "fasilitas") {
    if (jalurFaskes === "admin") {
      if (
        [
          "namafaskes",
          "kodefaskes",
          "provinsi",
          "kota",
          "kecamatan",
          "kelurahan",
          "alamatlengkap",
          "notelp",
        ].includes(f)
      ) {
        return 0;
      }
      if (
        [
          "file",
          "berkasizin",
          "penanggungjawab",
          "emailfaskes",
          "email",
        ].includes(f)
      ) {
        return 1;
      }
      if (
        ["password", "konfirmasipassword", "setujuketentuan"].includes(f)
      ) {
        return 2;
      }
    } else {
      // Tenaga Kesehatan (Nakes)
      if (["namalengkap", "nama", "nik", "profesi", "nostr"].includes(f)) {
        return 0;
      }
      if (["metodefaskes", "kodeundangan", "faskestujuan"].includes(f)) {
        return 1;
      }
      if (
        ["email", "password", "konfirmasipassword", "setujusumpah"].includes(f)
      ) {
        return 2;
      }
    }
    return 0;
  }

  // 4. VERIFIKATOR (3 Langkah: 0=Wilayah, 1=Data Pegawai, 2=Legalitas & Sandi)
  if (peran === "verifikator") {
    if (["provinsi", "kota", "kecamatan", "kelurahan"].includes(f)) {
      return 0;
    }
    if (
      [
        "namalengkap",
        "namapetugas",
        "nip",
        "nippetugas",
        "jabatan",
        "jabatanpetugas",
        "emaildinas",
        "email",
        "nohp",
      ].includes(f)
    ) {
      return 1;
    }
    if (
      [
        "file",
        "berkassk",
        "password",
        "konfirmasipassword",
        "setujuintegritas",
      ].includes(f)
    ) {
      return 2;
    }
    return 0;
  }

  return 0;
}

/**
 * Menemukan ID elemen DOM dari nama field agar dapat difokuskan.
 */
export function getFieldElementId(
  peran: string,
  subperan: string,
  jalurFaskes: "admin" | "nakes",
  fieldName: string
): string {
  const f = fieldName.toLowerCase();

  if (peran === "pasien" && subperan === "pribadi") {
    if (f === "email") return "emailPribadi";
    if (f === "password") return "passwordPribadi";
    if (f === "konfirmasipassword") return "konfirmasiPasswordPribadi";
    if (f === "setujuketentuan") return "setujuKetentuan";
    if (f === "otp") return "otp-input-0";
    return fieldName;
  }

  if (peran === "pasien" && subperan === "keluarga") {
    if (f === "email" || f === "emailwali") return "emailWali";
    if (f === "password" || f === "passwordwali") return "passwordWali";
    if (f === "konfirmasipassword" || f === "konfirmasipasswordwali")
      return "konfirmasiPasswordWali";
    if (f === "file" || f === "berkaskk") return "kk-file-dropzone";
    if (f === "setujuketentuan") return "setujuKeluarga";
    if (f === "otp") return "otp-input-0";
    if (f.startsWith("anggota_")) {
      // format: anggota_nama_0 -> anggota-nama-0
      return f.replace(/_/g, "-");
    }
    return fieldName;
  }

  if (peran === "fasilitas") {
    if (jalurFaskes === "admin") {
      if (f === "provinsi" || f === "faskesprovinsi") return "faskesProvinsi";
      if (f === "kota" || f === "faskeskota") return "faskesKota";
      if (f === "kecamatan" || f === "faskeskecamatan") return "faskesKecamatan";
      if (f === "kelurahan" || f === "faskeskelurahan") return "faskesKelurahan";
      if (f === "notelp") return "noTelpFaskes";
      if (f === "alamatlengkap") return "alamatLengkapFaskes";
      if (f === "file" || f === "berkasizin") return "izin-faskes-dropzone";
      if (f === "email" || f === "emailfaskes") return "emailFaskes";
      if (f === "password") return "passwordAdmin";
      if (f === "konfirmasipassword") return "konfirmasiPasswordAdmin";
      if (f === "setujuketentuan") return "setujuKetentuanAdmin";
      return fieldName;
    } else {
      if (f === "namalengkap") return "namaNakes";
      if (f === "email") return "emailNakes";
      if (f === "password") return "passwordNakes";
      if (f === "konfirmasipassword") return "konfirmasiPasswordNakes";
      if (f === "setujusumpah") return "setujuSumpah";
      return fieldName;
    }
  }

  if (peran === "verifikator") {
    if (f === "provinsi") return "provinsiVerif";
    if (f === "kota") return "kotaVerif";
    if (f === "kecamatan") return "kecamatanVerif";
    if (f === "kelurahan") return "kelurahanVerif";
    if (f === "namalengkap" || f === "namapetugas") return "namaPetugas";
    if (f === "nip" || f === "nippetugas") return "nipPetugas";
    if (f === "jabatan" || f === "jabatanpetugas") return "jabatanPetugas";
    if (f === "file" || f === "berkassk") return "sk-verifikator-dropzone";
    if (f === "password") return "passwordVerif";
    if (f === "konfirmasipassword") return "konfirmasiPasswordVerif";
    return fieldName;
  }

  return fieldName;
}

/**
 * Mencari langkah (step) terendah yang memiliki error, beserta field pertama pada langkah tersebut.
 */
export function findFirstErrorStepAndField(
  errors: Record<string, string>,
  peran: string,
  subperan: string,
  jalurFaskes: "admin" | "nakes"
): { targetStep: number; fieldName: string; elementId: string } | null {
  const errorKeys = Object.keys(errors);
  if (errorKeys.length === 0) return null;

  let lowestStep = Infinity;
  let chosenField = "";

  for (const field of errorKeys) {
    if (!errors[field]) continue;
    const step = getFieldStep(peran, subperan, jalurFaskes, field);
    if (step < lowestStep) {
      lowestStep = step;
      chosenField = field;
    }
  }

  if (lowestStep === Infinity || !chosenField) return null;

  const elementId = getFieldElementId(
    peran,
    subperan,
    jalurFaskes,
    chosenField
  );

  return {
    targetStep: lowestStep,
    fieldName: chosenField,
    elementId,
  };
}

/**
 * Mengembalikan set semua indeks langkah yang memuat setidaknya satu error.
 */
export function getErrorStepIndices(
  errors: Record<string, string>,
  peran: string,
  subperan: string,
  jalurFaskes: "admin" | "nakes"
): Set<number> {
  const set = new Set<number>();
  for (const [field, msg] of Object.entries(errors)) {
    if (msg) {
      set.add(getFieldStep(peran, subperan, jalurFaskes, field));
    }
  }
  return set;
}

/**
 * Memindahkan fokus dan menggulirkan viewport ke elemen input yang salah.
 */
export function focusAndScrollToField(elementId: string): void {
  if (typeof window === "undefined") return;

  setTimeout(() => {
    const el =
      document.getElementById(elementId) ||
      document.querySelector<HTMLElement>(`[name="${elementId}"]`) ||
      document.querySelector<HTMLElement>(`input[id*="${elementId}"]`);

    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 100);
}
