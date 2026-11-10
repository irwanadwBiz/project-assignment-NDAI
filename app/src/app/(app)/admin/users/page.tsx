import { asc } from "drizzle-orm";
import { db } from "@/db";
import { regions, userRegions, users } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/rbac";
import { setUserActive } from "./actions";
import { CreateUserForm, EditAccessForm } from "./user-forms";

// Halaman butuh sesi login, jadi selalu dirender per request.
export const instant = false;

export default async function UsersPage() {
  const admin = await requirePermission("users:manage");

  const [allUsers, allRegions, links] = await Promise.all([
    db
      .select({ id: users.id, nama: users.nama, email: users.email, role: users.role, aktif: users.aktif })
      .from(users)
      .orderBy(asc(users.role), asc(users.nama)),
    db.select().from(regions).orderBy(asc(regions.nama)),
    db.select().from(userRegions),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Manajemen Pengguna</h1>
        <p className="text-sm text-zinc-500">Buat akun dan atur peran serta wilayah (M1-02, M2-01).</p>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">Akun baru</h2>
        <CreateUserForm regions={allRegions} />
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white">
        <h2 className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold">Pengguna ({allUsers.length})</h2>
        <ul>
          {allUsers.map((u) => {
            const regionIds = links.filter((l) => l.userId === u.id).map((l) => l.regionId);
            const isSelf = u.id === admin.id;
            return (
              <li key={u.id} className="grid gap-4 border-t border-zinc-100 px-4 py-4 md:grid-cols-[1fr_2fr_auto]">
                <div>
                  <p className="text-sm font-medium">
                    {u.nama} {isSelf && <span className="text-xs text-zinc-400">(Anda)</span>}
                  </p>
                  <p className="text-xs text-zinc-500">{u.email}</p>
                  <p className="mt-1 text-xs">
                    {ROLE_LABELS[u.role]} ·{" "}
                    <span className={u.aktif ? "text-green-700" : "text-red-700"}>
                      {u.aktif ? "Aktif" : "Nonaktif"}
                    </span>
                  </p>
                </div>
                <EditAccessForm userId={u.id} role={u.role} regionIds={regionIds} regions={allRegions} />
                {!isSelf && (
                  <form action={setUserActive}>
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="aktif" value={String(!u.aktif)} />
                    <button
                      type="submit"
                      className={`rounded-md px-3 py-1 text-xs font-medium ${
                        u.aktif ? "text-red-700 hover:bg-red-50" : "text-green-700 hover:bg-green-50"
                      }`}
                    >
                      {u.aktif ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
