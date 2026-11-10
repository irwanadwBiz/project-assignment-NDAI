import { asc, inArray } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { regions } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { MerchantForm } from "../forms";

// Halaman butuh sesi login, jadi selalu dirender per request.
export const instant = false;

export default async function NewMerchantPage() {
  const user = await requirePermission("merchants:manage");
  // Hanya wilayah milik petugas (BRL-07).
  const myRegions = user.regionIds.length
    ? await db
        .select({ id: regions.id, nama: regions.nama })
        .from(regions)
        .where(inArray(regions.id, user.regionIds))
        .orderBy(asc(regions.nama))
    : [];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/merchants" className="text-sm text-zinc-500 hover:underline">
          ← Master Merchant
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Daftarkan merchant</h1>
        <p className="text-sm text-zinc-500">Tercatat atas nama {user.nama} sebagai petugas yang mendaftarkan.</p>
      </div>
      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <MerchantForm regions={myRegions} />
      </section>
    </div>
  );
}
