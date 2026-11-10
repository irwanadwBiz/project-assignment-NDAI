import { asc, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { merchants, regions, userRegions } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { ROLE_LABELS, ROLE_PERMISSIONS, ROLE_SCOPE, ROLES } from "@/lib/rbac";

async function addRegion(formData: FormData) {
  "use server";
  const admin = await requirePermission("users:manage");
  const nama = String(formData.get("nama") ?? "").trim();
  if (!nama) return;
  const [created] = await db.insert(regions).values({ nama }).onConflictDoNothing().returning({ id: regions.id });
  if (created) await audit({ aksi: "wilayah.dibuat", user: admin, objek: `wilayah:${created.id}`, detail: { nama } });
  revalidatePath("/admin/regions");
}

const SCOPE_LABELS = { region: "Wilayahnya", own: "Tugas sendiri", all: "Semua wilayah", none: "Konfigurasi" };

// Halaman butuh sesi login, jadi selalu dirender per request.
export const instant = false;

export default async function RegionsPage() {
  await requirePermission("users:manage");

  const rows = await db
    .select({
      id: regions.id,
      nama: regions.nama,
      pengguna: db.$count(userRegions, eq(userRegions.regionId, regions.id)),
      merchant: count(merchants.id),
    })
    .from(regions)
    .leftJoin(merchants, eq(merchants.regionId, regions.id))
    .groupBy(regions.id)
    .orderBy(asc(regions.nama));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Peran dan Wilayah</h1>
        <p className="text-sm text-zinc-500">Matriks hak akses (PRD bagian 3) dan daftar wilayah.</p>
      </div>

      <section className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>
              <th className="px-4 py-2">Peran</th>
              <th className="px-4 py-2">Cakupan data</th>
              <th className="px-4 py-2">Izin</th>
            </tr>
          </thead>
          <tbody>
            {ROLES.map((r) => (
              <tr key={r} className="border-t border-zinc-100 align-top">
                <td className="px-4 py-2 font-medium">{ROLE_LABELS[r]}</td>
                <td className="px-4 py-2">{SCOPE_LABELS[ROLE_SCOPE[r]]}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {ROLE_PERMISSIONS[r].map((p) => (
                      <span key={p} className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-xs">
                        {p}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-semibold">Wilayah ({rows.length})</h2>
          <form action={addRegion} className="flex gap-2">
            <input
              name="nama"
              placeholder="Nama wilayah baru"
              required
              className="rounded-md border border-zinc-300 px-3 py-1 text-sm"
            />
            <button type="submit" className="rounded-md bg-blue-700 px-3 py-1 text-sm text-white hover:bg-blue-800">
              Tambah
            </button>
          </form>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>
              <th className="px-4 py-2">Wilayah</th>
              <th className="px-4 py-2">Pengguna</th>
              <th className="px-4 py-2">Merchant</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-zinc-100">
                <td className="px-4 py-2">{r.nama}</td>
                <td className="px-4 py-2">{r.pengguna}</td>
                <td className="px-4 py-2">{r.merchant}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
