import { after, NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { dateSchema, timeSchema } from "@/lib/booking-rules"
import { getAvailability } from "@/lib/booking-availability"
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
      business: {
        select: {
          userId: true, name: true, bookingType: true,
          user: { select: { email: true } },
          emailHeaderUrl: true, emailHeaderHeight: true, emailBgColor: true, emailButtonColor: true,
          emailGreeting: true, emailFooterMessage: true, emailSenderName: true,
        },
      },
      service: { select: { name: true, duration: true, price: true } },
    },
  })

  if (!booking || booking.business.userId !== session.user.id) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 })
  }

  const parsed = z.object({
    status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]).optional(),
    date: dateSchema.optional(), timeSlot: timeSchema.optional(),
    staffId: z.string().nullable().optional(),
    notes: z.string().max(5000).nullable().optional(),
    clientName: z.string().trim().min(1).max(150).optional(),
    clientPhone: z.string().max(40).nullable().optional(),
  }).safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Modification invalide." }, { status: 400 })
  const { status, date, timeSlot, staffId, notes, clientName, clientPhone } = parsed.data

  if (status && !["PENDING", "CONFIRMED", "CANCELLED"].includes(status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 })
  }

  let updated
  try { updated = await prisma.$transaction(async tx => {
    let assignedStaff = staffId === undefined ? booking.staffId : staffId
    if ((status ?? booking.status) !== "CANCELLED" && ((date !== undefined && date !== booking.date) || (timeSlot !== undefined && timeSlot !== booking.timeSlot) || (staffId !== undefined && staffId !== booking.staffId) || (status && status !== booking.status))) {
      const availability = await getAvailability({ businessId: booking.businessId, date: date ?? booking.date, serviceId: booking.serviceId, staffId: assignedStaff, partySize: booking.partySize ?? 1, ignoreBookingId: id }, tx)
      if (!availability.slots.includes(timeSlot ?? booking.timeSlot)) throw new Error("Créneau indisponible : horaires, absence ou conflit avec un autre rendez-vous.")
      assignedStaff = availability.staffForSlot[timeSlot ?? booking.timeSlot]
    }
    return tx.booking.update({
    where: { id },
    data: {
      staffId: assignedStaff,
      ...((date && date !== booking.date) || (timeSlot && timeSlot !== booking.timeSlot) ? { reminderSentAt: null, smsSentAt: null } : {}),
      ...(status && { status }),
      ...(date && { date }),
      ...(timeSlot && { timeSlot }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(clientName && { clientName }),
      ...(clientPhone !== undefined && { clientPhone: clientPhone || null }),
    },
    })
  }, { isolationLevel: "Serializable" })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.message.startsWith("Créneau") ? error.message : "Le rendez-vous a changé. Actualisez et réessayez." }, { status: 409 })
  }

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

  const branding = {
    emailHeaderUrl: booking.business.emailHeaderUrl,
    emailHeaderHeight: booking.business.emailHeaderHeight,
    emailBgColor: booking.business.emailBgColor,
    emailButtonColor: booking.business.emailButtonColor,
    emailGreeting: booking.business.emailGreeting,
    emailFooterMessage: booking.business.emailFooterMessage,
    emailSenderName: booking.business.emailSenderName,
  }

  after(async () => {
  if (status === "CONFIRMED" && booking.status !== "CONFIRMED") {
    // Mail client
    await sendBookingConfirmedClient({
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
      branding,
    }).catch(console.error)
    // Mail proprio
    if (ownerEmail) {
      await sendBookingConfirmedOwner({ ownerEmail, ...ownerBase }).catch(console.error)
    }
  }

  if (status === "CANCELLED" && booking.status !== "CANCELLED") {
    // Mail client
    await sendBookingCancelledClient({
      clientEmail: booking.clientEmail,
      clientName: booking.clientName,
      businessName: booking.business.name,
      serviceName,
      date: dateLabel,
      timeSlot: effectiveTimeSlot,
      branding,
    }).catch(console.error)
    // Mail proprio
    if (ownerEmail) {
      await sendBookingCancelledOwner({ ownerEmail, ...ownerBase, cancelledBy: "owner" }).catch(console.error)
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
      await sendBookingModifiedOwner({ ownerEmail, ...ownerBase, changes }).catch(console.error)
    }
  }

  })
  return NextResponse.json({ booking: updated })
}
