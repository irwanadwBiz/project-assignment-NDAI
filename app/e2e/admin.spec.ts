// M1-02 dan M2-01: Superadmin membuat akun, mengubah peran/wilayah, dan menonaktifkan akun.
// Satu alur berurutan dengan akun e2e yang dihapus lagi di cleanup.teardown.ts.
import { expect, test, type Page } from "@playwright/test";
import { auditSince, authFile, dbNow, login, PASSWORD, sql, uniqueEmail, loginError } from "./helpers";

test.describe.configure({ mode: "serial" });
test.use({ storageState: authFile("admin") });

const email = uniqueEmail("spv-jatim");

const createForm = (page: Page) =>
  page.locator("section", { has: page.getByRole("heading", { name: "Akun baru" }) });
const userRow = (page: Page) => page.locator("li", { hasText: email });

test("supervisor tanpa wilayah ditolak", async ({ page }) => {
  await page.goto("/admin/users");
  const form = createForm(page);
  await form.getByPlaceholder("Nama").fill("E2E Tanpa Wilayah");
  await form.getByPlaceholder("Email").fill(uniqueEmail("tanpa-wilayah"));
  await form.getByPlaceholder("Kata sandi").fill(PASSWORD);
  await form.locator('select[name="role"]').selectOption("supervisor");
  await form.getByRole("button", { name: "Buat akun" }).click();

  await expect(form.getByText("Supervisor dan teknisi wajib punya minimal satu wilayah.")).toBeVisible();
});

test("superadmin membuat akun supervisor Jawa Timur", async ({ page }) => {
  const since = await dbNow();
  await page.goto("/admin/users");
  const form = createForm(page);
  await form.getByPlaceholder("Nama").fill("E2E SPV Jatim");
  await form.getByPlaceholder("Email").fill(email);
  await form.getByPlaceholder("Kata sandi").fill(PASSWORD);
  await form.locator('select[name="role"]').selectOption("supervisor");
  await form.getByLabel("Jawa Timur").check();
  await form.getByRole("button", { name: "Buat akun" }).click();

  await expect(form.getByText(`Akun ${email} dibuat.`)).toBeVisible();
  await expect(userRow(page)).toContainText("Supervisor Wilayah");

  const [log] = await auditSince(since, "user.dibuat", "admin@pusatkendali.test");
  expect(log?.detail).toMatchObject({ email, role: "supervisor" });
});

test("email yang sudah terdaftar ditolak", async ({ page }) => {
  await page.goto("/admin/users");
  const form = createForm(page);
  await form.getByPlaceholder("Nama").fill("E2E Duplikat");
  await form.getByPlaceholder("Email").fill(email.toUpperCase());
  await form.getByPlaceholder("Kata sandi").fill(PASSWORD);
  await form.getByLabel("Jawa Timur").check();
  await form.getByRole("button", { name: "Buat akun" }).click();

  await expect(form.getByText("Email sudah terdaftar.")).toBeVisible();
});

test("akun baru hanya melihat wilayah Jawa Timur", async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();
  await login(page, email);

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("Wilayah: Jawa Timur")).toBeVisible();
  const ids = await page.locator("table tbody tr td:first-child").allTextContents();
  expect(ids.length).toBeGreaterThan(0);
  expect(ids.every((id) => id.startsWith("MRC-0003"))).toBe(true);
  await ctx.storageState({ path: "e2e/.auth/e2e-user.json" });
  await ctx.close();
});

test("perubahan peran langsung berlaku dan tercatat sebelum/sesudah", async ({ page, browser }) => {
  const since = await dbNow();
  await page.goto("/admin/users");
  const row = userRow(page);
  await row.locator('select[name="role"]').selectOption("manajer");
  await row.getByRole("button", { name: "Simpan akses" }).click();
  await expect(row.getByText("Akses diperbarui.")).toBeVisible();

  // Sesi lama pengguna itu kini melihat semua wilayah sebagai manajer.
  const ctx = await browser.newContext({ storageState: "e2e/.auth/e2e-user.json" });
  const res = await ctx.request.get("/api/merchants");
  const body = await res.json();
  expect(body.role).toBe("manajer");
  expect(new Set(body.data.map((m: { wilayah: string }) => m.wilayah)).size).toBe(3);
  await ctx.close();

  const [log] = await auditSince(since, "user.akses_diubah", "admin@pusatkendali.test");
  expect(log?.detail).toMatchObject({
    email,
    sebelum: { role: "supervisor" },
    sesudah: { role: "manajer", regionIds: [] },
  });
});

