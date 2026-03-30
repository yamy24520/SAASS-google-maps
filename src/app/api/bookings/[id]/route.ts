import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  sendBookingConfirmedClient, sendBookingCancelledClient,
  sendBookingConfirmedOwner, sendBookingCancelledOwner, sendBookingModifiedOwner,
} from "@/lib/email"

const APP_URL = process.env.NEXTAUTH_URL ?? "https://reputix.net"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params
  const booking = await prisma.booking.findFirst({
    where: { id },
    include: {
      business: { select: { userId: true, name: true, bookingType: true, user: { select: { email: true } } } },
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

  const isRestaurant = booking.business.bookingType === "restaurant"
  const ownerEmail = booking.business.user?.email
  const dashboardUrl = `${APP_URL}/bookings`

  // Date du booking affiché (on utilise la date d'origine pour les emails statut)
  const effectiveDate = date ?? booking.date
  const dateLabel = new Date(effectiveDate + "T12:00:00").toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })
  const effectiveTimeSlot = timeSlot ?? booking.timeSlot
  const cancelUrl = updated.cancelToken ? `${APP_URL}/cancel/${updated.cancelToken}` : undefined

  const serviceName = isRestaurant
    ? `Table pour ${booking.partySize ?? 1}`
    : (booking.service?.name ?? "Réservation")
  const duration = booking.service?.duration ?? 0
  const price = isRestaurant ? 0 : (booking.service?.price ?? 0)

  const ownerBase = {
    businessName: booking.business.name,
    clientName: booking.clientName,
    clientEmail: booking.clientEmail,
    clientPhone: booking.clientPhone ?? undefined,
    serviceName,
    date: dateLabel,
    timeSlot: effectiveTimeSlot,
    duration,
    price,
    isRestaurant,
    partySize: booking.partySize,
    notes: notes !== undefined ? notes : booking.notes,
    dashboardUrl,
  }

  if (status === "CONFIRMED") {
    // Mail client
    sendBookingConfirmedClient({
      clientEmail: booking.clientEmail,
      clientName: booking.clientName,
      businessName: booking.business.name,
      serviceName,
      date: dateLabel,
      timeSlot: effectiveTimeSlot,
      duration,
      price,
      cancelUrl,
      isRestaurant,
      partySize: booking.partySize,
    }).catch(console.error)
    // Mail proprio
    if (ownerEmail) {
      sendBookingConfirmedOwner({ ownerEmail, ...ownerBase }).catch(console.error)
    }
  }

  if (status === "CANCELLED") {
    // Mail client
    sendBookingCancelledClient({
      clientEmail: booking.clientEmail,
      clientName: booking.clientName,
      businessName: booking.business.name,
      serviceName,
      date: dateLabel,
      timeSlot: effectiveTimeSlot,
    }).catch(console.error)
    // Mail proprio
    if (ownerEmail) {
      sendBookingCancelledOwner({ ownerEmail, ...ownerBase, cancelledBy: "owner" }).catch(console.error)
    }
  }

  // Modification sans changement de statut (date, heure, notes, nom, téléphone)
  if (!status && ownerEmail) {
    const changes: string[] = []
    if (date && date !== booking.date) changes.push(`📅 Date : ${new Date(booking.date + "T12:00:00").toLocaleDateString("fr-FR")} → ${new Date(date + "T12:00:00").toLocaleDateString("fr-FR")}`)
    if (timeSlot && timeSlot !== booking.timeSlot) changes.push(`🕐 Heure : ${booking.timeSlot} → ${timeSlot}`)
    if (notes !== undefined && notes !== booking.notes) changes.push(`📝 Notes modifiées`)
    if (clientName && clientName !== booking.clientName) changes.push(`👤 Nom : ${booking.clientName} → ${clientName}`)
    if (clientPhone !== undefined && clientPhone !== booking.clientPhone) changes.push(`📞 Téléphone modifié`)
    if (changes.length > 0) {
      sendBookingModifiedOwner({ ownerEmail, ...ownerBase, changes }).catch(console.error)
    }
  }

  return NextResponse.json({ booking: updated })
}
