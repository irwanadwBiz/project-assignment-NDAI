// M3 Audit Log: siapa yang boleh membaca, filter, akses ditolak tercatat, dan log tidak bisa diubah.
import { expect, test } from "@playwright/test";
import { ACCOUNTS, auditSince, authFile, dbNow, expectForbidden, login, sql, loginError } from "./helpers";

test.describe("Akses halaman Audit Log (M3-05)", () => {
  test.describe("superadmin", () => {
    test.use({ storageState: authFile("admin") });

    test("bisa membuka dan memfilter per aksi", async ({ page }) => {
      await page.goto("/admin/audit");
      await expect(page.getByRole("heading", { level: 1, name: "Audit Log" })).toBeVisible();

      await page.getByLabel("Aksi").selectOption("auth.login");
      await page.getByRole("button", { name: "Terapkan" }).click();
      await expect(page).toHaveURL(/aksi=auth\.login(&|$)/);

      const aksiCells = page.locator("table tbody tr td:nth-child(3) p.font-mono");
      await expect(aksiCells.first()).toBeVisible();
      for (const text of await aksiCells.allTextContents()) expect(text).toBe("auth.login");
    });

    test("filter email hanya menampilkan pengguna itu", async ({ page }) => {
      await page.goto("/admin/audit?email=analis");
      const emails = page.locator("table tbody tr td:nth-child(2) p:first-child");
      await expect(emails.first()).toBeVisible();
      for (const text of await emails.allTextContents()) expect(text).toContain("analis");
    });
  });

  test.describe("analis", () => {
    test.use({ storageState: authFile("analis") });

    test("bisa membuka lewat menunya sendiri", async ({ page }) => {
      await page.goto("/analis/koreksi-sql");
      await page.getByRole("navigation").getByRole("link", { name: "Audit Log" }).click();
      await expect(page.getByRole("heading", { level: 1, name: "Audit Log" })).toBeVisible();
    });
  });

  test.describe("supervisor", () => {
    test.use({ storageState: authFile("spv.jakarta") });

    test("ditolak, dan penolakannya tercatat", async ({ page }) => {
      const since = await dbNow();
      await page.goto("/admin/audit");
      await expectForbidden(page);

      const logs = await auditSince(since, "akses.ditolak", ACCOUNTS["spv.jakarta"].email);
      expect(logs.some((l) => l.objek === "audit:read")).toBe(true);
    });
  });
});

test.describe("Pencatatan dan integritas log", () => {
  test("setiap login gagal tercatat dengan IP dan muncul di halaman", async ({ page, browser }) => {
    const since = await dbNow();
    await login(page, ACCOUNTS["teknisi.jakarta"].email, "salah-total");
    await expect(loginError(page)).toBeVisible();

    const [row] = await sql`
      select id, ip from audit_logs
      where aksi = 'auth.login_gagal' and user_email = ${ACCOUNTS["teknisi.jakarta"].email}
        and waktu >= ${since.toISOString()}
      order by id desc limit 1`;
    expect(row).toBeDefined();
    expect(row.ip).toBeTruthy();

    const ctx = await browser.newContext({ storageState: authFile("admin") });
    const admin = await ctx.newPage();
    await admin.goto("/admin/audit?aksi=auth.login_gagal&email=teknisi.jakarta");
    await expect(admin.getByText("kata_sandi_salah").first()).toBeVisible();
    await ctx.close();
  });

  test("audit log tidak bisa diubah, dihapus, atau dikosongkan (M3-03)", async () => {
    const [target] = await sql`select id, aksi from audit_logs order by id limit 1`;
    expect(target).toBeDefined();

    await expect(sql`update audit_logs set aksi = 'diubah' where id = ${target.id}`).rejects.toThrow(
      /hanya boleh ditambah/,
    );
    await expect(sql`delete from audit_logs where id = ${target.id}`).rejects.toThrow(/hanya boleh ditambah/);
    await expect(sql`truncate audit_logs`).rejects.toThrow(/hanya boleh ditambah/);

    const [after] = await sql`select aksi from audit_logs where id = ${target.id}`;
    expect(after.aksi).toBe(target.aksi);
  });

  test("API yang ditolak juga tercatat", async ({ browser }) => {
    const since = await dbNow();
    const ctx = await browser.newContext({ storageState: authFile("teknisi.jabar") });
    expect((await ctx.request.get("/api/merchants")).status()).toBe(403);
    await ctx.close();

    const logs = await auditSince(since, "akses.ditolak", ACCOUNTS["teknisi.jabar"].email);
    expect(logs[0]).toMatchObject({ objek: "merchants:read", detail: { via: "api" } });
  });
});
