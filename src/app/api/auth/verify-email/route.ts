import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")
  const appUrl = process.env.NEXTAUTH_URL ?? "https://reputix.net"

  if (!token) {
    return NextResponse.redirect(`${appUrl}/login?error=invalid_token`)
  }

  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token },
  })

  if (!verificationToken || verificationToken.expires < new Date()) {
    return NextResponse.redirect(`${appUrl}/login?error=token_expired`)
  }

  await prisma.user.update({
    where: { email: verificationToken.identifier },
    data: { emailVerified: new Date() },
  })

  await prisma.verificationToken.delete({ where: { token } })

  return NextResponse.redirect(`${appUrl}/billing?verified=1`)
}
