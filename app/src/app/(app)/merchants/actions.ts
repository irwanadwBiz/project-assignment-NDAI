"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { devices, merchants } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requirePermission, type CurrentUser } from "@/lib/auth";
import {
  EMAIL_RE,
  getDeviceForUser,
  getMerchantForUser,
  KODE_MERCHANT_RE,
  normalizeKodeMerchant,
  normalizeSerial,
  normalizeTelepon,
  SERIAL_RE,
  TELEPON_RE,
} from "@/lib/master-data";

export type FormState = { error?: string; ok?: string };

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

/** Postgres 23505 (unique). Drizzle membungkus error driver, kodenya ada di `cause`. */
function isUniqueViolation(err: unknown): boolean {
  for (let e: unknown = err; e && typeof e === "object"; e = (e as { cause?: unknown }).cause) {
    if ((e as { code?: unknown }).code === "23505") return true;
  }
  return false;
}

/** Field yang berubah, untuk rincian audit (sebelum → sesudah). */
function diff<T extends Record<string, unknown>>(before: T, after: Partial<T>) {
  const sebelum: Record<string, unknown> = {};
  const sesudah: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(after)) {
    if (before[k] !== v) {
      sebelum[k] = before[k];
      sesudah[k] = v;
    }
  }
  return { sebelum, sesudah, berubah: Object.keys(sesudah).length > 0 };
}

// ---------- Merchant ----------

function parseMerchant(fd: FormData, user: CurrentUser) {
  const data = {
    nama: str(fd, "nama"),
    pemilik: str(fd, "pemilik"),
    alamat: str(fd, "alamat"),
    kabupaten: str(fd, "kabupaten"),
    telepon: normalizeTelepon(str(fd, "telepon")),
    email: str(fd, "email").toLowerCase() || null,
    regionId: Number(fd.get("regionId")),
  };
  if (!data.nama || !data.pemilik || !data.alamat || !data.kabupaten) {
    return { error: "Nama merchant, owner/PIC, alamat, dan kabupaten wajib diisi." } as const;
  }
  if (data.nama.length > 200 || data.pemilik.length > 150 || data.kabupaten.length > 100) {
    return { error: "Isian terlalu panjang." } as const;
  }
  if (!TELEPON_RE.test(data.telepon)) {
    return { error: "Nomor telepon tidak valid. Contoh: 081234567890 atau +62 812 3456 7890." } as const;
  }
  if (data.email && !EMAIL_RE.test(data.email)) return { error: "Format email tidak valid." } as const;
  // BRL-07: supervisor hanya boleh mendaftarkan merchant di wilayahnya sendiri.
  if (!user.regionIds.includes(data.regionId)) return { error: "Wilayah harus salah satu wilayah Anda." } as const;
  return { data } as const;
}

export async function createMerchant(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requirePermission("merchants:manage");

  const kodeMerchant = normalizeKodeMerchant(str(fd, "kodeMerchant"));
  if (!KODE_MERCHANT_RE.test(kodeMerchant)) return { error: "Kode merchant harus berformat MRC-xxxxxx (6 angka)." };
  const parsed = parseMerchant(fd, user);
  if ("error" in parsed) return { error: parsed.error };

  let id: number;
  try {
    const [row] = await db
      .insert(merchants)
      .values({ kodeMerchant, ...parsed.data, didaftarkanOleh: user.id })
      .returning({ id: merchants.id });
    id = row.id;
  } catch (err) {
    if (isUniqueViolation(err)) return { error: `Kode merchant ${kodeMerchant} sudah terdaftar.` };
    throw err;
  }

  await audit({
    aksi: "merchant.dibuat",
    user,
    objek: `merchant:${id}`,
    detail: { kodeMerchant, nama: parsed.data.nama, regionId: parsed.data.regionId },
  });
  revalidatePath("/merchants");
  redirect(`/merchants/${id}`);
}

