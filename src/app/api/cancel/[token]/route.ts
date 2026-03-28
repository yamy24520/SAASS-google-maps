import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendBookingCancelledClient } from "@/lib/email"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const booking = await prisma.booking.findUnique({
    where: { cancelToken: token },
    include: {
      business: { select: { name: true } },
      service: { select: { name: true } },
    },
  })
  if (!booking) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  return NextResponse.json({
    id: booking.id,
    clientName: booking.clientName,
    businessName: booking.business.name,
    serviceName: booking.service?.name ?? "Réservation",
    date: booking.date,
    timeSlot: booking.timeSlot,
    status: booking.status,
  })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const booking = await prisma.booking.findUnique({
    where: { cancelToken: token },
    include: {
      business: { select: { name: true } },
      service: { select: { name: true } },
    },
  })

  if (!booking) return NextResponse.json({ error: "Introuvable" }, { status: 404 })
  if (booking.status === "CANCELLED") return NextResponse.json({ error: "Déjà annulé" }, { status: 409 })

  await prisma.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } })

  const dateLabel = new Date(booking.date + "T12:00:00").toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })

  sendBookingCancelledClient({
    clientEmail: booking.clientEmail,
    clientName: booking.clientName,
    businessName: booking.business.name,
    serviceName: booking.service?.name ?? "Réservation",
    date: dateLabel,
    timeSlot: booking.timeSlot,
  }).catch(console.error)

  return NextResponse.json({ ok: true })
}
