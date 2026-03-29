import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  if (!token) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Protection route admin
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  const response = NextResponse.next()
  response.headers.set("x-pathname", request.nextUrl.pathname)
  return response
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/reviews/:path*",
    "/settings/:path*",
    "/billing/:path*",
    "/onboarding/:path*",
    "/admin/:path*",
  ],
}
