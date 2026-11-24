import { asc, inArray } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { regions } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { getMerchantForUser } from "@/lib/master-data";
import { MerchantForm } from "../../forms";

// Halaman butuh sesi login, jadi selalu dirender per request.
export const instant = false;

export default async function EditMerchantPage({ params }: PageProps<"/merchants/[id]/edit">) {
  const user = await requirePermission("merchants:manage");
  const { id } = await params;
  const m = await getMerchantForUser(user, Number(id));
  if (!m) notFound();

  const myRegions = await db
    .select({ id: regions.id, nama: regions.nama })
    .from(regions)
    .where(inArray(regions.id, user.regionIds.length ? user.regionIds : [-1]))
    .orderBy(asc(regions.nama));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href={`/merchants/${m.id}`} className="text-sm text-zinc-500 hover:underline">
          ← {m.nama}
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Ubah data merchant</h1>
      </div>
      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <MerchantForm
          regions={myRegions}
          initial={{
            id: m.id,
            kodeMerchant: m.kodeMerchant,
            nama: m.nama,
            pemilik: m.pemilik,
            alamat: m.alamat,
            kabupaten: m.kabupaten,
            telepon: m.telepon,
            email: m.email,
            regionId: m.regionId,
            status: m.status,
          }}
        />
      </section>
    </div>
  );
}
