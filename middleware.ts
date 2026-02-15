import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Redirect /home to /
  if (pathname === "/home" || pathname.startsWith("/home/")) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  // Protected routes - redirect to home if not authenticated
  // Note: We can't access Firebase auth state in middleware (edge runtime)
  // So we rely on client-side protection via ProtectedRoute component
  const protectedPaths = ["/notes", "/notes/"]
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path))

  if (isProtectedPath) {
    // Check for auth cookie (set by Firebase auth)
    const hasAuthCookie = request.cookies.has("__session")
    
    // For now, allow access - client-side will handle redirect
    // In production, implement proper auth check here
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/home/:path*",
    "/notes/:path*",
    "/auth/:path*",
  ],
}
