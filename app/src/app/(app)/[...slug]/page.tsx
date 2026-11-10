import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { ALL_MENU_ITEMS } from "@/lib/rbac";

// Halaman butuh sesi login, jadi selalu dirender per request.
export const instant = false;

// Placeholder untuk menu yang modulnya belum dibuat (PRD bagian 7).
// Izin tetap dicek di server. Saat pemilik modul membuat halaman aslinya
// (mis. src/app/(app)/aduan/page.tsx), route itu otomatis menggantikan placeholder ini.
export default async function PlaceholderPage({ params }: PageProps<"/[...slug]">) {
  const { slug } = await params;
  const href = "/" + slug.join("/");
  const item = ALL_MENU_ITEMS.find((m) => m.href === href);
  if (!item) notFound();

  await requirePermission(item.permission);

  return (
    <div>
      <h1 className="text-xl font-semibold">{item.label}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Modul {item.modul} · izin <code className="font-mono">{item.permission}</code>
      </p>
      <p className="mt-6 rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">
        Halaman ini belum dibuat. Akses Anda sudah diverifikasi oleh RBAC.
      </p>
    </div>
  );
}
