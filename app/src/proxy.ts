// Pemeriksaan optimistis: belum ada cookie sesi → arahkan ke /login.
// Ini hanya untuk UX. Validasi sesi dan izin yang sebenarnya ada di src/lib/auth.ts
// dan dijalankan di setiap halaman, Server Action, dan Route Handler (M2-05).
import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "pk_session";

export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Semua halaman kecuali /login, /api (mengembalikan 401 JSON sendiri), dan aset statis.
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
