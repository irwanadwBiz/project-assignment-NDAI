import { getCurrentUser } from "@/lib/auth";
import { ROLE_PERMISSIONS } from "@/lib/rbac";

// Info pengguna yang sedang login beserta izinnya.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Belum login" }, { status: 401 });
  return Response.json({ ...user, permissions: ROLE_PERMISSIONS[user.role] });
}
