"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { ROLE_LABELS, ROLES, ROLES_REQUIRING_REGION, type Role } from "@/lib/rbac";
import { createUser, updateUserAccess, type FormState } from "./actions";

type Region = { id: number; nama: string };

const input = "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none";

function AccessFields({
  regions,
  defaultRole,
  defaultRegionIds = [],
}: {
  regions: Region[];
  defaultRole: Role;
  defaultRegionIds?: number[];
}) {
  const [role, setRole] = useState<Role>(defaultRole);
  const needsRegion = ROLES_REQUIRING_REGION.includes(role);

  return (
    <>
      <select name="role" value={role} onChange={(e) => setRole(e.target.value as Role)} className={input}>
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
      {needsRegion ? (
        <fieldset className="flex flex-wrap gap-x-4 gap-y-1">
          <legend className="mb-1 text-xs text-zinc-500">Wilayah (minimal satu)</legend>
          {regions.map((r) => (
            <label key={r.id} className="flex items-center gap-1 text-sm">
              <input type="checkbox" name="regionIds" value={r.id} defaultChecked={defaultRegionIds.includes(r.id)} />
              {r.nama}
            </label>
          ))}
        </fieldset>
      ) : (
        <p className="text-xs text-zinc-500">Peran ini melihat semua wilayah, tidak perlu memilih wilayah.</p>
      )}
    </>
  );
}

// Jangan pakai <form action={...}>: React 19 me-reset form setelah action selesai, dan
// <select> terkontrol kembali ke opsi pertama (Superadmin) di DOM sementara state tetap.
// Simpan berikutnya lalu mengirim "superadmin" tanpa disadari (eskalasi hak akses).
// Dengan onSubmit manual, form tidak di-reset otomatis.
function submitWith(dispatch: (fd: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };
}

function Message({ state }: { state: FormState }) {
  if (state.error) return <p className="text-sm text-red-700">{state.error}</p>;
  if (state.ok) return <p className="text-sm text-green-700">{state.ok}</p>;
  return null;
}

export function CreateUserForm({ regions }: { regions: Region[] }) {
  const [state, action, pending] = useActionState(createUser, {});
  return (
    // key: setelah akun berhasil dibuat, form dipasang ulang supaya semua isian
    // (termasuk peran) kembali ke awal secara konsisten.
    <form key={state.ok ?? "baru"} onSubmit={submitWith(action)} className="grid gap-3 sm:grid-cols-2">
      <input name="nama" placeholder="Nama" required className={input} />
      <input name="email" type="email" placeholder="Email" required className={input} />
      <input
        name="password"
        type="password"
        placeholder="Kata sandi (min. 8 karakter)"
        minLength={8}
        required
        autoComplete="new-password"
        className={input}
      />
      <div className="space-y-2 sm:col-span-2">
        <AccessFields regions={regions} defaultRole="teknisi" />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {pending ? "Menyimpan…" : "Buat akun"}
        </button>
        <Message state={state} />
      </div>
    </form>
  );
}

export function EditAccessForm({
  userId,
  role,
  regionIds,
  regions,
}: {
  userId: number;
  role: Role;
  regionIds: number[];
  regions: Region[];
}) {
  const [state, action, pending] = useActionState(updateUserAccess, {});
  return (
    <form onSubmit={submitWith(action)} className="space-y-2">
      <input type="hidden" name="userId" value={userId} />
      <AccessFields regions={regions} defaultRole={role} defaultRegionIds={regionIds} />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium hover:bg-zinc-100 disabled:opacity-60"
        >
          {pending ? "Menyimpan…" : "Simpan akses"}
        </button>
        <Message state={state} />
      </div>
    </form>
  );
}
