import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getDeviceForUser, MERK_SARAN, TIPE_SARAN } from "@/lib/master-data";
import { DeviceForm } from "../../../merchants/forms";

// Halaman butuh sesi login, jadi selalu dirender per request.
export const instant = false;

export default async function EditDevicePage({ params }: PageProps<"/perangkat/[id]/edit">) {
  const user = await requirePermission("devices:manage");
  const { id } = await params;
  const d = await getDeviceForUser(user, Number(id));
  if (!d) notFound();

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href={`/merchants/${d.merchantId}`} className="text-sm text-zinc-500 hover:underline">
          ← {d.kodeMerchant} · {d.namaMerchant}
        </Link>
        <h1 className="mt-1 text-xl font-semibold">
          Ubah perangkat <span className="font-mono">{d.kodePerangkat}</span>
        </h1>
      </div>
      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <DeviceForm
          initial={{
            id: d.id,
            merchantId: d.merchantId,
            serialNumber: d.serialNumber,
            merk: d.merk,
            tipePerangkat: d.tipePerangkat,
            firmwareTerakhir: d.firmwareTerakhir,
          }}
          merkSaran={MERK_SARAN}
          tipeSaran={TIPE_SARAN}
        />
      </section>
    </div>
  );
}
