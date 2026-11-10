// Master merchant & perangkat: supervisor mengelola wilayahnya, peran lain hanya baca,
// analis melihat data kontak tersamarkan, dan semua perubahan tercatat.
// Data uji: kode merchant MRC-9xxxxx dan serial E2E-..., dihapus di cleanup.teardown.ts.
import { expect, test, type Page } from "@playwright/test";
import { ACCOUNTS, auditSince, authFile, dbNow, expectForbidden, sql } from "./helpers";

test.describe.configure({ mode: "serial" });

const suffix = String(Date.now() % 100000).padStart(5, "0");
const KODE = `MRC-9${suffix}`;
const SN1 = `E2E-SN-${suffix}-A`;
const SN2 = `E2E-SN-${suffix}-B`;
let merchantId: number;

const spvJakarta = ACCOUNTS["spv.jakarta"].email;
const status = (page: Page) => page.locator("form p[role=status]").filter({ visible: true });

async function fillMerchant(page: Page, data: Partial<Record<string, string>>) {
  for (const [label, value] of Object.entries(data)) {
    await page.getByLabel(label, { exact: true }).filter({ visible: true }).fill(value!);
  }
}

const validMerchant = {
  "Nama merchant": "E2E Toko Uji",
  "Owner / PIC toko": "Bambang Pamungkas",
  "Nomor telepon": "+62 812-0000-9999",
  Email: "TokoUji@Contoh.test",
  Alamat: "Jl. Uji Coba No. 1",
  "Kabupaten / kota": "Kota Jakarta Barat",
};

