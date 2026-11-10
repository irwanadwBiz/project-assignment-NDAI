import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ROLE_LABELS, ROLE_MENUS } from "@/lib/rbac";
import { LogoutButton } from "./logout-button";

// Menu mengikuti peran (PRD bagian 7). Menyembunyikan menu hanya untuk UX;
// setiap halaman tetap memeriksa izin sendiri di server.
export async function Sidebar() {
  const user = await requireUser();

  return (
    <div className="flex flex-col">
      <div className="border-b border-zinc-200 px-4 py-3">
        <p className="truncate text-sm font-medium">{user.nama}</p>
        <p className="text-xs text-zinc-500">{ROLE_LABELS[user.role]}</p>
        {user.regionNames.length > 0 && (
          <p className="mt-1 text-xs text-zinc-500">Wilayah: {user.regionNames.join(", ")}</p>
        )}
      </div>
      <nav className="flex flex-col p-2">
        {ROLE_MENUS[user.role].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-zinc-200 p-2">
        <LogoutButton />
      </div>
    </div>
  );
}
