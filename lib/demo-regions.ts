export interface Province {
  id: string;
  name: string;
}

export interface Regency {
  id: string;
  provinceId: string;
  name: string;
}

export interface District {
  id: string;
  regencyId: string;
  name: string;
}

export interface SubDistrict {
  id: string;
  districtId: string;
  name: string;
}

export const DEMO_PROVINCES: Province[] = [
  { id: "33", name: "Jawa Tengah" },
  { id: "32", name: "Jawa Barat" },
  { id: "31", name: "DKI Jakarta" },
  { id: "35", name: "Jawa Timur" },
];

export const DEMO_REGENCIES: Regency[] = [
  { id: "3374", provinceId: "33", name: "Kota Semarang" },
  { id: "3322", provinceId: "33", name: "Kabupaten Semarang" },
  { id: "3321", provinceId: "33", name: "Kabupaten Demak" },
  { id: "3324", provinceId: "33", name: "Kabupaten Kendal" },
];

export const DEMO_DISTRICTS: District[] = [
  { id: "337401", regencyId: "3374", name: "Semarang Tengah" },
  { id: "337402", regencyId: "3374", name: "Semarang Selatan" },
  { id: "337403", regencyId: "3374", name: "Banyumanik" },
  { id: "337404", regencyId: "3374", name: "Ngaliyan" },
  { id: "337405", regencyId: "3374", name: "Tembalang" },
  { id: "337406", regencyId: "3374", name: "Candisari" },
  { id: "337407", regencyId: "3374", name: "Pedurungan" },
  { id: "337408", regencyId: "3374", name: "Mijen" },
];

export const DEMO_SUBDISTRICTS: SubDistrict[] = [
  // Semarang Tengah
  { id: "33740101", districtId: "337401", name: "Pekunden" },
  { id: "33740102", districtId: "337401", name: "Sekayu" },
  { id: "33740103", districtId: "337401", name: "Pandansari" },
  { id: "33740104", districtId: "337401", name: "Miroto" },

  // Semarang Selatan
  { id: "33740201", districtId: "337402", name: "Pleburan" },
  { id: "33740202", districtId: "337402", name: "Peterongan" },
  { id: "33740203", districtId: "337402", name: "Randusari" },

  // Banyumanik
  { id: "33740301", districtId: "337403", name: "Srondol Kulon" },
  { id: "33740302", districtId: "337403", name: "Srondol Wetan" },
  { id: "33740303", districtId: "337403", name: "Pudakpayung" },
  { id: "33740304", districtId: "337403", name: "Gedawang" },

  // Ngaliyan
  { id: "33740401", districtId: "337404", name: "Ngaliyan" },
  { id: "33740402", districtId: "337404", name: "Tambakaji" },
  { id: "33740403", districtId: "337404", name: "Kalipancur" },

  // Tembalang
  { id: "33740501", districtId: "337405", name: "Tembalang" },
  { id: "33740502", districtId: "337405", name: "Bulusan" },
  { id: "33740503", districtId: "337405", name: "Kramas" },

  // Candisari
  { id: "33740601", districtId: "337406", name: "Candi" },
  { id: "33740602", districtId: "337406", name: "Jatingaleh" },
  { id: "33740603", districtId: "337406", name: "Karanganyar Gunung" },

  // Pedurungan
  { id: "33740701", districtId: "337407", name: "Pedurungan Kidul" },
  { id: "33740702", districtId: "337407", name: "Pedurungan Lor" },
  { id: "33740703", districtId: "337407", name: "Tlogomulyo" },

  // Mijen
  { id: "33740801", districtId: "337408", name: "Mijen" },
  { id: "33740802", districtId: "337408", name: "Pesantren" },
  { id: "33740803", districtId: "337408", name: "Jatibarang" },
];
