/**
 * Helper normalisasi nama wilayah Indonesia ke Title Case.
 * Mempertahankan singkatan resmi seperti "DKI" dan "DI", serta angka Romawi.
 * Contoh:
 * - "JAWA TENGAH" -> "Jawa Tengah"
 * - "KABUPATEN SIMEULUE" -> "Kabupaten Simeulue"
 * - "DKI JAKARTA" -> "DKI Jakarta"
 * - "DI YOGYAKARTA" -> "DI Yogyakarta"
 */
export function formatRegionName(name: string): string {
  if (!name) return "";

  // Singkatan dan angka Romawi yang harus tetap kapital
  const keepUpper = new Set([
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

  return name
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((word) => {
      const upper = word.toUpperCase();
      if (keepUpper.has(upper)) {
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