test.describe("Supervisor Jakarta mengelola master data", () => {
  test.use({ storageState: authFile("spv.jakarta") });

  test("daftar merchant hanya berisi wilayahnya", async ({ page }) => {
    await page.goto("/merchants");
    await expect(page.getByRole("link", { name: "Daftarkan merchant" })).toBeVisible();
    const wilayah = await page.locator("table tbody tr td:nth-child(5)").allTextContents();
    expect(wilayah.length).toBeGreaterThan(0);
    expect(new Set(wilayah)).toEqual(new Set(["DKI Jakarta"]));
  });

  test("validasi: kode merchant dan nomor telepon", async ({ page }) => {
    await page.goto("/merchants/baru");
    await fillMerchant(page, { ...validMerchant, "Kode merchant": "ABC-123" });
    await page.getByRole("button", { name: "Daftarkan merchant" }).click();
    await expect(status(page)).toHaveText(/format MRC-xxxxxx/);

    await fillMerchant(page, { "Kode merchant": KODE, "Nomor telepon": "12345" });
    await page.getByRole("button", { name: "Daftarkan merchant" }).click();
    await expect(status(page)).toHaveText(/Nomor telepon tidak valid/);
  });

  test("mendaftarkan merchant: kode dinormalisasi dan petugas tercatat", async ({ page }) => {
    const since = await dbNow();
    await page.goto("/merchants/baru");
    // Huruf kecil dan tanpa tanda hubung, seperti input merchant di Vanya (UAT-08).
    await fillMerchant(page, { ...validMerchant, "Kode merchant": ` ${KODE.replace("MRC-", "mrc")} ` });
    await page.getByRole("button", { name: "Daftarkan merchant" }).click();

    await expect(page).toHaveURL(/\/merchants\/\d+$/);
    merchantId = Number(page.url().split("/").pop());
    await expect(page.getByRole("heading", { level: 1, name: "E2E Toko Uji" })).toBeVisible();
    await expect(page.getByText(KODE, { exact: true })).toBeVisible();
    const pendaftar = page.locator("dt:text-is('Didaftarkan oleh') + dd");
    await expect(pendaftar).toHaveText(ACCOUNTS["spv.jakarta"].nama);

    const [row] = await sql`select telepon, email, didaftarkan_oleh from merchants where kode_merchant = ${KODE}`;
    expect(row.telepon).toBe("081200009999");
    expect(row.email).toBe("tokouji@contoh.test");
    expect(row.didaftarkan_oleh).not.toBeNull();

    const [log] = await auditSince(since, "merchant.dibuat", spvJakarta);
    expect(log?.detail).toMatchObject({ kodeMerchant: KODE });
  });

  test("kode merchant yang sama ditolak", async ({ page }) => {
    await page.goto("/merchants/baru");
    await fillMerchant(page, { ...validMerchant, "Kode merchant": KODE });
    await page.getByRole("button", { name: "Daftarkan merchant" }).click();
    await expect(status(page)).toHaveText(`Kode merchant ${KODE} sudah terdaftar.`);
  });

  test("satu merchant bisa punya banyak perangkat, kode EDC otomatis", async ({ page }) => {
    const since = await dbNow();
    await page.goto(`/merchants/${merchantId}`);
    await expect(page.getByText("Belum ada perangkat.")).toBeVisible();

    for (const sn of [SN1, SN2]) {
      await page.getByLabel("Serial number").fill(sn.toLowerCase());
      await page.getByLabel("Merk").fill("PAX");
      await page.getByLabel("Tipe perangkat").fill("A920");
      await page.getByLabel("Firmware terakhir").fill("v8.0.0");
      await page.getByRole("button", { name: "Tambah perangkat" }).click();
      await expect(status(page)).toHaveText(new RegExp(`EDC-\\d{5} \\(${sn}\\) ditambahkan`));
    }

    await expect(page.getByRole("heading", { name: "Perangkat (2)" })).toBeVisible();
    const kode = await page.locator("table tbody tr td:first-child").allTextContents();
    expect(kode.every((k) => /^EDC-\d{5}$/.test(k))).toBe(true);
    expect(await auditSince(since, "perangkat.dibuat", spvJakarta)).toHaveLength(2);
  });

  test("serial number yang sama ditolak", async ({ page }) => {
    await page.goto(`/merchants/${merchantId}`);
    await page.getByLabel("Serial number").fill(SN1);
    await page.getByLabel("Merk").fill("PAX");
    await page.getByLabel("Tipe perangkat").fill("A920");
    await page.getByLabel("Firmware terakhir").fill("v8.0.0");
    await page.getByRole("button", { name: "Tambah perangkat" }).click();
    await expect(status(page)).toHaveText(`Serial number ${SN1} sudah terdaftar.`);
  });

  test("memperbarui firmware perangkat tercatat sebelum/sesudah", async ({ page }) => {
    const since = await dbNow();
    await page.goto(`/merchants/${merchantId}`);
    await page.locator("tr", { hasText: SN1 }).getByRole("link", { name: "Ubah" }).click();
    await expect(page).toHaveURL(/\/perangkat\/\d+\/edit$/);
    // Next 16 menyimpan halaman sebelumnya tersembunyi di DOM; targetkan yang terlihat.
    await page.getByLabel("Firmware terakhir").filter({ visible: true }).fill("v8.1.0");
    await page.getByRole("button", { name: "Simpan perangkat" }).click();

    await expect(page).toHaveURL(new RegExp(`/merchants/${merchantId}$`));
    await expect(page.locator("tr", { hasText: SN1 })).toContainText("v8.1.0");
    const [log] = await auditSince(since, "perangkat.diubah", spvJakarta);
    expect(log?.detail).toMatchObject({
      sebelum: { firmwareTerakhir: "v8.0.0" },
      sesudah: { firmwareTerakhir: "v8.1.0" },
    });
  });

  test("mengubah merchant: kode terkunci, data kontak tidak ditulis mentah ke log", async ({ page }) => {
    const since = await dbNow();
    await page.goto(`/merchants/${merchantId}/edit`);
    await expect(page.getByLabel("Kode merchant").filter({ visible: true })).toBeDisabled();
    await page.getByLabel("Nama merchant").filter({ visible: true }).fill("E2E Toko Uji Berubah");
    await page.getByLabel("Nomor telepon").filter({ visible: true }).fill("081299990000");
    await page.getByLabel("Status").filter({ visible: true }).selectOption("nonaktif");
    await page.getByRole("button", { name: "Simpan perubahan" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "E2E Toko Uji Berubah" })).toBeVisible();
    const [log] = await auditSince(since, "merchant.diubah", spvJakarta);
    expect(log?.detail).toMatchObject({
      sebelum: { nama: "E2E Toko Uji", status: "aktif", telepon: "(diubah)" },
      sesudah: { nama: "E2E Toko Uji Berubah", status: "nonaktif", telepon: "(diubah)" },
    });
    expect(JSON.stringify(log?.detail)).not.toContain("081299990000");
  });

  test("master perangkat bisa dicari per serial number", async ({ page }) => {
    await page.goto(`/perangkat?q=${SN2}`);
    await expect(page.getByText("1 perangkat")).toBeVisible();
    await expect(page.locator("tbody tr")).toContainText(KODE);
  });

  test("server menolak wilayah di luar wilayahnya walau form dimanipulasi", async ({ page }) => {
    const [jabar] = await sql`select id from regions where nama = 'Jawa Barat'`;
    await page.goto("/merchants/baru");
    await expect(page.locator('select[name="regionId"] option')).toHaveText(["DKI Jakarta"]);
    await fillMerchant(page, { ...validMerchant, "Kode merchant": `MRC-8${suffix}` });
    // Seperti pengguna yang mengubah form lewat DevTools: sisipkan wilayah lain tepat
    // sebelum kirim (setelah halaman interaktif, supaya tidak di-reset hydration React).
    const select = page.locator('select[name="regionId"]').filter({ visible: true });
    await select.evaluate((el, id) => {
      const opt = document.createElement("option");
      opt.value = String(id);
      opt.textContent = "Jawa Barat (disisipkan)";
      el.appendChild(opt);
    }, jabar.id);
    await select.selectOption(String(jabar.id));
    await expect(select).toHaveValue(String(jabar.id));
    await page.getByRole("button", { name: "Daftarkan merchant" }).click();

    await expect(status(page)).toHaveText("Wilayah harus salah satu wilayah Anda.");
    expect(await sql`select 1 from merchants where kode_merchant = ${`MRC-8${suffix}`}`).toHaveLength(0);
  });
});

