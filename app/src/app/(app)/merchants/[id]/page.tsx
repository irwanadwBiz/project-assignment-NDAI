import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { devices } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { getMerchantForUser, MERK_SARAN, presentMerchant, TIPE_SARAN } from "@/lib/master-data";
import { can } from "@/lib/rbac";
import { DeviceForm } from "../forms";

// Halaman butuh sesi login, jadi selalu dirender per request.
export const instant = false;

const tanggal = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" });

export default async function MerchantDetailPage({ params }: PageProps<"/merchants/[id]">) {
  const user = await requirePermission("merchants:read");
  const { id } = await params;
  const raw = await getMerchantForUser(user, Number(id));
  if (!raw) notFound();
  const m = presentMerchant(user, raw);

  const deviceRows = await db
    .select()
    .from(devices)
    .where(eq(devices.merchantId, m.id))
    .orderBy(asc(devices.kodePerangkat));

  const canEdit = can(user.role, "merchants:manage");
  const canDevices = can(user.role, "devices:manage");

  const info: [string, React.ReactNode][] = [
    ["Kode merchant", <span key="k" className="font-mono">{m.kodeMerchant}</span>],
    ["Owner / PIC toko", m.pemilik],
    ["Alamat", m.alamat],
    ["Kabupaten / kota", m.kabupaten],
    ["Wilayah", m.wilayah],
    ["Nomor telepon", <span key="t" className="font-mono">{m.telepon}</span>],
    ["Email", m.email ?? "-"],
    ["Status", m.status],
    ["Didaftarkan oleh", m.didaftarkanOlehNama ?? "Data awal"],
    ["Tanggal daftar", tanggal.format(m.dibuatPada)],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/merchants" className="text-sm text-zinc-500 hover:underline">
            ← Master Merchant
          </Link>
          <h1 className="mt-1 text-xl font-semibold">{m.nama}</h1>
        </div>
        {canEdit && (
          <Link
            href={`/merchants/${m.id}/edit`}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100"
          >
            Ubah data merchant
          </Link>
        )}
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white">
        <dl className="grid gap-x-8 gap-y-3 p-4 sm:grid-cols-2">
          {info.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-zinc-500">{label}</dt>
              <dd className="text-sm">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white">
        <h2 className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold">
          Perangkat ({deviceRows.length})
        </h2>
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>
              <th className="px-4 py-2">Kode</th>
              <th className="px-4 py-2">Serial number</th>
              <th className="px-4 py-2">Merk</th>
              <th className="px-4 py-2">Tipe</th>
              <th className="px-4 py-2">Firmware terakhir</th>
              {canDevices && <th className="px-4 py-2" />}
            </tr>
          </thead>
          <tbody>
            {deviceRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
                  Belum ada perangkat.
                </td>
              </tr>
            )}
            {deviceRows.map((d) => (
              <tr key={d.id} className="border-t border-zinc-100">
                <td className="px-4 py-2 font-mono">{d.kodePerangkat}</td>
                <td className="px-4 py-2 font-mono">{d.serialNumber}</td>
                <td className="px-4 py-2">{d.merk}</td>
                <td className="px-4 py-2">{d.tipePerangkat}</td>
                <td className="px-4 py-2 font-mono">{d.firmwareTerakhir}</td>
                {canDevices && (
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
        {canDevices && (
          <div className="border-t border-zinc-200 p-4">
            <h3 className="mb-3 text-sm font-semibold">Tambah perangkat</h3>
            <DeviceForm merchantId={m.id} merkSaran={MERK_SARAN} tipeSaran={TIPE_SARAN} />
          </div>
        )}
      </section>
    </div>
  );
}
