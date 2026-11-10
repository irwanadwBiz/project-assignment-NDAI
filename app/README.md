# Pusat Kendali Merchant & Perangkat EDC

Next.js 16 + Neon Postgres (Drizzle ORM). Ruang lingkup: [PRD](../PRD_Pusat_Kendali_Merchant_dan_Perangkat_EDC.md)
dan [BRD](../BRD_Pusat_Kendali_Merchant_dan_Perangkat_EDC.md) di root repo.

Semua perintah di bawah dijalankan dari folder `app/`.

## Menjalankan

```bash
cd app
cp .env.example .env.local   # isi DATABASE_URL dari Neon
npm install
npm run db:push              # buat/ubah tabel sesuai src/db/schema.ts
npm run db:setup             # trigger: audit_logs hanya boleh INSERT (M3-03)
npm run db:seed              # wilayah, akun demo per peran, contoh merchant
npm run dev
```

Cek koneksi database: http://localhost:3000/api/health

## Akun demo (hasil `npm run db:seed`)

| Peran | Email | Wilayah |
| --- | --- | --- |
| Superadmin | admin@pusatkendali.test | - |
| Supervisor Wilayah | spv.jakarta@pusatkendali.test | DKI Jakarta |
| Supervisor Wilayah | spv.jabar@pusatkendali.test | Jawa Barat |
| Teknisi Lapangan | teknisi.jakarta@pusatkendali.test | DKI Jakarta |
| Teknisi Lapangan | teknisi.jabar@pusatkendali.test | Jawa Barat |
| Manajer Operasional | manajer@pusatkendali.test | semua |
| Analis Data | analis@pusatkendali.test | semua |

Kata sandi semua akun demo: lihat `SEED_PASSWORD` di `src/db/seed-data.ts`. Hanya untuk pengembangan lokal.

## Autentikasi dan RBAC (M1, M2)

| File | Isi |
| --- | --- |
| `src/lib/rbac.ts` | Matriks izin per peran, cakupan data, dan menu per peran (PRD bagian 3 dan 7) |
| `src/lib/auth.ts` | Sesi (cookie + tabel `sessions`), `requirePermission`, `authorizeApi`, `regionCondition` |
| `src/lib/password.ts` | Hash kata sandi scrypt |
| `src/proxy.ts` | Redirect ke `/login` bila belum ada cookie (hanya UX, bukan pengaman utama) |

Cakupan data per peran:

| Peran | Cakupan |
| --- | --- |
| Superadmin | Konfigurasi sistem saja (akun, peran, wilayah, audit log) |
| Supervisor | Hanya wilayahnya (BRL-07) |
| Teknisi | Hanya tugas yang ditugaskan kepadanya |
| Manajer | Semua wilayah, hanya baca |
| Analis | Data analitik semua wilayah (masking di M3) |

### Cara memakai di modul lain

Pembatasan wajib di sisi server (M2-05). Menyembunyikan menu saja tidak cukup.

```ts
// Halaman (Server Component) atau Server Action
const user = await requirePermission("complaints:approve"); // 403 jika tidak berizin

// Route Handler
const { user, error } = await authorizeApi("complaints:read");
if (error) return error; // 401 / 403 JSON

// Query dengan filter wilayah (supervisor otomatis dibatasi)
db.select().from(complaints).where(regionCondition(user, complaints.regionId));
```

Menambah izin baru: tambahkan di `PERMISSIONS`, lalu daftarkan ke peran di `ROLE_PERMISSIONS`.

Halaman menu yang modulnya belum dibuat dilayani oleh placeholder `src/app/(app)/[...slug]/page.tsx`
(izin tetap dicek). Membuat `src/app/(app)/aduan/page.tsx` otomatis menggantikan placeholder untuk `/aduan`.

## Audit Log dan Masking (M3)

