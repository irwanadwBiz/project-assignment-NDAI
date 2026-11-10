import { and, asc, eq, ilike, or } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { devices, merchants, regions } from "@/db/schema";
import { regionCondition, requirePermission } from "@/lib/auth";
import { can } from "@/lib/rbac";

// Halaman butuh sesi login, jadi selalu dirender per request.
export const instant = false;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export default async function DevicesPage({ searchParams }: PageProps<"/perangkat">) {
  const user = await requirePermission("merchants:read");
  const q = one((await searchParams).q);
  const like = q ? `%${q}%` : undefined;

  const rows = await db
    .select({
      id: devices.id,
      kodePerangkat: devices.kodePerangkat,
      serialNumber: devices.serialNumber,
      merk: devices.merk,
      tipePerangkat: devices.tipePerangkat,
      firmwareTerakhir: devices.firmwareTerakhir,
      merchantId: merchants.id,
      kodeMerchant: merchants.kodeMerchant,
      namaMerchant: merchants.nama,
      wilayah: regions.nama,
    })
    .from(devices)
    .innerJoin(merchants, eq(merchants.id, devices.merchantId))
    .innerJoin(regions, eq(regions.id, merchants.regionId))
    .where(
      and(
        // BRL-07: perangkat mengikuti wilayah merchant pemiliknya.
        regionCondition(user, merchants.regionId),
        like
          ? or(
              ilike(devices.serialNumber, like),
              ilike(devices.kodePerangkat, like),
              ilike(devices.merk, like),
              ilike(devices.tipePerangkat, like),
              ilike(devices.firmwareTerakhir, like),
              ilike(merchants.kodeMerchant, like),
            )
          : undefined,
      ),
    )
    .orderBy(asc(devices.kodePerangkat))
    .limit(300);

  const canManage = can(user.role, "devices:manage");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Master Perangkat</h1>
        <p className="text-sm text-zinc-500">
          Perangkat ditambahkan dari halaman detail merchant. {!canManage && "Hanya baca."}
        </p>
      </div>

      <form method="get" className="flex items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4">
        <label className="text-xs text-zinc-500">
          Cari serial number, kode, merk, tipe, firmware, atau kode merchant
          <input
            name="q"
            defaultValue={q}
            className="mt-1 block w-96 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </label>
        <button type="submit" className="rounded-md border border-zinc-300 px-4 py-1.5 text-sm hover:bg-zinc-100">
          Cari
        </button>
      </form>

      <section className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold">{rows.length} perangkat</div>
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>
              <th className="px-4 py-2">Kode</th>
              <th className="px-4 py-2">Serial number</th>
              <th className="px-4 py-2">Merk</th>
              <th className="px-4 py-2">Tipe</th>
              <th className="px-4 py-2">Firmware terakhir</th>
              <th className="px-4 py-2">Merchant</th>
              <th className="px-4 py-2">Wilayah</th>
              {canManage && <th className="px-4 py-2" />}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-zinc-500">
                  Tidak ada perangkat.
                </td>
              </tr>
            )}
            {rows.map((d) => (
              <tr key={d.id} className="border-t border-zinc-100">
                <td className="px-4 py-2 font-mono">{d.kodePerangkat}</td>
                <td className="px-4 py-2 font-mono">{d.serialNumber}</td>
                <td className="px-4 py-2">{d.merk}</td>
                <td className="px-4 py-2">{d.tipePerangkat}</td>
                <td className="px-4 py-2 font-mono">{d.firmwareTerakhir}</td>
                <td className="px-4 py-2">
                  <Link href={`/merchants/${d.merchantId}`} className="text-blue-700 hover:underline">
                    <span className="font-mono">{d.kodeMerchant}</span> · {d.namaMerchant}
                  </Link>
                </td>
                <td className="px-4 py-2">{d.wilayah}</td>
                {canManage && (
                  <td className="px-4 py-2 text-right">
                    <Link href={`/perangkat/${d.id}/edit`} className="text-xs text-blue-700 hover:underline">
                      Ubah
                    </Link>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
