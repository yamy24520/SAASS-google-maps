import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params
  const booking = await prisma.booking.findFirst({
    where: { id },
    include: { business: { select: { userId: true } } },
  })
  if (!booking || booking.business.userId !== session.user.id) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 })
  }

  const { status } = await req.json()
  if (!["PENDING", "CONFIRMED", "CANCELLED"].includes(status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 })
  }

  const updated = await prisma.booking.update({ where: { id }, data: { status } })
  return NextResponse.json({ booking: updated })
}
