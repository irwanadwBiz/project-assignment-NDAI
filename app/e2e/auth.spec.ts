// M1 Autentikasi: login, sesi, logout, dan pencatatannya di audit log.
import { expect, test } from "@playwright/test";
import { ACCOUNTS, auditSince, dbNow, login, logout, sql, loginError } from "./helpers";

test.describe("Autentikasi", () => {
  test("pengunjung tanpa login diarahkan ke /login dengan ?next", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
    await expect(page.getByRole("button", { name: "Masuk" })).toBeVisible();
  });

  test("API tanpa login membalas 401", async ({ request }) => {
    const res = await request.get("/api/merchants");
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: "Belum login" });
  });

  test("kata sandi salah ditolak dengan pesan umum dan tercatat", async ({ page }) => {
    const since = await dbNow();
    await login(page, ACCOUNTS["spv.jabar"].email, "bukan-kata-sandi");

    await expect(loginError(page)).toHaveText("Email atau kata sandi salah.");
    await expect(page).toHaveURL(/\/login/);

    const [log] = await auditSince(since, "auth.login_gagal", ACCOUNTS["spv.jabar"].email);
    expect(log?.detail).toMatchObject({ alasan: "kata_sandi_salah" });
  });

  test("email tidak terdaftar memakai pesan yang sama (tidak membocorkan akun)", async ({ page }) => {
    const since = await dbNow();
    await login(page, "tidak-ada@pusatkendali.test", "apa-saja-123");

    await expect(loginError(page)).toHaveText("Email atau kata sandi salah.");
    const [log] = await auditSince(since, "auth.login_gagal", "tidak-ada@pusatkendali.test");
    expect(log?.detail).toMatchObject({ alasan: "email_tidak_terdaftar" });
    expect(log?.user_role).toBeNull();
  });

  test("email dinormalisasi (spasi dan huruf besar) lalu diarahkan ke ?next", async ({ page }) => {
    const since = await dbNow();
    await login(page, "  SPV.Jakarta@PusatKendali.test ", undefined, "/login?next=/aduan");

    await expect(page).toHaveURL(/\/aduan$/);
    await expect(page.getByRole("heading", { name: "Daftar Aduan" })).toBeVisible();
    expect(await auditSince(since, "auth.login", ACCOUNTS["spv.jakarta"].email)).toHaveLength(1);
  });

  test("?next ke halaman yang tidak diizinkan atau situs luar diabaikan", async ({ page }) => {
    await login(page, ACCOUNTS["teknisi.jabar"].email, undefined, "/login?next=/admin/users");
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.context().clearCookies();
    await login(page, ACCOUNTS["teknisi.jabar"].email, undefined, "/login?next=//contoh-jahat.com");
    await expect(page).toHaveURL(/localhost:\d+\/dashboard$/);
  });

  test("cookie sesi palsu tidak memberi akses", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "pk_session", value: "token-palsu", url: baseURL! }]);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);

    const res = await page.request.get("/api/me");
    expect(res.status()).toBe(401);
  });

  test("logout menghapus sesi di server dan membersihkan halaman", async ({ page }) => {
    const email = ACCOUNTS["manajer"].email;
    await login(page, email);
    await expect(page.getByText("Merchant dalam cakupan Anda")).toBeVisible();
    const [{ n: before }] = await sql`
      select count(*)::int as n from sessions s join users u on u.id = s.user_id where u.email = ${email}`;

    const since = await dbNow();
    await logout(page);

    // Data halaman sebelumnya tidak tertinggal di DOM (muat ulang penuh).
    await expect(page.getByText("Merchant dalam cakupan Anda")).toHaveCount(0);
    // Sesi di database ikut terhapus, dan halaman terlindungi kembali ke login.
    const [{ n: after }] = await sql`
      select count(*)::int as n from sessions s join users u on u.id = s.user_id where u.email = ${email}`;
    expect(after).toBe(before - 1);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    expect(await auditSince(since, "auth.logout", email)).toHaveLength(1);
  });
});
