"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { audit } from "@/lib/audit";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { ALL_MENU_ITEMS, can, homeFor, type Role } from "@/lib/rbac";

export type LoginState = { error?: string; email?: string };

// Hanya izinkan redirect ke halaman internal yang boleh dibuka peran ini.
function safeNext(next: FormDataEntryValue | null, role: Role): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) return homeFor(role);
  const item = ALL_MENU_ITEMS.find((m) => m.href === next);
  return item && can(role, item.permission) ? next : homeFor(role);
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email dan kata sandi wajib diisi.", email };

  const [user] = await db
    .select({ id: users.id, role: users.role, aktif: users.aktif, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const alasan = !user
    ? "email_tidak_terdaftar"
    : !user.aktif
      ? "akun_nonaktif"
      : !(await verifyPassword(password, user.passwordHash))
        ? "kata_sandi_salah"
        : null;

  if (alasan) {
    // Alasan detail hanya untuk audit; pengguna selalu melihat pesan yang sama
    // supaya tidak membocorkan email mana yang terdaftar.
    await audit({ aksi: "auth.login_gagal", email, user: user ? { id: user.id, email, role: user.role } : null, detail: { alasan } });
    return { error: "Email atau kata sandi salah.", email };
  }

  await createSession(user!.id);
  await audit({ aksi: "auth.login", user: { id: user!.id, email, role: user!.role } });
  redirect(safeNext(formData.get("next"), user!.role));
}

// Tidak redirect di sini: tombol logout memuat ulang halaman penuh supaya
// halaman yang tersimpan di cache router browser ikut terhapus.
export async function logout(): Promise<void> {
  const user = await getCurrentUser();
  await destroySession();
  if (user) await audit({ aksi: "auth.logout", user });
}
