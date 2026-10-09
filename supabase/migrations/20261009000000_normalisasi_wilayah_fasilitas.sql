-- Migrasi: Normalisasi wilayah fasilitas dari kode administratif ke nama manusiawi
-- Data lama menyimpan kode Kemendagri: province='33', city='3374', district='337401'
-- Setelah migrasi: province='Jawa Tengah', city='Kota Semarang', district='Semarang Tengah'
-- Pemetaan ini konsisten dengan format yang digunakan oleh patients dan verifier_profiles.
-- RLS dan trigger trg_guard_facilities tidak terpengaruh (hanya menjaga kolom status).

UPDATE public.facilities
SET
  province = 'Jawa Tengah',
  city     = 'Kota Semarang',
  district = 'Semarang Tengah'
WHERE
  province = '33'
  AND city = '3374'
  AND district = '337401';
