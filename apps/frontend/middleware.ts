import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // Define protected routes
  const isProtectedRoute = nextUrl.pathname.startsWith("/dashboard");

  // Define auth routes (where authenticated users shouldn't go)
  const isAuthRoute = nextUrl.pathname === "/sign-in";

  // If user is not logged in and trying to access protected route
  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/sign-in", nextUrl));
  }

  // If user is logged in and trying to access auth route, redirect to dashboard
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Allow all other requests
  return NextResponse.next();
});

// Configure which routes this middleware should run on
export const config = {
  // Match all routes except static files and API routes (except /api/auth)
  matcher: [
    "/((?!api/(?!auth)|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