| File | Isi |
| --- | --- |
| `src/lib/audit.ts` | `audit()` untuk mencatat tindakan, `auditTanyaData()` untuk Vanna, daftar `AUDIT_ACTIONS` |
| `src/lib/masking.ts` | `maskPII()` untuk teks bebas, `maskRecord()` untuk baris data, `maskName/maskEmail/maskDigits` |
| `scripts/db-setup.mts` | Trigger yang menolak UPDATE, DELETE, dan TRUNCATE pada `audit_logs` |
| `src/app/(app)/admin/audit/page.tsx` | Halaman penelusuran log (Superadmin dan Analis), filter aksi, email, teks, tanggal |

Sudah tercatat otomatis: login berhasil/gagal (beserta alasannya), logout, akses ditolak (403),
akun dibuat, peran/wilayah diubah (sebelum dan sesudah), akun dinonaktifkan/diaktifkan, wilayah dibuat.

### Cara memakai di modul lain

```ts
import { audit, auditTanyaData } from "@/lib/audit";
import { maskPII, maskRecord } from "@/lib/masking";

// M3-02: setiap perubahan status, penugasan, persetujuan, koreksi manusia
await audit({ aksi: "aduan.disetujui", user, objek: `aduan:${id}`, detail: { dari: "Created", ke: "Assigned" } });

// M3-01 (Vanna): setiap pertanyaan Tanya Data
await auditTanyaData({ user, pertanyaan, sql, jumlahBaris: rows.length, durasiMs });

// M3-04: sebelum data dikirim ke model (Vanna, Vanya, VLM)
const aman = rows.map(maskRecord);
const keluhanAman = maskPII(keluhan);
```

Aksi baru ditambahkan di `AUDIT_ACTIONS` supaya muncul di filter halaman Audit Log.

Catatan:
- `audit()` sengaja melempar error bila gagal menulis: tindakan lebih baik gagal daripada berjalan tanpa jejak.
- Trigger mencegah aplikasi mengubah log. Pemilik database (role `neondb_owner`) masih bisa mematikan
  trigger, jadi untuk produksi aplikasi sebaiknya memakai role database terpisah yang bukan pemilik tabel.

## Testing E2E (Playwright)

Dokumentasi lengkap: [docs/TESTING.md](docs/TESTING.md) (cara kerja, daftar test, keterlacakan ke PRD,
cara menambah test untuk modul baru, pemecahan masalah, CI).

```bash
npm run test:e2e          # jalankan semua test (server dev dipakai ulang bila sudah jalan)
npm run test:e2e:ui       # mode UI interaktif
npm run test:e2e:report   # buka laporan HTML hasil run terakhir
```

| File | Cakupan |
| --- | --- |
| `e2e/auth.setup.ts` | Seed data demo, lalu login lewat form sekali per akun demo (cookie disimpan di `e2e/.auth/`) |
| `e2e/auth.spec.ts` | Redirect tanpa login, 401 API, login gagal/berhasil, normalisasi email, `?next` aman, cookie palsu, logout |
| `e2e/rbac.spec.ts` | Menu per peran, matriks akses semua halaman per peran, pembatasan wilayah API dan dashboard |
| `e2e/admin.spec.ts` | Buat akun, validasi, ubah peran, nonaktifkan akun, regresi bug reset form |
| `e2e/audit.spec.ts` | Akses halaman Audit Log, filter, penolakan tercatat, log tidak bisa diubah |
| `e2e/cleanup.teardown.ts` | Hapus akun buatan test (email berawalan `e2e-`) |

Catatan:
- Test memakai database dari `.env.local`. Seed di awal mengembalikan peran dan wilayah akun demo ke bawaan.
- Akun buatan test dihapus di akhir, tetapi baris audit log dari test tetap ada (log memang tidak bisa dihapus).
- Browser: lokal memakai Google Chrome yang terpasang; di CI (`CI=true`) memakai Chromium dari
  `npx playwright install chromium`.
