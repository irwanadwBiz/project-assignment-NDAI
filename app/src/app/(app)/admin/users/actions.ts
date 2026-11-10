"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { regions, sessions, userRegions, users } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { ROLES, ROLES_REQUIRING_REGION, type Role } from "@/lib/rbac";

export type FormState = { error?: string; ok?: string };

async function parseAccess(formData: FormData): Promise<{ role: Role; regionIds: number[] } | { error: string }> {
  const role = String(formData.get("role") ?? "") as Role;
  if (!ROLES.includes(role)) return { error: "Peran tidak valid." };

  // Manajer, analis, dan superadmin melihat semua wilayah, jadi wilayahnya tidak disimpan.
  if (!ROLES_REQUIRING_REGION.includes(role)) return { role, regionIds: [] };

  const regionIds = formData.getAll("regionIds").map(Number).filter(Number.isInteger);
  if (regionIds.length === 0) return { error: "Supervisor dan teknisi wajib punya minimal satu wilayah." };

  const found = await db.select({ id: regions.id }).from(regions).where(inArray(regions.id, regionIds));
  if (found.length !== new Set(regionIds).size) return { error: "Ada wilayah yang tidak ditemukan." };
  return { role, regionIds };
}

// M1-02: register akun hanya oleh Superadmin.
export async function createUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requirePermission("users:manage");

  const nama = String(formData.get("nama") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!nama || !email) return { error: "Nama dan email wajib diisi." };
  if (password.length < 8) return { error: "Kata sandi minimal 8 karakter." };

  const access = await parseAccess(formData);
  if ("error" in access) return access;

  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (exists) return { error: "Email sudah terdaftar." };

  const [created] = await db
    .insert(users)
    .values({ nama, email, passwordHash: await hashPassword(password), role: access.role })
    .returning({ id: users.id });
  if (access.regionIds.length > 0) {
    await db.insert(userRegions).values(access.regionIds.map((regionId) => ({ userId: created.id, regionId })));
  }
  await audit({
    aksi: "user.dibuat",
    user: admin,
    objek: `user:${created.id}`,
    detail: { email, role: access.role, regionIds: access.regionIds },
  });

  revalidatePath("/admin/users");
  return { ok: `Akun ${email} dibuat.` };
}

// M2-01: ubah peran dan wilayah pengguna.
export async function updateUserAccess(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requirePermission("users:manage");
  const userId = Number(formData.get("userId"));
  if (!Number.isInteger(userId)) return { error: "Pengguna tidak valid." };

  const access = await parseAccess(formData);
  if ("error" in access) return access;
  if (userId === admin.id && access.role !== "superadmin") {
    return { error: "Anda tidak bisa mencabut peran Superadmin milik sendiri." };
  }

  const [before] = await db.select({ role: users.role, email: users.email }).from(users).where(eq(users.id, userId));
  if (!before) return { error: "Pengguna tidak ditemukan." };
  const beforeRegions = await db
    .select({ id: userRegions.regionId })
    .from(userRegions)
    .where(eq(userRegions.userId, userId));

  await db.batch([
    db.update(users).set({ role: access.role }).where(eq(users.id, userId)),
    db.delete(userRegions).where(eq(userRegions.userId, userId)),
    ...(access.regionIds.length > 0
      ? [db.insert(userRegions).values(access.regionIds.map((regionId) => ({ userId, regionId })))]
      : []),
  ] as const);
  await audit({
    aksi: "user.akses_diubah",
    user: admin,
    objek: `user:${userId}`,
    detail: {
      email: before.email,
      sebelum: { role: before.role, regionIds: beforeRegions.map((r) => r.id).sort((a, b) => a - b) },
      sesudah: { role: access.role, regionIds: [...access.regionIds].sort((a, b) => a - b) },
    },
  });

  revalidatePath("/admin/users");
  return { ok: "Akses diperbarui." };
}

export async function setUserActive(formData: FormData): Promise<void> {
  const admin = await requirePermission("users:manage");
  const userId = Number(formData.get("userId"));
  const aktif = formData.get("aktif") === "true";
  if (!Number.isInteger(userId) || userId === admin.id) return;

  const [target] = await db
    .update(users)
    .set({ aktif })
    .where(and(eq(users.id, userId), ne(users.id, admin.id)))
    .returning({ email: users.email });
  if (!target) return;
  // Akun yang dinonaktifkan langsung keluar dari semua sesi.
  if (!aktif) await db.delete(sessions).where(eq(sessions.userId, userId));
  await audit({
    aksi: aktif ? "user.diaktifkan" : "user.dinonaktifkan",
    user: admin,
    objek: `user:${userId}`,
    detail: { email: target.email },
  });

  revalidatePath("/admin/users");
}
