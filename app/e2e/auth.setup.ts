// Login lewat form sekali per akun demo, simpan cookie sesinya untuk dipakai test lain.
import { execSync } from "node:child_process";
import { expect, test as setup } from "@playwright/test";
import { ACCOUNTS, authFile, login, type AccountKey } from "./helpers";

setup.describe.configure({ mode: "serial" });

setup("seed data demo", () => {
  // Idempoten: memastikan wilayah, akun demo, dan merchant ada sebelum test.
  execSync("npm run db:seed", { stdio: "ignore" });
});

for (const key of Object.keys(ACCOUNTS) as AccountKey[]) {
  setup(`login ${key}`, async ({ page }) => {
    await login(page, ACCOUNTS[key].email);
    await expect(page.getByRole("button", { name: "Keluar" })).toBeVisible();
    await page.context().storageState({ path: authFile(key) });
  });
}