test.describe("Supervisor wilayah lain", () => {
  test.use({ storageState: authFile("spv.jabar") });

  test("tidak bisa membuka merchant Jakarta, dan percobaannya tercatat", async ({ page }) => {
    const since = await dbNow();
    await page.goto(`/merchants/${merchantId}`);
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    await page.goto(`/merchants/${merchantId}/edit`);
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();

    const logs = await auditSince(since, "akses.ditolak", ACCOUNTS["spv.jabar"].email);
    expect(logs.some((l) => l.objek === `merchant:${merchantId}`)).toBe(true);
  });

  test("tidak melihat perangkat merchant Jakarta di master perangkat", async ({ page }) => {
    await page.goto(`/perangkat?q=${SN1}`);
    await expect(page.getByText("0 perangkat")).toBeVisible();
  });
});

test.describe("Manajer: semua wilayah, hanya baca", () => {
  test.use({ storageState: authFile("manajer") });

  test("melihat semua wilayah tanpa tombol ubah", async ({ page }) => {
    await page.goto("/merchants");
    const wilayah = new Set(await page.locator("table tbody tr td:nth-child(5)").allTextContents());
    expect(wilayah).toEqual(new Set(["DKI Jakarta", "Jawa Barat", "Jawa Timur"]));
    await expect(page.getByRole("link", { name: "Daftarkan merchant" })).toHaveCount(0);

    await page.goto(`/merchants/${merchantId}`);
    await expect(page.getByRole("heading", { level: 1, name: "E2E Toko Uji Berubah" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ubah data merchant" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Tambah perangkat" })).toHaveCount(0);
  });

  test("halaman tambah dan ubah ditolak (403)", async ({ page }) => {
    await page.goto("/merchants/baru");
    await expectForbidden(page);
    await page.goto(`/merchants/${merchantId}/edit`);
    await expectForbidden(page);
  });
});

test.describe("Analis: data kontak tersamarkan", () => {
  test.use({ storageState: authFile("analis") });

  test("owner, alamat, telepon, dan email disamarkan", async ({ page }) => {
    await page.goto(`/merchants/${merchantId}`);
    await expect(page.getByText("B*** P***")).toBeVisible();
    await expect(page.getByText("********0000")).toBeVisible();
    await expect(page.getByText("t***@contoh.test")).toBeVisible();
    await expect(page.getByText("Bambang Pamungkas")).toHaveCount(0);
    await expect(page.getByText("Jl. Uji Coba No. 1")).toHaveCount(0);
  });
});

test.describe("Teknisi", () => {
  test.use({ storageState: authFile("teknisi.jakarta") });

  test("tidak punya akses ke master merchant", async ({ page }) => {
    await page.goto(`/merchants/${merchantId}`);
    await expectForbidden(page);
  });
});
