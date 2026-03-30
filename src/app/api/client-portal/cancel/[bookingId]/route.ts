import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params
  const token = new URL(req.url).searchParams.get("token")
  if (!token) return NextResponse.json({ error: "Token manquant" }, { status: 400 })

  const session = await prisma.clientSession.findUnique({ where: { token } })
  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: "Lien expiré ou invalide" }, { status: 401 })
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, businessId: true, clientEmail: true, status: true, date: true },
  })

  if (!booking) return NextResponse.json({ error: "RDV introuvable" }, { status: 404 })
  if (booking.businessId !== session.businessId || booking.clientEmail !== session.clientEmail) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }
  if (booking.status === "CANCELLED") {
    return NextResponse.json({ error: "Déjà annulé" }, { status: 409 })
  }

  const today = new Date().toISOString().split("T")[0]
  if (booking.date < today) {
    return NextResponse.json({ error: "Impossible d'annuler un RDV passé" }, { status: 400 })
  }

  await prisma.booking.update({ where: { id: bookingId }, data: { status: "CANCELLED" } })

  return NextResponse.json({ ok: true })
}
