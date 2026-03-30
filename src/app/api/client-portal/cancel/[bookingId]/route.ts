import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendBookingCancelledClient, sendBookingCancelledOwner } from "@/lib/email"

const APP_URL = process.env.NEXTAUTH_URL ?? "https://reputix.net"

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
