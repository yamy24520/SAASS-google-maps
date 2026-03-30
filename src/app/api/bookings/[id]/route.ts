import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendBookingConfirmedClient, sendBookingCancelledClient } from "@/lib/email"

const APP_URL = process.env.NEXTAUTH_URL ?? "https://reputix.net"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params
  const booking = await prisma.booking.findFirst({
    where: { id },
    include: {
      business: { select: { userId: true, name: true, bookingType: true } },
      service: { select: { name: true, duration: true, price: true } },
    },
  })

  if (!booking || booking.business.userId !== session.user.id) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 })
  }

  const body = await req.json()
  const { status, date, timeSlot, notes, clientName, clientPhone } = body

  if (status && !["PENDING", "CONFIRMED", "CANCELLED"].includes(status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 })
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      ...(status && { status }),
      ...(date && { date }),
      ...(timeSlot && { timeSlot }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(clientName && { clientName }),
      ...(clientPhone !== undefined && { clientPhone: clientPhone || null }),
    },
  })

  const dateLabel = new Date(booking.date + "T12:00:00").toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })
  const cancelUrl = updated.cancelToken ? `${APP_URL}/cancel/${updated.cancelToken}` : undefined

  if (status && status === "CONFIRMED") {
    const isRestaurant = booking.business.bookingType === "restaurant"
    sendBookingConfirmedClient({
      clientEmail: booking.clientEmail,
      clientName: booking.clientName,
      businessName: booking.business.name,
      serviceName: isRestaurant ? `Table pour ${booking.partySize ?? 1}` : (booking.service?.name ?? "Réservation"),
      date: dateLabel,
      timeSlot: booking.timeSlot,
      duration: booking.service?.duration ?? 0,
      price: isRestaurant ? 0 : (booking.service?.price ?? 0),
      cancelUrl,
      isRestaurant,
      partySize: booking.partySize,
    }).catch(console.error)
  }

  if (status && status === "CANCELLED") {
    sendBookingCancelledClient({
      clientEmail: booking.clientEmail,
      clientName: booking.clientName,
      businessName: booking.business.name,
      serviceName: booking.service?.name ?? "Réservation",
      date: dateLabel,
      timeSlot: booking.timeSlot,
    }).catch(console.error)
  }

  return NextResponse.json({ booking: updated })
}
