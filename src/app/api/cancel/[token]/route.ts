import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendBookingCancelledClient, sendBookingCancelledOwner } from "@/lib/email"

const APP_URL = process.env.NEXTAUTH_URL ?? "https://reputix.net"

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
      business: {
        select: {
          name: true, bookingType: true,
          user: { select: { email: true } },
        },
      },
      service: { select: { name: true, duration: true, price: true } },
    },
  })

  if (!booking) return NextResponse.json({ error: "Introuvable" }, { status: 404 })
  if (booking.status === "CANCELLED") return NextResponse.json({ error: "Déjà annulé" }, { status: 409 })

  await prisma.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } })

  const isRestaurant = booking.business.bookingType === "restaurant"
  const dateLabel = new Date(booking.date + "T12:00:00").toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })
  const serviceName = isRestaurant
    ? `Table pour ${booking.partySize ?? 1}`
    : (booking.service?.name ?? "Réservation")

  // Mail client
  sendBookingCancelledClient({
    clientEmail: booking.clientEmail,
    clientName: booking.clientName,
    businessName: booking.business.name,
    serviceName,
    date: dateLabel,
    timeSlot: booking.timeSlot,
  }).catch(console.error)

  // Mail proprio
  const ownerEmail = booking.business.user?.email
  if (ownerEmail) {
    sendBookingCancelledOwner({
      ownerEmail,
      businessName: booking.business.name,
      clientName: booking.clientName,
      clientEmail: booking.clientEmail,
      clientPhone: booking.clientPhone ?? undefined,
      serviceName,
      date: dateLabel,
      timeSlot: booking.timeSlot,
      duration: booking.service?.duration ?? 0,
      price: isRestaurant ? 0 : (booking.service?.price ?? 0),
      isRestaurant,
      partySize: booking.partySize,
      cancelledBy: "client",
      dashboardUrl: `${APP_URL}/bookings`,
    }).catch(console.error)
  }

  return NextResponse.json({ ok: true })
}
