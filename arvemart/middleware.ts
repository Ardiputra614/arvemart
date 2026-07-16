import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const url = request.nextUrl;

  // Kalau diakses lewat blog.arvemart.com, arahkan ke route /blog internal
  if (hostname.startsWith("blog.") && !url.pathname.startsWith("/blog")) {
    return NextResponse.rewrite(new URL(`/blog${url.pathname}`, request.url));
  }

  return NextResponse.next();
}

// Jangan sentuh asset statis (_next, favicon, dll) biar CSS/JS tetap normal
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};