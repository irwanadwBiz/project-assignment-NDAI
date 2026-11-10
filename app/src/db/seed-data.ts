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

export type SeedMerchant = {
  kodeMerchant: string;
  nama: string;
  pemilik: string;
  alamat: string;
  kabupaten: string;
  telepon: string;
  email: string | null;
  wilayah: string;
  /** Email petugas yang mendaftarkan; null = data awal. */
  didaftarkanOleh: string | null;
};

// Data fiktif untuk demo. Nomor telepon dan email bukan milik orang sungguhan.
export const MERCHANTS: SeedMerchant[] = [
  {
    kodeMerchant: "MRC-000101",
    nama: "Toko Sumber Rejeki",
    pemilik: "Hendra Wijaya",
    alamat: "Jl. Pasar Baru No. 12",
    kabupaten: "Kota Jakarta Pusat",
    telepon: "081200000101",
    email: "sumberrejeki@contoh.test",
    wilayah: "DKI Jakarta",
    didaftarkanOleh: "spv.jakarta@pusatkendali.test",
  },
  {
    kodeMerchant: "MRC-000102",
    nama: "Kopi Kenangan Senja",
    pemilik: "Rina Marlina",
    alamat: "Jl. Kemang Raya No. 45",
    kabupaten: "Kota Jakarta Selatan",
    telepon: "081200000102",
    email: "kopisenja@contoh.test",
    wilayah: "DKI Jakarta",
    didaftarkanOleh: "spv.jakarta@pusatkendali.test",
  },
  {
    kodeMerchant: "MRC-000103",
    nama: "Apotek Sehat Selalu",
    pemilik: "Dr. Agus Salim",
    alamat: "Jl. Pramuka No. 8",
    kabupaten: "Kota Jakarta Timur",
    telepon: "081200000103",
    email: null,
    wilayah: "DKI Jakarta",
    didaftarkanOleh: "spv.jakarta@pusatkendali.test",
  },
  {
    kodeMerchant: "MRC-000201",
    nama: "Warung Sunda Asri",
    pemilik: "Ujang Sutisna",
    alamat: "Jl. Cihampelas No. 77",
    kabupaten: "Kota Bandung",
    telepon: "081200000201",
    email: "sundaasri@contoh.test",
    wilayah: "Jawa Barat",
    didaftarkanOleh: "spv.jabar@pusatkendali.test",
  },
  {
    kodeMerchant: "MRC-000202",
    nama: "Batik Parahyangan",
    pemilik: "Neng Siti Aisyah",
    alamat: "Jl. Raya Tasik No. 3",
    kabupaten: "Kabupaten Tasikmalaya",
    telepon: "081200000202",
    email: null,
    wilayah: "Jawa Barat",
    didaftarkanOleh: "spv.jabar@pusatkendali.test",
  },
  {
    kodeMerchant: "MRC-000301",
    nama: "Bakso Arema Jaya",
    pemilik: "Slamet Riyadi",
    alamat: "Jl. Ijen No. 21",
    kabupaten: "Kota Malang",
    telepon: "081200000301",
    email: "baksoarema@contoh.test",
    wilayah: "Jawa Timur",
    didaftarkanOleh: null,
  },
  {
    kodeMerchant: "MRC-000302",
    nama: "Toko Elektronik Surya",
    pemilik: "Budi Santoso",
    alamat: "Jl. Tunjungan No. 100",
    kabupaten: "Kota Surabaya",
    telepon: "081200000302",
    email: "elektroniksurya@contoh.test",
    wilayah: "Jawa Timur",
    didaftarkanOleh: null,
  },
];

export type SeedDevice = {
  kodeMerchant: string;
  serialNumber: string;
  merk: string;
  tipePerangkat: string;
  firmwareTerakhir: string;
};

// Satu merchant bisa punya satu atau banyak perangkat.
export const DEVICES: SeedDevice[] = [
  { kodeMerchant: "MRC-000101", serialNumber: "SN-ING-1001", merk: "Ingenico", tipePerangkat: "Move/5000", firmwareTerakhir: "v11.2.4" },
  { kodeMerchant: "MRC-000101", serialNumber: "SN-ING-1002", merk: "Ingenico", tipePerangkat: "Move/5000", firmwareTerakhir: "v11.2.4" },
  { kodeMerchant: "MRC-000102", serialNumber: "SN-PAX-2001", merk: "PAX", tipePerangkat: "A920", firmwareTerakhir: "v8.1.0" },
  { kodeMerchant: "MRC-000103", serialNumber: "SN-VFN-3001", merk: "Verifone", tipePerangkat: "V240m", firmwareTerakhir: "v3.9.2" },
  { kodeMerchant: "MRC-000201", serialNumber: "SN-PAX-2002", merk: "PAX", tipePerangkat: "A920", firmwareTerakhir: "v8.0.7" },
  { kodeMerchant: "MRC-000201", serialNumber: "SN-PAX-2003", merk: "PAX", tipePerangkat: "A920 Pro", firmwareTerakhir: "v8.1.0" },
  { kodeMerchant: "MRC-000201", serialNumber: "SN-ING-1003", merk: "Ingenico", tipePerangkat: "Desk/3500", firmwareTerakhir: "v11.1.9" },
  { kodeMerchant: "MRC-000202", serialNumber: "SN-SNM-4001", merk: "Sunmi", tipePerangkat: "P2 Pro", firmwareTerakhir: "v2.5.3" },
  { kodeMerchant: "MRC-000301", serialNumber: "SN-VFN-3002", merk: "Verifone", tipePerangkat: "V240m", firmwareTerakhir: "v3.8.0" },
  { kodeMerchant: "MRC-000302", serialNumber: "SN-PAX-2004", merk: "PAX", tipePerangkat: "A920", firmwareTerakhir: "v8.1.0" },
  { kodeMerchant: "MRC-000302", serialNumber: "SN-SNM-4002", merk: "Sunmi", tipePerangkat: "P2 Pro", firmwareTerakhir: "v2.5.1" },
];
