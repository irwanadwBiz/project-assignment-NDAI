// Akses data master merchant & perangkat untuk kode server.
// Semua pembacaan per objek lewat fungsi di sini supaya pembatasan wilayah (BRL-07)
// dan masking (PRD bagian 3, Analis) selalu diterapkan.
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { devices, merchants, regions, users } from "@/db/schema";
import { audit } from "@/lib/audit";
import { canAccessRegion, type CurrentUser } from "@/lib/auth";
import { maskDigits, maskEmail, maskName } from "@/lib/masking";
import { masksPII } from "@/lib/rbac";

const pendaftar = alias(users, "pendaftar");

export const merchantColumns = {
  id: merchants.id,
  kodeMerchant: merchants.kodeMerchant,
  nama: merchants.nama,
  pemilik: merchants.pemilik,
  alamat: merchants.alamat,
  kabupaten: merchants.kabupaten,
  telepon: merchants.telepon,
  email: merchants.email,
  regionId: merchants.regionId,
  wilayah: regions.nama,
  status: merchants.status,
  didaftarkanOlehNama: pendaftar.nama,
  dibuatPada: merchants.dibuatPada,
  diperbaruiPada: merchants.diperbaruiPada,
};

export function merchantBaseQuery() {
  return db
    .select(merchantColumns)
    .from(merchants)
    .innerJoin(regions, eq(regions.id, merchants.regionId))
    .leftJoin(pendaftar, eq(pendaftar.id, merchants.didaftarkanOleh))
    .$dynamic();
}

export type MerchantRow = Awaited<ReturnType<typeof merchantBaseQuery>>[number];

/** Samarkan data pribadi untuk peran yang memakai data dengan masking (Analis). */
export function presentMerchant<T extends Partial<MerchantRow>>(user: CurrentUser, m: T): T {
  if (!masksPII(user.role)) return m;
  return {
    ...m,
    ...(m.pemilik !== undefined && { pemilik: maskName(m.pemilik) }),
    ...(m.alamat !== undefined && { alamat: "***" }),
    ...(m.telepon !== undefined && { telepon: maskDigits(m.telepon) }),
    ...(m.email !== undefined && { email: m.email ? maskEmail(m.email) : null }),
  };
}

/**
 * Ambil satu merchant bila pengguna boleh melihatnya. Merchant di luar wilayah
 * diperlakukan seperti tidak ada (tidak membocorkan keberadaannya), tapi dicatat.
 */
export async function getMerchantForUser(user: CurrentUser, id: number): Promise<MerchantRow | null> {
  if (!Number.isInteger(id)) return null;
  const [m] = await merchantBaseQuery().where(eq(merchants.id, id)).limit(1);
  if (!m) return null;
  if (!canAccessRegion(user, m.regionId)) {
    await audit({ aksi: "akses.ditolak", user, objek: `merchant:${id}`, detail: { alasan: "di_luar_wilayah" } });
    return null;
  }
  return m;
}

export async function getDeviceForUser(user: CurrentUser, id: number) {
  if (!Number.isInteger(id)) return null;
  const [d] = await db
    .select({
      id: devices.id,
      kodePerangkat: devices.kodePerangkat,
      serialNumber: devices.serialNumber,
      merk: devices.merk,
      tipePerangkat: devices.tipePerangkat,
      firmwareTerakhir: devices.firmwareTerakhir,
      merchantId: devices.merchantId,
      kodeMerchant: merchants.kodeMerchant,
      namaMerchant: merchants.nama,
      regionId: merchants.regionId,
    })
    .from(devices)
    .innerJoin(merchants, eq(merchants.id, devices.merchantId))
    .where(eq(devices.id, id))
    .limit(1);
  if (!d) return null;
  if (!canAccessRegion(user, d.regionId)) {
    await audit({ aksi: "akses.ditolak", user, objek: `perangkat:${id}`, detail: { alasan: "di_luar_wilayah" } });
    return null;
  }
  return d;
}

// ---------- Normalisasi dan validasi input ----------

/** "mrc 000101", "MRC000101", " mrc-000101 " → "MRC-000101" (sama dengan normalisasi Vanya, UAT-08). */
export function normalizeKodeMerchant(input: string): string {
  const compact = input.replace(/\s+/g, "").toUpperCase();
  const m = /^MRC-?(\d{6})$/.exec(compact);
  return m ? `MRC-${m[1]}` : compact;
}

export const KODE_MERCHANT_RE = /^MRC-\d{6}$/;

/** "+62 812-3456-7890" → "081234567890" */
export function normalizeTelepon(input: string): string {
  const digits = input.replace(/[\s\-().]/g, "");
  if (digits.startsWith("+62")) return "0" + digits.slice(3);
  if (digits.startsWith("62")) return "0" + digits.slice(2);
  return digits;
}

export const TELEPON_RE = /^0\d{8,13}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Serial number disimpan huruf besar tanpa spasi. */
export function normalizeSerial(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase();
}

export const SERIAL_RE = /^[A-Z0-9][A-Z0-9-]{3,39}$/;

// Saran isian (bukan daftar tertutup).
export const MERK_SARAN = ["Ingenico", "Verifone", "PAX", "Sunmi", "Castles", "Newland"];
export const TIPE_SARAN = ["A920", "A920 Pro", "Move/5000", "Desk/3500", "V240m", "P2 Pro", "Saturn 1000"];
