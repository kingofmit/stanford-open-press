import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";

async function middleware(request: NextRequest) {
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
  const isProtectedRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/editorial");

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export default middleware;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
