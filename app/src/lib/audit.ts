// M3 Audit Log: satu pintu untuk mencatat tindakan. Hanya untuk kode server.
// Tabel audit_logs hanya bisa di-INSERT (trigger di scripts/db-setup.mts, M3-03).
import { headers } from "next/headers";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import type { Role } from "@/lib/rbac";

// Daftar aksi yang dikenal. Modul lain menambahkan aksinya di sini supaya
// filter di halaman Audit Log punya label yang rapi.
export const AUDIT_ACTIONS = {
  // M1 / M2 (sudah dipakai)
  "auth.login": "Login berhasil",
  "auth.login_gagal": "Login gagal",
  "auth.logout": "Logout",
  "akses.ditolak": "Akses ditolak (403)",
  "user.dibuat": "Akun dibuat",
  "user.akses_diubah": "Peran/wilayah diubah",
  "user.dinonaktifkan": "Akun dinonaktifkan",
  "user.diaktifkan": "Akun diaktifkan",
  "wilayah.dibuat": "Wilayah dibuat",
  // Disiapkan untuk modul lain (M3-01, M3-02)
  "tanya_data.query": "Tanya Data: pertanyaan & SQL",
  "tanya_data.sql_dikoreksi": "Tanya Data: SQL dikoreksi analis",
  "aduan.status_diubah": "Status aduan diubah",
  "aduan.disetujui": "Aduan disetujui supervisor",
  "aduan.ditolak": "Aduan ditolak supervisor",
  "assignment.dibuat": "Teknisi ditugaskan",
  "assignment.ditolak_teknisi": "Tugas ditolak teknisi",
  "kunjungan.status_diubah": "Status kunjungan diubah",
  "cv.koreksi_manusia": "Koreksi manusia pada hasil CV",
  "anomali.ambang_diubah": "Ambang anomali diubah",
  "tindakan_berisiko.disetujui": "Tindakan berisiko disetujui (BRL-04)",
} as const;

export type AuditAction = keyof typeof AUDIT_ACTIONS;

type Actor = { id: number; email: string; role: Role } | null | undefined;

export type AuditEntry = {
  aksi: AuditAction;
  user?: Actor;
  /** Untuk kejadian tanpa sesi (mis. login gagal): email yang dicoba. */
  email?: string;
  objek?: string;
  pertanyaan?: string;
  sql?: string;
  jumlahBaris?: number;
  detail?: Record<string, unknown>;
};

async function clientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || null;
}

/**
 * Catat satu kejadian. Sengaja melempar error bila gagal: lebih baik tindakan
 * gagal daripada berhasil tanpa jejak (target keterlacakan 100%, PRD bagian 10).
 */
export async function audit(entry: AuditEntry): Promise<void> {
  await db.insert(auditLogs).values({
    userId: entry.user?.id ?? null,
    userEmail: entry.user?.email ?? entry.email ?? null,
    userRole: entry.user?.role ?? null,
    aksi: entry.aksi,
    objek: entry.objek ?? null,
    pertanyaan: entry.pertanyaan ?? null,
    sql: entry.sql ?? null,
    jumlahBaris: entry.jumlahBaris ?? null,
    detail: entry.detail ?? null,
    ip: await clientIp(),
  });
}

/**
 * M3-01: dipanggil modul Vanna (M9) setiap kali pertanyaan dijalankan.
 * Contoh: await auditTanyaData({ user, pertanyaan, sql, jumlahBaris: rows.length, durasiMs });
 */
export async function auditTanyaData(e: {
  user: NonNullable<Actor>;
  pertanyaan: string;
  sql: string;
  jumlahBaris: number;
  durasiMs?: number;
  status?: "berhasil" | "ditolak" | "error";
  pesan?: string;
}): Promise<void> {
  await audit({
    aksi: "tanya_data.query",
    user: e.user,
    pertanyaan: e.pertanyaan,
    sql: e.sql,
    jumlahBaris: e.jumlahBaris,
    detail: { status: e.status ?? "berhasil", durasiMs: e.durasiMs, pesan: e.pesan },
  });
}
