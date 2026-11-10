import { and, asc, count, eq, ilike, inArray, or } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { devices, merchants, regions } from "@/db/schema";
import { regionCondition, requirePermission } from "@/lib/auth";
import { merchantBaseQuery, presentMerchant } from "@/lib/master-data";
import { can } from "@/lib/rbac";

// Halaman butuh sesi login, jadi selalu dirender per request.
export const instant = false;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export default async function MerchantsPage({ searchParams }: PageProps<"/merchants">) {
  const user = await requirePermission("merchants:read");
  const sp = await searchParams;
  const q = one(sp.q);
  const wilayah = Number(one(sp.wilayah)) || undefined;

  const visibleRegions = await db
    .select({ id: regions.id, nama: regions.nama })
    .from(regions)
    .where(user.scope === "all" ? undefined : inArray(regions.id, user.regionIds.length ? user.regionIds : [-1]))
    .orderBy(asc(regions.nama));

  const like = q ? `%${q}%` : undefined;
  const rows = await merchantBaseQuery()
    .where(
      and(
        // BRL-07: filter wilayah di query, bukan di tampilan.
        regionCondition(user, merchants.regionId),
        wilayah ? eq(merchants.regionId, wilayah) : undefined,
        like
          ? or(
              ilike(merchants.kodeMerchant, like),
              ilike(merchants.nama, like),
              ilike(merchants.kabupaten, like),
            )
          : undefined,
      ),
    )
    .orderBy(asc(merchants.kodeMerchant))
    .limit(200);

  const deviceCounts = rows.length
    ? await db
        .select({ merchantId: devices.merchantId, n: count() })
        .from(devices)
        .where(inArray(devices.merchantId, rows.map((r) => r.id)))
        .groupBy(devices.merchantId)
    : [];
  const countOf = new Map(deviceCounts.map((d) => [d.merchantId, d.n]));
  const canManage = can(user.role, "merchants:manage");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Master Merchant</h1>
          <p className="text-sm text-zinc-500">
            {user.scope === "all" ? "Semua wilayah" : `Wilayah: ${user.regionNames.join(", ")}`}
            {!canManage && " · hanya baca"}
          </p>
        </div>
        {canManage && (
          <Link
            href="/merchants/baru"
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            Daftarkan merchant
          </Link>
        )}
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4">
        <label className="text-xs text-zinc-500">
          Cari kode, nama, atau kabupaten
          <input
            name="q"
            defaultValue={q}
            className="mt-1 block w-72 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </label>
        {visibleRegions.length > 1 && (
          <label className="text-xs text-zinc-500">
            Wilayah
            <select
              name="wilayah"
              defaultValue={wilayah ?? ""}
              className="mt-1 block rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
            >
              <option value="">Semua</option>
              {visibleRegions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nama}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="submit" className="rounded-md border border-zinc-300 px-4 py-1.5 text-sm hover:bg-zinc-100">
          Cari
        </button>
      </form>

      <section className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>
              <th className="px-4 py-2">Kode</th>
              <th className="px-4 py-2">Nama merchant</th>
              <th className="px-4 py-2">Owner / PIC</th>
              <th className="px-4 py-2">Kabupaten</th>
              <th className="px-4 py-2">Wilayah</th>
              <th className="px-4 py-2">Telepon</th>
              <th className="px-4 py-2 text-right">Perangkat</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-zinc-500">
                  Tidak ada merchant.
                </td>
              </tr>
            )}
            {rows.map((raw) => {
              const m = presentMerchant(user, raw);
              return (
                <tr key={m.id} className="border-t border-zinc-100">
                  <td className="px-4 py-2 font-mono">
                    <Link href={`/merchants/${m.id}`} className="text-blue-700 hover:underline">
                      {m.kodeMerchant}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{m.nama}</td>
                  <td className="px-4 py-2">{m.pemilik}</td>
                  <td className="px-4 py-2">{m.kabupaten}</td>
                  <td className="px-4 py-2">{m.wilayah}</td>
                  <td className="px-4 py-2 font-mono text-xs">{m.telepon}</td>
                  <td className="px-4 py-2 text-right">{countOf.get(m.id) ?? 0}</td>
                  <td className="px-4 py-2">
                    <span className={m.status === "aktif" ? "text-green-700" : "text-zinc-400"}>{m.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
