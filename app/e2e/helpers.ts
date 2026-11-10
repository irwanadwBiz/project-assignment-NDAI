import { neon } from "@neondatabase/serverless";
import { expect, type Page } from "@playwright/test";
import { SEED_PASSWORD, USERS } from "../src/db/seed-data";
import type { Role } from "../src/lib/rbac";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum diset (.env.local)");

/** Akses langsung ke database untuk memeriksa hasil (audit log, akun). */
export const sql = neon(process.env.DATABASE_URL);

export const PASSWORD = SEED_PASSWORD;

/** Akun yang dibuat test diberi awalan ini dan dihapus di cleanup.teardown.ts. */
export const E2E_PREFIX = "e2e-";

/** Akun demo dari seed, dikunci dengan bagian email sebelum "@". */
export const ACCOUNTS = Object.fromEntries(
  USERS.map((u) => [u.email.split("@")[0], { ...u }]),
) as Record<string, (typeof USERS)[number]>;

export type AccountKey =
  | "admin"
  | "spv.jakarta"
  | "spv.jabar"
  | "teknisi.jakarta"
  | "teknisi.jabar"
  | "manajer"
  | "analis";

/** Satu akun perwakilan per peran untuk test matriks akses. */
export const ROLE_ACCOUNT: Record<Role, AccountKey> = {
  superadmin: "admin",
  supervisor: "spv.jakarta",
  teknisi: "teknisi.jakarta",
  manajer: "manajer",
  analis: "analis",
};

export const authFile = (key: AccountKey) => `e2e/.auth/${key}.json`;

export async function login(page: Page, email: string, password = PASSWORD, path = "/login") {
  await page.goto(path);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata sandi").fill(password);
  await page.getByRole("button", { name: "Masuk" }).click();
}

/** Pesan error form login (bukan route announcer Next yang juga ber-role alert). */
export const loginError = (page: Page) => page.locator("form p[role=alert]");

export async function expectForbidden(page: Page) {
  await expect(page.getByRole("heading", { name: "Akses ditolak" })).toBeVisible();
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Keluar" }).click();
  await page.waitForURL("**/login");
}

/** Email unik per run supaya test bisa diulang tanpa bentrok. */
export function uniqueEmail(label: string) {
  return `${E2E_PREFIX}${label}-${Date.now().toString(36)}@pusatkendali.test`;
}

/** Kejadian audit terbaru yang cocok, dibuat setelah `since`. */
export async function auditSince(since: Date, aksi: string, email?: string) {
  const rows = await sql`
    select aksi, user_email, user_role, objek, detail
    from audit_logs
    where waktu >= ${since.toISOString()} and aksi = ${aksi}
      and (${email ?? null}::text is null or user_email = ${email ?? null})
    order by id desc`;
  return rows as { aksi: string; user_email: string | null; user_role: string | null; objek: string | null; detail: Record<string, unknown> | null }[];
}

/** Waktu database sekarang (hindari selisih jam antara laptop dan Neon). */
export async function dbNow(): Promise<Date> {
  const [row] = await sql`select now() as now`;
  return new Date(row.now as string);
}
