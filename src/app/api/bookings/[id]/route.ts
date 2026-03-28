import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendBookingConfirmedClient, sendBookingCancelledClient } from "@/lib/email"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params
  const booking = await prisma.booking.findFirst({
    where: { id },
    include: {
      business: { select: { userId: true, name: true } },
      service: { select: { name: true, duration: true, price: true } },
    },
  })

  if (!booking || booking.business.userId !== session.user.id) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 })
  }

  const { status } = await req.json()
  if (!["PENDING", "CONFIRMED", "CANCELLED"].includes(status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 })
  }

  const updated = await prisma.booking.update({ where: { id }, data: { status } })

  const dateLabel = new Date(booking.date + "T12:00:00").toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })

  if (status === "CONFIRMED") {
    sendBookingConfirmedClient({
      clientEmail: booking.clientEmail,
      clientName: booking.clientName,
      businessName: booking.business.name,
      serviceName: booking.service.name,
      date: dateLabel,
      timeSlot: booking.timeSlot,
      duration: booking.service.duration,
      price: booking.service.price,
    }).catch(console.error)
  }

  if (status === "CANCELLED") {
    sendBookingCancelledClient({
      clientEmail: booking.clientEmail,
      clientName: booking.clientName,
      businessName: booking.business.name,
      serviceName: booking.service.name,
      date: dateLabel,
      timeSlot: booking.timeSlot,
    }).catch(console.error)
  }

  return NextResponse.json({ booking: updated })
}
