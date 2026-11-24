import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { homeFor } from "@/lib/rbac";

export default function RootPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-zinc-500">Memuat…</p>}>
      <RedirectToHome />
    </Suspense>
  );
}

async function RedirectToHome(): Promise<null> {
  const user = await getCurrentUser();
  redirect(user ? homeFor(user.role) : "/login");
}
