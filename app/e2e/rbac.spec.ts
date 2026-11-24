// M2 RBAC: menu per peran, matriks akses halaman, dan pembatasan wilayah di server.
import { expect, test } from "@playwright/test";
import { ALL_MENU_ITEMS, can, ROLE_MENUS, ROLES } from "../src/lib/rbac";
import { authFile, expectForbidden, ROLE_ACCOUNT, type AccountKey } from "./helpers";

for (const role of ROLES) {
  test.describe(`Peran ${role}`, () => {
    test.use({ storageState: authFile(ROLE_ACCOUNT[role]) });

    test("menu samping sesuai PRD bagian 7", async ({ page }) => {
      await page.goto(ROLE_MENUS[role][0].href);
      const nav = page.getByRole("navigation");
      await expect(nav.getByRole("link")).toHaveText(ROLE_MENUS[role].map((m) => m.label));
    });

    test("matriks akses semua halaman dicek di server", async ({ page }) => {
      for (const item of ALL_MENU_ITEMS) {
        await test.step(`${item.href} → ${can(role, item.permission) ? "boleh" : "403"}`, async () => {
          // Dibuka langsung lewat URL, bukan lewat menu: menyembunyikan menu saja tidak cukup.
          await page.goto(item.href);
          if (can(role, item.permission)) {
            await expect(page.getByRole("heading", { level: 1, name: item.label })).toBeVisible();
          } else {
            await expectForbidden(page);
          }
        });
      }
    });
  });
}

test.describe("Pembatasan wilayah (BRL-07, UAT-04)", () => {
  const merchantsFor = async (
    browser: import("@playwright/test").Browser,
    key: AccountKey,
    query = "",
  ) => {
    const ctx = await browser.newContext({ storageState: authFile(key) });
    const res = await ctx.request.get(`/api/merchants${query}`);
    const body = res.ok() ? await res.json() : null;
    await ctx.close();
    return { status: res.status(), body };
  };

  test("supervisor hanya menerima merchant wilayahnya", async ({ browser }) => {
    const jkt = await merchantsFor(browser, "spv.jakarta");
    expect(jkt.status).toBe(200);
    expect(jkt.body.count).toBeGreaterThan(0);
    expect(new Set(jkt.body.data.map((m: { wilayah: string }) => m.wilayah))).toEqual(new Set(["DKI Jakarta"]));

    const jabar = await merchantsFor(browser, "spv.jabar");
    expect(new Set(jabar.body.data.map((m: { wilayah: string }) => m.wilayah))).toEqual(new Set(["Jawa Barat"]));
  });

  test("supervisor yang meminta wilayah lain lewat parameter mendapat 0 baris", async ({ browser }) => {
    const manajer = await merchantsFor(browser, "manajer");
    const jatimId = manajer.body.data.find((m: { wilayah: string }) => m.wilayah === "Jawa Timur").regionId;

    const spv = await merchantsFor(browser, "spv.jakarta", `?region=${jatimId}`);
    expect(spv.status).toBe(200);
    expect(spv.body.count).toBe(0);
  });

  test("manajer dan analis melihat semua wilayah", async ({ browser }) => {
    for (const key of ["manajer", "analis"] as const) {
      const r = await merchantsFor(browser, key);
      expect(new Set(r.body.data.map((m: { wilayah: string }) => m.wilayah))).toEqual(
        new Set(["DKI Jakarta", "Jawa Barat", "Jawa Timur"]),
      );
    }
  });

  test("teknisi dan superadmin ditolak (403) di API merchant", async ({ browser }) => {
    for (const key of ["teknisi.jakarta", "admin"] as const) {
      expect((await merchantsFor(browser, key)).status).toBe(403);
    }
  });

  test("dashboard supervisor hanya menampilkan merchant wilayahnya", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: authFile("spv.jabar") });
    const page = await ctx.newPage();
    await page.goto("/dashboard");
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible();
    for (const cell of await rows.locator("td:nth-child(3)").allTextContents()) {
      expect(cell).toBe("Jawa Barat");
    }
    await ctx.close();
  });
});

test.describe("Halaman tidak terdaftar", () => {
  test.use({ storageState: authFile("admin") });

  test("URL yang bukan menu mana pun menampilkan halaman 404", async ({ page }) => {
    // Halaman di-stream (loading.tsx), jadi kode HTTP sudah 200 sebelum notFound() terpanggil.
    await page.goto("/halaman-yang-tidak-ada");
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  });
});
