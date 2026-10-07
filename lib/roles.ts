export type RoleId = "pasien" | "fasilitas" | "verifikator" | "dinkes";

export type SubRoleId =
  // Pasien
  | "pribadi"
  | "keluarga"
  // Fasilitas
  | "puskesmas"
  | "klinik"
  | "rumah-sakit"
  | "apotek"
  // Verifikator
  | "kelurahan"
  | "kecamatan"
  | "dinas-sosial";

export interface SubRoleMeta {
  id: SubRoleId;
  name: string;
  description: string;
  roleId: RoleId;
}

export interface RoleMeta {
  id: RoleId;
  name: string;
  description: string;
  subRoles: SubRoleMeta[];
}

export const ROLES: Record<RoleId, RoleMeta> = {
  pasien: {
    id: "pasien",
    name: "Pasien",
    description: "Pantau rujukan dan atur siapa yang boleh membuka rekam medismu.",
    subRoles: [
      {
        id: "pribadi",
        name: "Pasien Pribadi",
        description: "Untuk data kesehatanmu sendiri",
        roleId: "pasien",
      },
      {
        id: "keluarga",
        name: "Pasien Keluarga",
        description: "Kelola data kesehatan anggota keluargamu",
        roleId: "pasien",
      },
    ],
  },
  fasilitas: {
    id: "fasilitas",
    name: "Fasilitas Kesehatan",
    description: "Dokter, petugas, dan apoteker bekerja dari satu tempat.",
    subRoles: [
      {
        id: "puskesmas",
        name: "Puskesmas",
        description: "Pusat Kesehatan Masyarakat tingkat pertama",
        roleId: "fasilitas",
      },
      {
        id: "klinik",
        name: "Klinik Pratama & Utama",
        description: "Fasilitas pelayanan kesehatan mandiri atau bersama",
        roleId: "fasilitas",
      },
      {
        id: "rumah-sakit",
        name: "Rumah Sakit",
        description: "Rumah Sakit Umum dan Khusus rujukan sekunder/tersier",
        roleId: "fasilitas",
      },
      {
        id: "apotek",
        name: "Apotek",
        description: "Pelayanan kefarmasian dan penebusan e-resep digital",
        roleId: "fasilitas",
      },
    ],
  },
  verifikator: {
    id: "verifikator",
    name: "Verifikasi Administrasi",
    description: "Opsional. Memverifikasi domisili dan keterangan kurang mampu untuk jaminan biaya. Tidak diperlukan untuk rujukan medis.",
    subRoles: [
      {
        id: "kelurahan",
        name: "Kelurahan / Desa",
        description: "Pemeriksaan surat pengantar dan domisili tingkat kelurahan",
        roleId: "verifikator",
      },
      {
        id: "kecamatan",
        name: "Kecamatan",
        description: "Verifikasi administrasi wilayah kecamatan",
        roleId: "verifikator",
      },
      {
        id: "dinas-sosial",
        name: "Dinas Sosial",
        description: "Verifikasi kepesertaan bansos dan SKTM",
        roleId: "verifikator",
      },
    ],
  },
  dinkes: {
    id: "dinkes",
    name: "Dinas Kesehatan",
    description: "Verifikasi fasilitas, atur aturan daerah, dan pantau rujukan.",
    subRoles: [], // Dinkes tidak memiliki sub-peran, masuk langsung
  },
};

export function isValidRole(role: string): role is RoleId {
  return role in ROLES;
}

export function isValidSubRole(role: string, subRole: string): boolean {
  if (!isValidRole(role)) return false;
  return ROLES[role].subRoles.some((s) => s.id === subRole);
}

export function getRoleMeta(role: string): RoleMeta | undefined {
  if (!isValidRole(role)) return undefined;
  return ROLES[role];
}

export function getSubRoleMeta(role: string, subRole: string): SubRoleMeta | undefined {
  if (!isValidRole(role)) return undefined;
  return ROLES[role].subRoles.find((s) => s.id === subRole);
}
