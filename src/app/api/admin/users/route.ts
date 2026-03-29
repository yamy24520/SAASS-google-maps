import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const users = await prisma.user.findMany({
    select: {
      id: true, email: true, name: true, image: true, role: true, createdAt: true,
      subscription: { select: { status: true, stripeCurrentPeriodEnd: true, stripeCustomerId: true } },
      _count: { select: { businesses: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ users })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { userId, role } = await req.json()
  if (!userId || !["USER", "ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 })
  }

  // Ne pas se retirer son propre rôle admin
  if (userId === session.user.id && role === "USER") {
    return NextResponse.json({ error: "Impossible de retirer votre propre rôle admin" }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, email: true, role: true },
  })

  return NextResponse.json({ user })
}
