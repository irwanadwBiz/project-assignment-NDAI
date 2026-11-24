import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { AUDIT_ACTIONS } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/rbac";

// Halaman butuh sesi login, jadi selalu dirender per request.
export const instant = false;

const PAGE_SIZE = 50;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const waktuFmt = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "Asia/Jakarta",
});

type Filters = { aksi?: string; email?: string; q?: string; dari?: string; sampai?: string; page?: string };

function one(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() || undefined;
}

function buildWhere(f: Filters): SQL | undefined {
  const conds: (SQL | undefined)[] = [];
  if (f.aksi) conds.push(eq(auditLogs.aksi, f.aksi));
  if (f.email) conds.push(ilike(auditLogs.userEmail, `%${f.email}%`));
  if (f.q) {
    const like = `%${f.q}%`;
    conds.push(
      or(
        ilike(auditLogs.objek, like),
        ilike(auditLogs.pertanyaan, like),
        ilike(auditLogs.sql, like),
        sql`${auditLogs.detail}::text ilike ${like}`,
      ),
    );
  }
  // Rentang tanggal dalam WIB, "sampai" inklusif.
  if (f.dari && DATE_RE.test(f.dari)) {
    conds.push(sql`${auditLogs.waktu} >= (${f.dari}::date)::timestamp at time zone 'Asia/Jakarta'`);
  }
  if (f.sampai && DATE_RE.test(f.sampai)) {
    conds.push(sql`${auditLogs.waktu} < (${f.sampai}::date + 1)::timestamp at time zone 'Asia/Jakarta'`);
  }
  return and(...conds);
}

function pageHref(f: Filters, page: number): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...f, page: String(page) })) if (v) params.set(k, v);
  return `/admin/audit?${params}`;
}

// M3-05: penelusuran log untuk Superadmin dan Analis Data. Hanya baca (M3-03).
export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requirePermission("audit:read");

  const sp = await searchParams;
  const f: Filters = {
    aksi: one(sp.aksi),
    email: one(sp.email),
    q: one(sp.q),
    dari: one(sp.dari),
    sampai: one(sp.sampai),
  };
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const where = buildWhere(f);

  const [rows, total] = await Promise.all([
    db
      .select()
      .from(auditLogs)
      .where(where)
      .orderBy(desc(auditLogs.waktu), desc(auditLogs.id))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.$count(auditLogs, where),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const input = "rounded-md border border-zinc-300 px-2 py-1.5 text-sm";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Audit Log</h1>
        <p className="text-sm text-zinc-500">
          Jejak login, perubahan akses, pertanyaan Tanya Data, dan persetujuan. Log tidak dapat diubah atau dihapus.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4">
        <label className="text-xs text-zinc-500">
          Aksi
          <select name="aksi" defaultValue={f.aksi ?? ""} className={`${input} mt-1 block`}>
            <option value="">Semua aksi</option>
            {Object.entries(AUDIT_ACTIONS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-zinc-500">
          Email pengguna
          <input name="email" defaultValue={f.email} placeholder="mis. spv.jakarta" className={`${input} mt-1 block`} />
        </label>
        <label className="text-xs text-zinc-500">
          Cari (objek, pertanyaan, SQL, detail)
          <input name="q" defaultValue={f.q} className={`${input} mt-1 block w-64`} />
        </label>
        <label className="text-xs text-zinc-500">
          Dari
          <input type="date" name="dari" defaultValue={f.dari} className={`${input} mt-1 block`} />
        </label>
        <label className="text-xs text-zinc-500">
          Sampai
          <input type="date" name="sampai" defaultValue={f.sampai} className={`${input} mt-1 block`} />
        </label>
        <button type="submit" className="rounded-md bg-blue-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-800">
          Terapkan
        </button>
        <Link href="/admin/audit" className="py-1.5 text-sm text-zinc-500 hover:underline">
          Reset
        </Link>
      </form>

      <section className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold">
          {total} kejadian {total > 0 && <span className="font-normal text-zinc-500">· halaman {page} dari {totalPages}</span>}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>
              <th className="px-4 py-2">Waktu (WIB)</th>
              <th className="px-4 py-2">Pengguna</th>
              <th className="px-4 py-2">Aksi</th>
              <th className="px-4 py-2">Objek</th>
              <th className="px-4 py-2">Rincian</th>
              <th className="px-4 py-2">IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
                  Tidak ada kejadian yang cocok.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-zinc-100 align-top">
                <td className="whitespace-nowrap px-4 py-2 text-xs">{waktuFmt.format(r.waktu)}</td>
                <td className="px-4 py-2">
                  <p className="text-xs">{r.userEmail ?? "-"}</p>
                  {r.userRole && <p className="text-xs text-zinc-500">{ROLE_LABELS[r.userRole]}</p>}
                </td>
                <td className="px-4 py-2">
                  <p className="text-xs font-medium">{AUDIT_ACTIONS[r.aksi as keyof typeof AUDIT_ACTIONS] ?? r.aksi}</p>
                  <p className="font-mono text-[11px] text-zinc-400">{r.aksi}</p>
                </td>
                <td className="px-4 py-2 font-mono text-xs">{r.objek ?? "-"}</td>
                <td className="max-w-md px-4 py-2 text-xs">
                  {r.pertanyaan && <p>&ldquo;{r.pertanyaan}&rdquo;</p>}
                  {r.sql && <pre className="mt-1 whitespace-pre-wrap rounded bg-zinc-50 p-2 font-mono text-[11px]">{r.sql}</pre>}
                  {r.jumlahBaris !== null && <p className="text-zinc-500">{r.jumlahBaris} baris</p>}
                  {r.detail && (
                    <code className="mt-1 block break-all font-mono text-[11px] text-zinc-600">
                      {JSON.stringify(r.detail).replace(/,"/g, ', "')}
                    </code>
                  )}
                </td>
                <td className="px-4 py-2 font-mono text-xs text-zinc-500">{r.ip ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex justify-between border-t border-zinc-200 px-4 py-3 text-sm">
            {page > 1 ? (
              <Link href={pageHref(f, page - 1)} className="text-blue-700 hover:underline">
                ← Sebelumnya
              </Link>
            ) : (
              <span />
            )}
            {page < totalPages && (
              <Link href={pageHref(f, page + 1)} className="text-blue-700 hover:underline">
                Berikutnya →
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