export async function updateMerchant(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requirePermission("merchants:manage");
  const existing = await getMerchantForUser(user, Number(fd.get("id")));
  if (!existing) return { error: "Merchant tidak ditemukan." };

  const parsed = parseMerchant(fd, user);
  if ("error" in parsed) return { error: parsed.error };
  const status = str(fd, "status") === "nonaktif" ? "nonaktif" : "aktif";
  const next = { ...parsed.data, status };

  const changes = diff(existing, next);
  if (changes.berubah) {
    await db
      .update(merchants)
      .set({ ...next, diperbaruiPada: sql`now()` })
      .where(eq(merchants.id, existing.id));
    // Data kontak tidak ditulis mentah ke log; cukup nama kolom yang berubah.
    const sensitive = ["pemilik", "alamat", "telepon", "email"];
    for (const k of sensitive) {
      if (k in changes.sesudah) {
        changes.sebelum[k] = "(diubah)";
        changes.sesudah[k] = "(diubah)";
      }
    }
    await audit({
      aksi: "merchant.diubah",
      user,
      objek: `merchant:${existing.id}`,
      detail: { kodeMerchant: existing.kodeMerchant, sebelum: changes.sebelum, sesudah: changes.sesudah },
    });
  }
  revalidatePath(`/merchants/${existing.id}`);
  revalidatePath("/merchants");
  redirect(`/merchants/${existing.id}`);
}

// ---------- Perangkat ----------

function parseDevice(fd: FormData) {
  const data = {
    serialNumber: normalizeSerial(str(fd, "serialNumber")),
    merk: str(fd, "merk"),
    tipePerangkat: str(fd, "tipePerangkat"),
    firmwareTerakhir: str(fd, "firmwareTerakhir"),
  };
  if (!SERIAL_RE.test(data.serialNumber)) {
    return { error: "Serial number 4-40 karakter, hanya huruf, angka, dan tanda hubung." } as const;
  }
  if (!data.merk || !data.tipePerangkat || !data.firmwareTerakhir) {
    return { error: "Merk, tipe perangkat, dan firmware terakhir wajib diisi." } as const;
  }
  if (data.merk.length > 50 || data.tipePerangkat.length > 50 || data.firmwareTerakhir.length > 50) {
    return { error: "Isian terlalu panjang (maks. 50 karakter)." } as const;
  }
  return { data } as const;
}

export async function createDevice(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requirePermission("devices:manage");
  const merchant = await getMerchantForUser(user, Number(fd.get("merchantId")));
  if (!merchant) return { error: "Merchant tidak ditemukan." };

  const parsed = parseDevice(fd);
  if ("error" in parsed) return { error: parsed.error };

  let created: { id: number; kodePerangkat: string };
  try {
    [created] = await db
      .insert(devices)
      .values({ ...parsed.data, merchantId: merchant.id })
      .returning({ id: devices.id, kodePerangkat: devices.kodePerangkat });
  } catch (err) {
    if (isUniqueViolation(err)) return { error: `Serial number ${parsed.data.serialNumber} sudah terdaftar.` };
    throw err;
  }

  await audit({
    aksi: "perangkat.dibuat",
    user,
    objek: `perangkat:${created.id}`,
    detail: { kodePerangkat: created.kodePerangkat, kodeMerchant: merchant.kodeMerchant, ...parsed.data },
  });
  revalidatePath(`/merchants/${merchant.id}`);
  revalidatePath("/perangkat");
  return { ok: `Perangkat ${created.kodePerangkat} (${parsed.data.serialNumber}) ditambahkan.` };
}

export async function updateDevice(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requirePermission("devices:manage");
  const existing = await getDeviceForUser(user, Number(fd.get("id")));
  if (!existing) return { error: "Perangkat tidak ditemukan." };

  const parsed = parseDevice(fd);
  if ("error" in parsed) return { error: parsed.error };

  const [dup] = await db
    .select({ id: devices.id })
    .from(devices)
    .where(and(eq(devices.serialNumber, parsed.data.serialNumber), ne(devices.id, existing.id)))
    .limit(1);
  if (dup) return { error: `Serial number ${parsed.data.serialNumber} sudah dipakai perangkat lain.` };

  const changes = diff(existing, parsed.data);
  if (changes.berubah) {
    await db
      .update(devices)
      .set({ ...parsed.data, diperbaruiPada: sql`now()` })
      .where(eq(devices.id, existing.id));
    await audit({
      aksi: "perangkat.diubah",
      user,
      objek: `perangkat:${existing.id}`,
      detail: { kodePerangkat: existing.kodePerangkat, sebelum: changes.sebelum, sesudah: changes.sesudah },
    });
  }
  revalidatePath(`/merchants/${existing.merchantId}`);
  revalidatePath("/perangkat");
  redirect(`/merchants/${existing.merchantId}`);
}