test("akun yang dinonaktifkan langsung kehilangan sesi dan tidak bisa login", async ({ page, browser }) => {
  const since = await dbNow();
  await page.goto("/admin/users");
  await userRow(page).getByRole("button", { name: "Nonaktifkan" }).click();
  // Tunggu tombolnya berubah jadi "Aktifkan" (teks "Nonaktif" sudah ada di tombol "Nonaktifkan").
  await expect(userRow(page).getByRole("button", { name: "Aktifkan", exact: true })).toBeVisible();

  const ctx = await browser.newContext({ storageState: "e2e/.auth/e2e-user.json" });
  expect((await ctx.request.get("/api/me")).status()).toBe(401);
  const p = await ctx.newPage();
  await p.goto("/dashboard");
  await expect(p).toHaveURL(/\/login/);
  await ctx.clearCookies();
  await login(p, email);
  await expect(loginError(p)).toHaveText("Email atau kata sandi salah.");
  await ctx.close();

  expect(await auditSince(since, "user.dinonaktifkan", "admin@pusatkendali.test")).toHaveLength(1);
  const [failed] = await auditSince(since, "auth.login_gagal", email);
  expect(failed?.detail).toMatchObject({ alasan: "akun_nonaktif" });
  const [{ n }] = await sql`select count(*)::int as n from sessions s join users u on u.id = s.user_id where u.email = ${email}`;
  expect(n).toBe(0);
});

test("superadmin tidak bisa menonaktifkan akunnya sendiri", async ({ page }) => {
  await page.goto("/admin/users");
  const self = page.locator("li", { hasText: "(Anda)" });
  await expect(self).toBeVisible();
  await expect(self.getByRole("button", { name: "Nonaktifkan" })).toHaveCount(0);
});

test.describe("Regresi: form tidak boleh diam-diam berubah ke Superadmin", () => {
  // Bug: React 19 me-reset <form action> setelah sukses, <select> terkontrol kembali
  // ke opsi pertama (Superadmin) di DOM. Simpan berikutnya mengirim "superadmin".
  const roleOf = async (e: string) => (await sql`select role from users where email = ${e}`)[0]?.role;

  test("simpan akses dua kali berturut-turut tanpa muat ulang", async ({ page }) => {
    const target = uniqueEmail("regresi-edit");
    await page.goto("/admin/users");
    const form = createForm(page);
    await form.getByPlaceholder("Nama").fill("E2E Regresi Edit");
    await form.getByPlaceholder("Email").fill(target);
    await form.getByPlaceholder("Kata sandi").fill(PASSWORD);
    await form.getByLabel("Jawa Barat").check();
    await form.getByRole("button", { name: "Buat akun" }).click();
    await expect(page.locator("li", { hasText: target })).toBeVisible();

    const row = page.locator("li", { hasText: target });
    await row.getByLabel("Jawa Timur").check();
    await row.getByRole("button", { name: "Simpan akses" }).click();
    await expect(row.getByText("Akses diperbarui.")).toBeVisible();
    await expect(row.locator('select[name="role"]')).toHaveValue("teknisi");

    await row.getByLabel("Jawa Timur").uncheck();
    await row.getByRole("button", { name: "Simpan akses" }).click();
    await expect.poll(() => roleOf(target)).toBe("teknisi");
    await expect(row.locator('select[name="role"]')).toHaveValue("teknisi");
  });

  test("membuat dua akun berturut-turut tanpa muat ulang", async ({ page }) => {
    await page.goto("/admin/users");
    for (const label of ["regresi-buat-1", "regresi-buat-2"]) {
      const target = uniqueEmail(label);
      const form = createForm(page);
      await expect(form.locator('select[name="role"]')).toHaveValue("teknisi");
      await form.getByPlaceholder("Nama").fill(`E2E ${label}`);
      await form.getByPlaceholder("Email").fill(target);
      await form.getByPlaceholder("Kata sandi").fill(PASSWORD);
      await form.getByLabel("DKI Jakarta").check();
      await form.getByRole("button", { name: "Buat akun" }).click();
      await expect(page.getByText(`Akun ${target} dibuat.`)).toBeVisible();
      expect(await roleOf(target)).toBe("teknisi");
    }
  });
});
