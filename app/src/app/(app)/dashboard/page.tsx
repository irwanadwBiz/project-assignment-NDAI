import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { merchants, regions } from "@/db/schema";
import { regionCondition, requirePermission } from "@/lib/auth";
import { can, ROLE_LABELS, ROLE_PERMISSIONS } from "@/lib/rbac";

const SCOPE_LABELS = {
  region: "Hanya wilayah Anda",
  own: "Hanya tugas yang ditugaskan kepada Anda",
  all: "Semua wilayah",
  none: "Konfigurasi sistem",
} as const;

// Halaman butuh sesi login, jadi selalu dirender per request.
export const instant = false;

export default async function DashboardPage() {
  const user = await requirePermission("dashboard:view");

  // M2-02 / BRL-07: filter wilayah diterapkan di query, bukan di UI.
  const rows = can(user.role, "merchants:read")
    ? await db
        .select({
          merchantId: merchants.merchantId,
          nama: merchants.nama,
          wilayah: regions.nama,
          status: merchants.status,
        })
        .from(merchants)
        .innerJoin(regions, eq(regions.id, merchants.regionId))
        .where(and(regionCondition(user, merchants.regionId)))
        .orderBy(regions.nama, merchants.merchantId)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-zinc-500">
          {ROLE_LABELS[user.role]} · Cakupan data: {SCOPE_LABELS[user.scope]}
        </p>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">Izin peran Anda</h2>
        <ul className="flex flex-wrap gap-2">
          {ROLE_PERMISSIONS[user.role].map((p) => (
            <li key={p} className="rounded bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-700">
              {p}
            </li>
          ))}
        </ul>
      </section>

      {rows ? (
        <section className="rounded-lg border border-zinc-200 bg-white">
          <h2 className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold">
            Merchant dalam cakupan Anda ({rows.length})
          </h2>
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
              <tr>
                <th className="px-4 py-2">Merchant ID</th>
                <th className="px-4 py-2">Nama</th>
                <th className="px-4 py-2">Wilayah</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.merchantId} className="border-t border-zinc-100">
                  <td className="px-4 py-2 font-mono">{m.merchantId}</td>
                  <td className="px-4 py-2">{m.nama}</td>
                  <td className="px-4 py-2">{m.wilayah}</td>
                  <td className="px-4 py-2">{m.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">
          Daftar tugas Anda akan tampil di sini setelah modul Assignment (M5) dan Kunjungan (M6) dibuat.
        </p>
      )}
    </div>
  );
}
