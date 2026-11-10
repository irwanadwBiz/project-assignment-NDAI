// Hapus data buatan test: perangkat (serial E2E-...), merchant (kode MRC-8xxxxx / MRC-9xxxxx),
// dan akun (email berawalan "e2e-") beserta sesinya.
// Catatan: baris audit_logs dari test tetap ada karena log memang tidak bisa dihapus (M3-03).
import { test as teardown } from "@playwright/test";
import { E2E_PREFIX, sql } from "./helpers";

teardown("hapus data e2e", async () => {
  const dev = await sql`
    delete from devices
    where serial_number like 'E2E-%'
       or merchant_id in (select id from merchants where kode_merchant like 'MRC-9%' or kode_merchant like 'MRC-8%')
    returning id`;
  const mer = await sql`delete from merchants where kode_merchant like 'MRC-9%' or kode_merchant like 'MRC-8%' returning id`;
  console.log(`cleanup: ${dev.length} perangkat dan ${mer.length} merchant e2e dihapus`);

  const deleted = await sql`delete from users where email like ${E2E_PREFIX + "%"} returning email`;
  console.log(`cleanup: ${deleted.length} akun e2e dihapus`);
});
