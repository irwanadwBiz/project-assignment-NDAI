// Hapus akun buatan test (email berawalan "e2e-") beserta sesinya.
// Catatan: baris audit_logs dari test tetap ada karena log memang tidak bisa dihapus (M3-03).
import { test as teardown } from "@playwright/test";
import { E2E_PREFIX, sql } from "./helpers";

teardown("hapus akun e2e", async () => {
  const deleted = await sql`delete from users where email like ${E2E_PREFIX + "%"} returning email`;
  console.log(`cleanup: ${deleted.length} akun e2e dihapus`);
});
