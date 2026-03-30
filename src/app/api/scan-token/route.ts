import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SignJWT } from "jose"

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "fallback-secret")

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const bizId = new URL(req.url).searchParams.get("biz")
  const business = bizId
    ? await prisma.business.findFirst({ where: { id: bizId, userId: session.user.id }, select: { id: true } })
    : await prisma.business.findFirst({ where: { userId: session.user.id }, select: { id: true } })

  if (!business) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 })

  const token = await new SignJWT({ businessId: business.id, purpose: "menu-scan" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(secret)

  return NextResponse.json({ token })
}
