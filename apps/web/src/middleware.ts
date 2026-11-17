import { NextResponse, type NextRequest } from "next/server";

/**
 * Lightweight middleware that checks for session cookie presence.
 * Full auth validation happens in page/API route server components via auth().
 * This avoids Prisma in Edge runtime.
 */
export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for session cookie (NextAuth v5 uses authjs.session-token)
  const sessionCookie =
    request.cookies.get("authjs.session-token") ||
    request.cookies.get("next-auth.session-token") ||
    request.cookies.get("__Secure-authjs.session-token");

  const isLoggedIn = !!sessionCookie?.value;

  // Allow /login/error and /login/verify even when logged in
  const isAuthPage =
    (pathname.startsWith("/login") || pathname.startsWith("/register")) &&
    !pathname.startsWith("/login/error") &&
    !pathname.startsWith("/login/verify");
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/editorial") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/submissions");

  // Redirect logged-in users away from auth pages
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect unauthenticated users to login
  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|.*\\..*).*)"],
};
