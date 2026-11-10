# Dokumentasi Testing

Panduan menjalankan, membaca, dan menambah test end-to-end (E2E) untuk Pusat Kendali Merchant & Perangkat EDC.
Saat ini test mencakup modul M1 (Autentikasi), M2 (RBAC), dan M3 (Audit Log). Modul lain menambah test-nya
sendiri mengikuti pola di [Menambah test untuk modul baru](#menambah-test-untuk-modul-baru).

Daftar isi:

1. [Ringkasan](#ringkasan)
2. [Persiapan](#persiapan)
3. [Menjalankan test](#menjalankan-test)
4. [Cara kerja suite](#cara-kerja-suite)
5. [Daftar test](#daftar-test)
6. [Keterlacakan ke PRD](#keterlacakan-ke-prd)
7. [Helper yang tersedia](#helper-yang-tersedia)
8. [Menambah test untuk modul baru](#menambah-test-untuk-modul-baru)
9. [Konvensi](#konvensi)
10. [Pemecahan masalah](#pemecahan-masalah)
11. [Menjalankan di CI](#menjalankan-di-ci)
12. [Keterbatasan yang diketahui](#keterbatasan-yang-diketahui)

## Ringkasan

| Hal | Nilai |
| --- | --- |
| Alat | [Playwright](https://playwright.dev) `@playwright/test` 1.65 |
| Browser | Lokal: Google Chrome yang terpasang (`channel: "chrome"`). CI: Chromium Playwright |
| Lokasi test | `e2e/` |
| Konfigurasi | `playwright.config.ts` |
| Jumlah test | 49 (8 setup, 1 cleanup, 40 test) |
| Waktu jalan | sekitar 1,5 sampai 2 menit |
| Database | Neon dari `DATABASE_URL` di `.env.local` (database yang sama dengan pengembangan) |

Test berjalan di browser sungguhan terhadap aplikasi yang berjalan (`npm run dev`), lalu memeriksa hasilnya
dua kali: di layar (yang dilihat pengguna) dan langsung di database (misalnya baris audit log benar-benar ada).

## Persiapan

Sekali saja, setelah clone:

```bash
cp .env.example .env.local     # isi DATABASE_URL dari Neon
npm install
npm run db:push                # buat tabel
npm run db:setup               # pasang trigger audit_logs (hanya INSERT)
```

Syarat:

- Node.js 24 atau lebih baru.
- Google Chrome terpasang di `/Applications/Google Chrome.app` (macOS) atau lokasi standar OS lain.
- `.env.local` berisi `DATABASE_URL` yang valid. Cek dengan membuka http://localhost:3000/api/health.

Seed data demo tidak perlu dijalankan manual: test setup menjalankan `npm run db:seed` sendiri.

## Menjalankan test

| Perintah | Kegunaan |
| --- | --- |
| `npm run test:e2e` | Jalankan semua test tanpa jendela browser (headless) |
| `npm run test:e2e -- --headed` | Jalankan sambil menampilkan jendela Chrome |
| `npm run test:e2e:ui` | Mode UI interaktif: pilih test, lihat tiap langkah, jalankan ulang |
| `npm run test:e2e:report` | Buka laporan HTML hasil run terakhir |
| `npx playwright test e2e/rbac.spec.ts` | Jalankan satu file |
| `npx playwright test -g "logout"` | Jalankan test yang judulnya mengandung kata tertentu |
| `npx playwright test --last-failed` | Jalankan ulang hanya test yang gagal sebelumnya |
| `npx playwright test --debug -g "logout"` | Jalankan langkah demi langkah dengan Playwright Inspector |
| `npx playwright show-trace test-results/<folder>/trace.zip` | Buka rekaman (trace) test yang gagal |

Server dev: bila `npm run dev` sudah berjalan di port 3000, test memakainya. Bila belum, Playwright
menyalakannya sendiri dan mematikannya lagi setelah selesai. Bila port 3000 dipakai aplikasi lain:
`E2E_PORT=3100 npm run test:e2e` (Playwright menyalakan dev server di port itu).

> Next.js 16 hanya mengizinkan satu `next dev` per folder proyek. Bila dev server proyek ini sudah jalan
> di port 3000, jalankan test tanpa `E2E_PORT` supaya server itu dipakai ulang.

Hasil yang diharapkan:

```text
Running 49 tests using 1 worker
cleanup: 4 akun e2e dihapus
  49 passed (1.7m)
```

## Cara kerja suite

Playwright menjalankan tiga project secara berurutan:

```text
setup  ──►  chrome (semua *.spec.ts)  ──►  cleanup
```

1. **setup** (`e2e/auth.setup.ts`)
   - Menjalankan `npm run db:seed`. Seed bersifat idempoten dan **mengembalikan peran, wilayah, dan status aktif
     akun demo ke bawaan**, jadi test selalu mulai dari keadaan yang sama.
   - Login lewat form sekali untuk tiap akun demo, lalu menyimpan cookie sesinya ke `e2e/.auth/<akun>.json`.
     Test lain memakai file ini (`test.use({ storageState: authFile("admin") })`) supaya tidak perlu login ulang.
2. **chrome**: semua file `*.spec.ts`, satu per satu (`workers: 1`), karena semuanya memakai database yang sama.
3. **cleanup** (`e2e/cleanup.teardown.ts`): menghapus akun buatan test (email berawalan `e2e-`). Berjalan
   walaupun ada test yang gagal.

Akun demo yang dipakai (didefinisikan di `src/db/seed-data.ts`, kata sandi di `SEED_PASSWORD`):

| Kunci di test | Peran | Wilayah |
| --- | --- | --- |
| `admin` | Superadmin | - |
| `spv.jakarta` | Supervisor Wilayah | DKI Jakarta |
| `spv.jabar` | Supervisor Wilayah | Jawa Barat |
| `teknisi.jakarta` | Teknisi Lapangan | DKI Jakarta |
| `teknisi.jabar` | Teknisi Lapangan | Jawa Barat |
| `manajer` | Manajer Operasional | semua |
| `analis` | Analis Data | semua |

Merchant demo: 3 di DKI Jakarta (`MRC-0001xx`), 2 di Jawa Barat (`MRC-0002xx`), 2 di Jawa Timur (`MRC-0003xx`).

## Daftar test

### `e2e/auth.spec.ts`: Autentikasi (M1)

| Test | Yang dibuktikan |
| --- | --- |
| Pengunjung tanpa login diarahkan ke `/login?next=` | Halaman terlindungi tidak bisa dibuka tanpa sesi |
| API tanpa login membalas 401 | Route Handler menolak dengan JSON, bukan redirect |
| Kata sandi salah | Pesan umum "Email atau kata sandi salah."; audit `auth.login_gagal` dengan alasan `kata_sandi_salah` |
| Email tidak terdaftar | Pesan sama persis (tidak membocorkan email mana yang terdaftar); alasan `email_tidak_terdaftar` |
| Email dinormalisasi | Spasi dan huruf besar diabaikan, lalu diarahkan ke `?next`; audit `auth.login` |
| `?next` tidak aman diabaikan | Teknisi dengan `?next=/admin/users` dan `?next=//situs-luar` mendarat di `/dashboard` |
| Cookie sesi palsu | Token acak tidak memberi akses ke halaman maupun API |
| Logout | Sesi terhapus di database, data halaman tidak tertinggal di DOM, audit `auth.logout` |

### `e2e/rbac.spec.ts`: RBAC dan pembatasan wilayah (M2)

| Test | Yang dibuktikan |
| --- | --- |
| Menu samping per peran (5 test) | Menu persis sama dengan `ROLE_MENUS` (PRD bagian 7) |
| Matriks akses per peran (5 test, masing-masing 17 halaman) | Setiap halaman dibuka langsung lewat URL; yang berizin tampil, yang tidak menampilkan "Akses ditolak" |
| Supervisor hanya menerima merchant wilayahnya | API `/api/merchants` untuk `spv.jakarta` dan `spv.jabar` |
| Supervisor meminta wilayah lain lewat `?region=` | Mendapat 0 baris, bukan data wilayah lain |
| Manajer dan analis melihat semua wilayah | Ketiga wilayah muncul |
| Teknisi dan superadmin ditolak di API merchant | 403 |
| Dashboard supervisor | Tabel merchant hanya berisi wilayahnya |
| URL tidak terdaftar | Halaman 404 tampil |

Matriks akses dibangkitkan otomatis dari `src/lib/rbac.ts`. Bila izin atau menu di sana diubah, test ikut
menyesuaikan, jadi yang dites adalah **bahwa server menegakkan matriks itu**, bukan isi matriksnya.
Isi matriks sendiri ditinjau terhadap PRD bagian 3 dan 7 saat review kode.

### `e2e/admin.spec.ts`: Manajemen pengguna (M1-02, M2-01)

Berjalan berurutan (`mode: "serial"`) dengan satu akun e2e yang dibuat di awal.

| Test | Yang dibuktikan |
| --- | --- |
| Supervisor tanpa wilayah ditolak | Validasi server: supervisor dan teknisi wajib punya wilayah |
| Superadmin membuat akun supervisor Jawa Timur | Akun muncul di daftar; audit `user.dibuat` |
| Email yang sudah terdaftar ditolak | Termasuk bila ditulis dengan huruf besar |
| Akun baru hanya melihat Jawa Timur | Login sebagai akun baru, dashboard hanya `MRC-0003xx` |
| Perubahan peran langsung berlaku | Sesi yang sudah ada langsung melihat semua wilayah sebagai manajer; audit mencatat sebelum dan sesudah |
| Akun dinonaktifkan | Sesi langsung putus (API 401), tidak bisa login lagi, alasan `akun_nonaktif`, baris sesi terhapus |
| Superadmin tidak bisa menonaktifkan diri sendiri | Tombol tidak tersedia untuk akun sendiri |
| Regresi: simpan akses dua kali tanpa muat ulang | Peran tetap `teknisi` (lihat [catatan bug](#catatan-bug-yang-pernah-ditemukan)) |
| Regresi: buat dua akun berturut-turut | Pilihan peran kembali ke `teknisi`, bukan `superadmin` |

### `e2e/audit.spec.ts`: Audit Log (M3)

| Test | Yang dibuktikan |
| --- | --- |
| Superadmin membuka dan memfilter per aksi | Filter `aksi` hanya menampilkan aksi itu |
| Filter email | Hanya baris milik pengguna itu |
| Analis membuka lewat menunya | Menu Audit Log ada untuk Analis (M3-05) |
| Supervisor ditolak dan penolakannya tercatat | 403 dan audit `akses.ditolak` dengan objek `audit:read` |
| Login gagal tercatat dengan IP dan tampil di halaman | Kolom IP terisi; rincian `kata_sandi_salah` tampil |
| Log tidak bisa diubah, dihapus, atau dikosongkan | `UPDATE`, `DELETE`, `TRUNCATE` ditolak trigger; baris tetap utuh (M3-03) |
| API yang ditolak juga tercatat | Audit `akses.ditolak` dengan `{ via: "api" }` |

## Keterlacakan ke PRD

| Kebutuhan PRD | Test |
| --- | --- |
| M1-01 Login, kata sandi ter-hash | auth: login berhasil/gagal |
| M1-02 Register hanya oleh Superadmin | rbac: matriks (`/admin/users` hanya superadmin); admin: buat akun |
| M1-03 Sesi token, masa berlaku, logout | auth: cookie palsu, logout; admin: nonaktif memutus sesi |
| M2-01 Satu peran, nol atau lebih wilayah | admin: validasi wilayah, ubah peran |
| M2-02 Supervisor hanya wilayahnya (BRL-07) | rbac: pembatasan wilayah (API dan dashboard) |
| M2-03 Teknisi hanya tugasnya | rbac: matriks (teknisi ditolak di halaman dan API supervisor). Data tugas menyusul di M5 |
| M2-04 Manajer semua wilayah, hanya baca | rbac: manajer melihat semua wilayah; matriks (manajer ditolak di Assignment) |
| M2-05 Pembatasan di sisi server | rbac: semua halaman dibuka lewat URL langsung; API 403 |
| M3-01 Catat pertanyaan Tanya Data dan SQL | Belum: menunggu modul Vanna (M9), helper `auditTanyaData` sudah ada |
| M3-02 Catat perubahan, assignment, persetujuan | admin dan audit: perubahan akun tercatat. Aduan/assignment menyusul di M4/M5 |
| M3-03 Audit log tidak dapat diubah | audit: UPDATE/DELETE/TRUNCATE ditolak |
| M3-04 Masking sebelum ke model | Belum ada test E2E (fungsi murni, cocok untuk unit test) |
| M3-05 Halaman penelusuran log | audit: akses dan filter |
| UAT-04 Supervisor bertanya wilayah lain | rbac: `?region=` wilayah lain mendapat 0 baris (versi API; versi Tanya Data menyusul di M9) |
| UAT-07 Koreksi SQL tercatat | Belum: menunggu M9 |

UAT lain (UAT-01, 02, 03, 05, 06, 08, 09, 10) milik modul yang belum dibuat.

## Helper yang tersedia

Semua di `e2e/helpers.ts`:

| Helper | Kegunaan |
| --- | --- |
| `ACCOUNTS["spv.jakarta"]` | Data akun demo (`nama`, `email`, `role`, `wilayah`) |
| `ROLE_ACCOUNT.supervisor` | Satu akun perwakilan per peran |
| `PASSWORD` | Kata sandi akun demo |
| `authFile("admin")` | Path cookie sesi tersimpan; pakai dengan `test.use({ storageState: ... })` |
| `login(page, email, password?, path?)` | Isi dan kirim form login |
| `loginError(page)` | Locator pesan error form login |
| `logout(page)` | Klik Keluar dan tunggu sampai di `/login` |
| `expectForbidden(page)` | Pastikan halaman 403 "Akses ditolak" tampil |
| `uniqueEmail("label")` | Email unik berawalan `e2e-` (otomatis dihapus di cleanup) |
| `sql` | Klien Neon untuk memeriksa database langsung |
| `dbNow()` | Waktu sekarang menurut database (hindari selisih jam laptop dan Neon) |
| `auditSince(since, aksi, email?)` | Baris audit dengan aksi tertentu sejak waktu tertentu |

## Menambah test untuk modul baru

Contoh untuk modul Aduan (M4). Buat `e2e/aduan.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { ACCOUNTS, auditSince, authFile, dbNow, expectForbidden } from "./helpers";

test.describe("Supervisor menyetujui aduan (M4-03)", () => {
  test.use({ storageState: authFile("spv.jakarta") });

  test("aduan berpindah ke Assigned dan tercatat", async ({ page }) => {
    const since = await dbNow();
    await page.goto("/aduan");
    const row = page.locator("tr", { hasText: "MRC-000101" });
    await row.getByRole("button", { name: "Setujui" }).click();
    await expect(row).toContainText("Assigned");

    const [log] = await auditSince(since, "aduan.disetujui", ACCOUNTS["spv.jakarta"].email);
    expect(log?.detail).toMatchObject({ dari: "Created", ke: "Assigned" });
  });
});

test.describe("Teknisi tidak bisa menyetujui aduan", () => {
  test.use({ storageState: authFile("teknisi.jakarta") });

  test("halaman assignment ditolak", async ({ page }) => {
    await page.goto("/assignment");
    await expectForbidden(page);
  });
});
```

Langkah:

1. **Data uji**: tambahkan ke `src/db/seed-data.ts` dan `scripts/seed.mts` supaya seed tetap idempoten.
   Data yang dibuat di tengah test pakai penanda `e2e-` lalu hapus di `e2e/cleanup.teardown.ts`.
2. **Peran**: pakai `storageState` akun demo, jangan login ulang di setiap test (kecuali yang menguji login).
3. **Server dulu**: selalu uji dengan membuka URL atau memanggil API langsung, bukan hanya mengecek menu
   tersembunyi (M2-05).
4. **Audit**: setiap tindakan yang wajib tercatat (M3-02) dicek dengan `auditSince`.
5. **Wilayah**: untuk data berwilayah, uji minimal satu supervisor yang melihat datanya dan satu yang tidak.
6. Halaman placeholder di `[...slug]` sudah memeriksa izin. Saat halaman asli dibuat, test matriks di
   `rbac.spec.ts` otomatis memeriksa halaman barunya, asalkan `<h1>` halaman sama dengan label menunya.

## Konvensi

- **Bahasa**: judul test dan komentar dalam bahasa Indonesia, menjelaskan perilaku yang diharapkan.
- **Locator**: utamakan `getByRole`, `getByLabel`, `getByPlaceholder`, `getByText`. Hindari selector CSS
  kecuali tidak ada alternatif (mis. `select[name="role"]` yang tidak punya label).
- **Satu sumber kebenaran**: jangan menyalin daftar peran, menu, atau akun ke test. Impor dari
  `src/lib/rbac.ts` dan `src/db/seed-data.ts`.
- **Tunggu hasil, bukan waktu**: jangan pakai `waitForTimeout`. Pakai `expect(...).toBeVisible()`,
  `toHaveURL`, atau `expect.poll(() => querySql())` untuk menunggu database.
- **Teks yang mirip**: hati-hati dengan pencocokan sebagian. "Nonaktif" cocok juga dengan tombol "Nonaktifkan";
  pakai `{ exact: true }` atau targetkan elemen yang berubah.
- **Waktu**: ambil `since` dari `dbNow()` sebelum aksi, bukan `new Date()` di laptop.
- **Data milik test**: email `e2e-...@pusatkendali.test` via `uniqueEmail()`. Jangan mengubah akun demo
  secara permanen; bila perlu mengubahnya, seed berikutnya akan memulihkannya.
- **Urutan**: file yang langkahnya saling bergantung memakai `test.describe.configure({ mode: "serial" })`.

## Pemecahan masalah

| Gejala | Penyebab dan solusi |
| --- | --- |
| `Executable doesn't exist at .../chromium_headless_shell-1254/...` | Playwright mencari Chromium miliknya (terjadi bila `CI` diset). Di lokal, jangan set `CI` dan pastikan Google Chrome terpasang, atau jalankan `npx playwright install chromium` |
| `DATABASE_URL belum diset` | Buat `.env.local` dari `.env.example` |
| Test pertama lambat atau timeout | Kompilasi pertama Next dev bisa puluhan detik. Timeout test sudah 90 detik; jalankan `npm run dev` lebih dulu supaya halaman sudah terkompilasi |
| `strict mode violation: getByRole('alert') resolved to 2 elements` | Next.js punya elemen route announcer ber-role `alert`. Pakai `loginError(page)` |
| Halaman 404 atau 403 tapi status HTTP 200 | Halaman di-stream (`loading.tsx`), jadi status dikirim sebelum `notFound()`/`forbidden()` terpanggil. Periksa isi halaman, bukan status. API tetap mengembalikan 401/403 yang benar |
| Akun demo punya peran yang salah | Jalankan `npm run db:seed`; seed mengembalikan peran, wilayah, dan status aktif bawaan |
| Login di setup gagal | Cek kata sandi akun demo belum diubah manual. Seed tidak mengubah kata sandi akun yang sudah ada |
| `npm install` sangat lambat | Pakai `npm install --prefer-offline` supaya npm memakai cache. Jangan menjalankan dua `npm install` bersamaan di folder yang sama |
| Port 3000 dipakai aplikasi lain | `E2E_PORT=3100 npm run test:e2e`; Playwright menyalakan dev server di port 3100 |
| `Process from config.webServer was not able to start` | Dev server proyek ini sudah jalan di port lain (Next.js hanya mengizinkan satu per folder). Hentikan dulu, atau jalankan test tanpa `E2E_PORT` |
| Test lolos di lokal tapi gagal di CI | Cek `trace.zip` di artefak CI dengan `npx playwright show-trace` |

## Menjalankan di CI

Contoh GitHub Actions (`.github/workflows/e2e.yml`):

```yaml
name: e2e
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: ${{ secrets.E2E_DATABASE_URL }} # sebaiknya branch Neon khusus test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: echo "DATABASE_URL=$DATABASE_URL" > .env.local
      - run: npm run db:push -- --force && npm run db:setup
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: playwright-report, path: playwright-report }
```

GitHub Actions otomatis mengeset `CI=true`, sehingga `playwright.config.ts` memakai Chromium hasil
`npx playwright install` (bukan Google Chrome), mengaktifkan 1 kali percobaan ulang, dan menolak `test.only`.

## Keterbatasan yang diketahui

- **Audit log bertambah setiap run.** Test memakai database pengembangan, dan baris audit log tidak bisa
  dihapus (M3-03). Setiap run menambah beberapa puluh baris (login setup, login gagal, akses ditolak, perubahan akun e2e).
  Untuk memisahkannya, buat branch Neon khusus test dan isi `DATABASE_URL` ke branch itu.
- **Test tidak bisa paralel** (`workers: 1`) karena berbagi database dan akun demo.
- **Server Action tidak diuji langsung tanpa UI.** Izin di Server Action diuji lewat UI dan lewat matriks
  halaman. Pemanggilan Server Action palsu dari luar belum dicakup.
- **Masking (M3-04)** belum punya test otomatis. Fungsi `maskPII`/`maskRecord` murni, cocok diuji dengan
  unit test (mis. `node:test`) bila dibutuhkan.

## Catatan bug yang pernah ditemukan

**Form manajemen pengguna mengubah peran menjadi Superadmin tanpa disadari** (ditemukan saat membuat test ini).

- Penyebab: React 19 me-reset `<form action={...}>` setelah action berhasil. `<select>` peran yang terkontrol
  kembali ke opsi pertama di DOM, yaitu "Superadmin", sementara state React tetap. Simpan berikutnya pada
  baris yang sama, atau membuat akun berikutnya tanpa muat ulang, mengirim `superadmin`.
- Terdeteksi lewat audit log (perubahan `teknisi` ke `superadmin` yang tidak disengaja).
- Perbaikan: form di `src/app/(app)/admin/users/user-forms.tsx` dikirim lewat `onSubmit` manual sehingga
  tidak di-reset otomatis. Form buat akun dipasang ulang (`key`) setelah berhasil.
- Dijaga oleh dua test regresi di `e2e/admin.spec.ts`.
- Pelajaran untuk modul lain: hindari `<select>` terkontrol di dalam `<form action={...}>`.
