// Data Access Layer: sesi (M1-03) dan penegakan RBAC di sisi server (M2-05).
// Hanya boleh diimpor dari kode server (Server Component, Server Action, Route Handler).
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { audit } from "@/lib/audit";
import { regions, sessions, userRegions, users } from "@/db/schema";
import { can, ROLE_SCOPE, type DataScope, type Permission, type Role } from "@/lib/rbac";

export const SESSION_COOKIE = "pk_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 jam (satu shift kerja)

export type CurrentUser = {
  id: number;
  nama: string;
  email: string;
  role: Role;
  scope: DataScope;
  regionIds: number[];
  regionNames: string[];
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const kedaluwarsa = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id: hashToken(token), userId, kedaluwarsa });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: kedaluwarsa,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  store.delete(SESSION_COOKIE);
}

// Dibaca sekali per request (React cache) walau dipanggil banyak komponen.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [row] = await db
    .select({ id: users.id, nama: users.nama, email: users.email, role: users.role })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(eq(sessions.id, hashToken(token)), gt(sessions.kedaluwarsa, sql`now()`), eq(users.aktif, true)),
    )
    .limit(1);
  if (!row) return null;

  const regionRows = await db
    .select({ id: regions.id, nama: regions.nama })
    .from(userRegions)
    .innerJoin(regions, eq(regions.id, userRegions.regionId))
    .where(eq(userRegions.userId, row.id))
    .orderBy(regions.nama);

  return {
    ...row,
    scope: ROLE_SCOPE[row.role],
    regionIds: regionRows.map((r) => r.id),
    regionNames: regionRows.map((r) => r.nama),
  };
});

/** Untuk halaman: belum login → /login. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Untuk halaman dan Server Action: tanpa izin → 403. */
export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) {
    await audit({ aksi: "akses.ditolak", user, objek: permission });
    forbidden();
  }
  return user;
}

/** Untuk Route Handler: kembalikan user atau Response 401/403 (JSON, bukan redirect). */
export async function authorizeApi(
  permission: Permission,
): Promise<{ user: CurrentUser; error?: never } | { user?: never; error: Response }> {
  const user = await getCurrentUser();
  if (!user) return { error: Response.json({ error: "Belum login" }, { status: 401 }) };
  if (!can(user.role, permission)) {
    await audit({ aksi: "akses.ditolak", user, objek: permission, detail: { via: "api" } });
    return { error: Response.json({ error: "Akses ditolak" }, { status: 403 }) };
  }
  return { user };
}

/**
 * BRL-07 / M2-02: kondisi WHERE wilayah untuk query yang punya kolom region_id.
 * Supervisor dibatasi ke wilayahnya; manajer/analis melihat semua.
 * Peran lain (teknisi, superadmin) tidak boleh query berbasis wilayah → tidak ada baris.
 */
export function regionCondition(user: CurrentUser, regionColumn: Parameters<typeof inArray>[0]) {
  switch (user.scope) {
    case "all":
      return undefined;
    case "region":
      return user.regionIds.length > 0 ? inArray(regionColumn, user.regionIds) : eq(regionColumn, -1);
    default:
      return eq(regionColumn, -1);
  }
}

/** Cek satu objek: apakah wilayah ini boleh diakses pengguna? */
export function canAccessRegion(user: CurrentUser, regionId: number): boolean {
  if (user.scope === "all") return true;
  if (user.scope === "region") return user.regionIds.includes(regionId);
  return false;
}
