import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { merchants, regions } from "@/db/schema";
import { authorizeApi, regionCondition } from "@/lib/auth";

// Contoh API yang dibatasi wilayah (M2-02, M2-05, UAT-04).
// Supervisor hanya menerima merchant wilayahnya, meskipun meminta ?region= wilayah lain.
export async function GET(request: Request) {
  const { user, error } = await authorizeApi("merchants:read");
  if (error) return error;

  const regionParam = new URL(request.url).searchParams.get("region");
  const requested = regionParam ? Number(regionParam) : undefined;

  const rows = await db
    .select({
      kodeMerchant: merchants.kodeMerchant,
      nama: merchants.nama,
      regionId: merchants.regionId,
      wilayah: regions.nama,
      status: merchants.status,
    })
    .from(merchants)
    .innerJoin(regions, eq(regions.id, merchants.regionId))
    .where(
      and(
        regionCondition(user, merchants.regionId),
        requested !== undefined && Number.isInteger(requested) ? eq(merchants.regionId, requested) : undefined,
      ),
    )
    .orderBy(merchants.kodeMerchant);

  return Response.json({ role: user.role, scope: user.scope, count: rows.length, data: rows });
}
