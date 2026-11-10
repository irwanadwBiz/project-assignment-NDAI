"use client";

import { useTransition } from "react";
import { logout } from "@/app/actions/auth";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await logout();
          window.location.replace("/login"); // muat ulang penuh: buang cache halaman sebelumnya
        })
      }
      className="w-full rounded-md px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
    >
      {pending ? "Keluar…" : "Keluar"}
    </button>
  );
}
