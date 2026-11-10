// Data demo untuk `npm run db:seed` dan test e2e. Nilai uji untuk pengembangan lokal saja.
import type { Role } from "./schema";

export const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "EdcDemo#2026";

export const REGIONS = ["DKI Jakarta", "Jawa Barat", "Jawa Timur"];

export const USERS: { nama: string; email: string; role: Role; wilayah: string[] }[] = [
  { nama: "Super Admin", email: "admin@pusatkendali.test", role: "superadmin", wilayah: [] },
  { nama: "Sinta (SPV Jakarta)", email: "spv.jakarta@pusatkendali.test", role: "supervisor", wilayah: ["DKI Jakarta"] },
  { nama: "Bayu (SPV Jabar)", email: "spv.jabar@pusatkendali.test", role: "supervisor", wilayah: ["Jawa Barat"] },
  { nama: "Andi (Teknisi Jakarta)", email: "teknisi.jakarta@pusatkendali.test", role: "teknisi", wilayah: ["DKI Jakarta"] },
  { nama: "Rudi (Teknisi Jabar)", email: "teknisi.jabar@pusatkendali.test", role: "teknisi", wilayah: ["Jawa Barat"] },
  { nama: "Maya (Manajer Ops)", email: "manajer@pusatkendali.test", role: "manajer", wilayah: [] },
  { nama: "Dewi (Analis Data)", email: "analis@pusatkendali.test", role: "analis", wilayah: [] },
];

export const MERCHANTS: { merchantId: string; nama: string; wilayah: string }[] = [
  { merchantId: "MRC-000101", nama: "Toko Sumber Rejeki", wilayah: "DKI Jakarta" },
  { merchantId: "MRC-000102", nama: "Kopi Kenangan Senja", wilayah: "DKI Jakarta" },
  { merchantId: "MRC-000103", nama: "Apotek Sehat Selalu", wilayah: "DKI Jakarta" },
  { merchantId: "MRC-000201", nama: "Warung Sunda Asri", wilayah: "Jawa Barat" },
  { merchantId: "MRC-000202", nama: "Batik Parahyangan", wilayah: "Jawa Barat" },
  { merchantId: "MRC-000301", nama: "Bakso Arema Jaya", wilayah: "Jawa Timur" },
  { merchantId: "MRC-000302", nama: "Toko Elektronik Surya", wilayah: "Jawa Timur" },
];
