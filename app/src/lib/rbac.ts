// M2 RBAC: matriks hak akses per peran (PRD bagian 3, 6, dan 7).
// File ini murni (tanpa akses DB/cookie) supaya bisa dipakai di server maupun client.
// Penegakan sebenarnya ada di src/lib/auth.ts (M2-05: di sisi server).
import type { Role } from "@/db/schema";

export type { Role };

export const ROLES: readonly Role[] = ["superadmin", "supervisor", "teknisi", "manajer", "analis"];

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: "Superadmin",
  supervisor: "Supervisor Wilayah",
  teknisi: "Teknisi Lapangan",
  manajer: "Manajer Operasional",
  analis: "Analis Data",
};

export const PERMISSIONS = [
  "users:manage", // kelola akun, peran, wilayah (M1-02)
  "audit:read", // penelusuran audit log (M3-05)
  "dashboard:view",
  "merchants:read", // lihat master merchant & perangkat, dibatasi wilayah
  "merchants:manage", // daftarkan/ubah merchant di wilayahnya
  "devices:manage", // tambah/ubah perangkat merchant di wilayahnya
  "complaints:read", // daftar/detail aduan (M4)
  "complaints:approve", // setujui/tolak aduan (M4-03)
  "assignments:manage", // tugaskan teknisi, reassign (M5)
  "tasks:work", // terima/tolak tugas, isi kunjungan, unggah foto (M5-02, M6)
  "review_queue:review", // antrean cek manusia foto (M7-07)
  "cv_corrections:review", // koreksi data latih CV (M7-08)
  "tanya_data:query", // Vanna text-to-SQL (M9)
  "sql:correct", // koreksi SQL Vanna (M9-07)
  "training_data:manage", // data latih
  "anomaly_threshold:configure", // ambang anomali (M10-02)
  "reports:read", // laporan anomali/aduan/kunjungan (M11)
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  superadmin: ["users:manage", "audit:read"],
  supervisor: [
    "dashboard:view",
    "merchants:read",
    "merchants:manage",
    "devices:manage",
    "complaints:read",
    "complaints:approve",
    "assignments:manage",
    "review_queue:review",
    "tanya_data:query",
  ],
  teknisi: ["dashboard:view", "complaints:read", "tasks:work"],
  // M2-04: manajer melihat semua wilayah, hanya baca. Tidak ada izin tulis.
  manajer: ["dashboard:view", "merchants:read", "complaints:read", "reports:read", "tanya_data:query"],
  analis: [
    "audit:read",
    "merchants:read",
    "sql:correct",
    "training_data:manage",
    "anomaly_threshold:configure",
    "cv_corrections:review",
  ],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

// Cakupan data per peran (PRD bagian 3).
// - region: hanya wilayah yang ditautkan ke pengguna (BRL-07)
// - own: hanya tugas yang ditugaskan ke pengguna itu
// - all: semua wilayah
// - none: tidak mengakses data operasional (hanya konfigurasi sistem)
export type DataScope = "region" | "own" | "all" | "none";

export const ROLE_SCOPE: Record<Role, DataScope> = {
  superadmin: "none",
  supervisor: "region",
  teknisi: "own",
  manajer: "all",
  analis: "all", // data analitik dengan masking (M3-04)
};

// Peran yang wajib punya minimal satu wilayah.
export const ROLES_REQUIRING_REGION: readonly Role[] = ["supervisor", "teknisi"];

// PRD bagian 3: Analis memakai data analitik dengan masking. Nama pemilik, alamat,
// telepon, dan email merchant disamarkan saat ditampilkan untuk peran ini.
export const ROLES_WITH_MASKED_PII: readonly Role[] = ["analis"];

export function masksPII(role: Role): boolean {
  return ROLES_WITH_MASKED_PII.includes(role);
}

export type MenuItem = {
  href: string;
  label: string;
  permission: Permission;
  modul: string; // modul PRD pemilik halaman
};

// PRD bagian 7: menu per peran.
export const ROLE_MENUS: Record<Role, readonly MenuItem[]> = {
  superadmin: [
    { href: "/admin/users", label: "Manajemen Pengguna", permission: "users:manage", modul: "M1/M2" },
    { href: "/admin/regions", label: "Peran dan Wilayah", permission: "users:manage", modul: "M2" },
    { href: "/admin/audit", label: "Audit Log", permission: "audit:read", modul: "M3" },
  ],
  supervisor: [
    { href: "/dashboard", label: "Dashboard", permission: "dashboard:view", modul: "M11" },
    { href: "/aduan", label: "Daftar Aduan", permission: "complaints:read", modul: "M4" },
    { href: "/assignment", label: "Assignment", permission: "assignments:manage", modul: "M5" },
    { href: "/antrean-cek", label: "Antrean Cek Manusia", permission: "review_queue:review", modul: "M7" },
    { href: "/tanya-data", label: "Tanya Data", permission: "tanya_data:query", modul: "M9" },
    { href: "/merchants", label: "Master Merchant", permission: "merchants:read", modul: "Master" },
    { href: "/perangkat", label: "Master Perangkat", permission: "merchants:read", modul: "Master" },
  ],
  teknisi: [
    { href: "/dashboard", label: "Dashboard", permission: "dashboard:view", modul: "M11" },
    { href: "/tugas", label: "Daftar Tugas", permission: "tasks:work", modul: "M5" },
    { href: "/kunjungan", label: "Detail Kunjungan", permission: "tasks:work", modul: "M6" },
    { href: "/kunjungan/upload", label: "Upload Foto Kunjungan", permission: "tasks:work", modul: "M6" },
    { href: "/laporan-aduan", label: "Laporan Aduan", permission: "tasks:work", modul: "M4" },
  ],
  manajer: [
    { href: "/dashboard", label: "Dashboard", permission: "dashboard:view", modul: "M11" },
    { href: "/laporan/anomali", label: "Laporan Anomali", permission: "reports:read", modul: "M10/M11" },
    { href: "/laporan/aduan", label: "Laporan Aduan Wilayah", permission: "reports:read", modul: "M11" },
    { href: "/laporan/kunjungan", label: "Laporan Kunjungan", permission: "reports:read", modul: "M11" },
    { href: "/tanya-data", label: "Tanya Data", permission: "tanya_data:query", modul: "M9" },
    { href: "/merchants", label: "Master Merchant", permission: "merchants:read", modul: "Master" },
    { href: "/perangkat", label: "Master Perangkat", permission: "merchants:read", modul: "Master" },
  ],
  analis: [
    { href: "/analis/koreksi-sql", label: "Koreksi SQL", permission: "sql:correct", modul: "M9" },
    { href: "/analis/data-latih", label: "Data Latih", permission: "training_data:manage", modul: "M9/M7" },
    {
      href: "/analis/ambang-anomali",
      label: "Pengaturan Ambang Anomali",
      permission: "anomaly_threshold:configure",
      modul: "M10",
    },
    { href: "/analis/koreksi-cv", label: "Antrean Koreksi CV", permission: "cv_corrections:review", modul: "M7" },
    { href: "/merchants", label: "Master Merchant", permission: "merchants:read", modul: "Master" },
    { href: "/perangkat", label: "Master Perangkat", permission: "merchants:read", modul: "Master" },
    // M3-05: penelusuran log juga untuk Analis Data.
    { href: "/admin/audit", label: "Audit Log", permission: "audit:read", modul: "M3" },
  ],
};

// Semua halaman yang terdaftar, untuk mencocokkan URL ke izin yang dibutuhkan.
export const ALL_MENU_ITEMS: readonly MenuItem[] = Object.values(ROLE_MENUS)
  .flat()
  .filter((item, i, arr) => arr.findIndex((x) => x.href === item.href) === i);

export function homeFor(role: Role): string {
  return ROLE_MENUS[role][0].href;
}
