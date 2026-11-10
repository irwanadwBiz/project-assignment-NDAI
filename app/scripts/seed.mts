// Data awal untuk demo RBAC: wilayah, satu akun per peran, dan contoh merchant.
// Jalankan: npm run db:seed   (aman dijalankan berulang)
//
// Data demo ada di src/db/seed-data.ts (dipakai juga oleh test e2e).
// Semua akun demo memakai kata sandi SEED_PASSWORD (atau env SEED_PASSWORD).
// Ini nilai uji untuk pengembangan lokal saja. Jangan dipakai di produksi.
import { neon } from "@neondatabase/serverless";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { devices, merchants, regions, userRegions, users } from "../src/db/schema.ts";
import { DEVICES, MERCHANTS, REGIONS, SEED_PASSWORD, USERS } from "../src/db/seed-data.ts";
import { hashPassword } from "../src/lib/password.ts";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum diset (.env.local)");
  const db = drizzle(neon(process.env.DATABASE_URL));

  await db.insert(regions).values(REGIONS.map((nama) => ({ nama }))).onConflictDoNothing();
  const regionRows = await db.select().from(regions).where(inArray(regions.nama, REGIONS));
  const regionId = (nama: string) => {
    const r = regionRows.find((x) => x.nama === nama);
    if (!r) throw new Error(`Wilayah tidak ditemukan: ${nama}`);
    return r.id;
  };

  // Akun demo dikembalikan ke peran, wilayah, dan status aktif bawaan setiap kali seed
  // dijalankan (juga sebelum test e2e). Kata sandi tidak diubah bila akun sudah ada.
  const passwordHash = await hashPassword(SEED_PASSWORD);
  for (const u of USERS) {
    const [row] = await db
      .insert(users)
      .values({ nama: u.nama, email: u.email, role: u.role, passwordHash })
      .onConflictDoUpdate({ target: users.email, set: { role: u.role, aktif: true } })
      .returning({ id: users.id });
    await db.delete(userRegions).where(eq(userRegions.userId, row.id));
    if (u.wilayah.length > 0) {
      await db.insert(userRegions).values(u.wilayah.map((w) => ({ userId: row.id, regionId: regionId(w) })));
    }
  }

  // Merchant dan perangkat demo: hanya ditambahkan bila belum ada (perubahan manual dipertahankan).
  const userIds = new Map(
    (await db.select({ id: users.id, email: users.email }).from(users)).map((u) => [u.email, u.id]),
  );
  await db
    .insert(merchants)
    .values(
      MERCHANTS.map(({ wilayah, didaftarkanOleh, ...m }) => ({
        ...m,
        regionId: regionId(wilayah),
        didaftarkanOleh: didaftarkanOleh ? (userIds.get(didaftarkanOleh) ?? null) : null,
      })),
    )
    .onConflictDoNothing({ target: merchants.kodeMerchant });
  const merchantIds = new Map(
    (await db.select({ id: merchants.id, kode: merchants.kodeMerchant }).from(merchants)).map((m) => [m.kode, m.id]),
  );
  await db
    .insert(devices)
    .values(DEVICES.map(({ kodeMerchant, ...d }) => ({ ...d, merchantId: merchantIds.get(kodeMerchant)! })))
    .onConflictDoNothing({ target: devices.serialNumber });

  console.log(
    `Seed selesai: ${REGIONS.length} wilayah, ${USERS.length} akun, ${MERCHANTS.length} merchant, ${DEVICES.length} perangkat.`,
  );
  console.log("Akun demo:");
  for (const u of USERS) console.log(`  ${u.role.padEnd(10)} ${u.email}`);
  console.log("Kata sandi: lihat SEED_PASSWORD di src/db/seed-data.ts");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
