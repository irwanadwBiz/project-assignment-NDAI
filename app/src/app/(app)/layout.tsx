import { Suspense } from "react";
import { Sidebar } from "./sidebar";

// Semua halaman di grup ini butuh login dan data per pengguna, jadi tidak di-prerender.
// Lihat docs: guides/authentication-with-cache-components#migrating-an-existing-app
export const instant = false;

// Sesi dibaca di dalam <Suspense> (syarat Cache Components), bukan di level atas layout.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-zinc-50">
      <aside className="w-64 shrink-0 border-r border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-4">
          <p className="text-sm font-semibold">Pusat Kendali</p>
          <p className="text-xs text-zinc-500">Merchant & Perangkat EDC</p>
        </div>
        <Suspense fallback={<p className="p-4 text-xs text-zinc-400">Memuat menu…</p>}>
          <Sidebar />
        </Suspense>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
