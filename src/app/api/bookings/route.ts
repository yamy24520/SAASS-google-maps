import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendBookingRequestClient, sendBookingRequestOwner } from "@/lib/email"
import { randomUUID } from "crypto"

const APP_URL = process.env.NEXTAUTH_URL ?? "https://reputix.net"

// GET — dashboard: liste des RDV (authentifié)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const url = new URL(req.url)
  const bizId = url.searchParams.get("biz")

  const business = bizId
    ? await prisma.business.findFirst({ where: { id: bizId, userId: session.user.id } })
    : await prisma.business.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" } })

  if (!business) return NextResponse.json({ bookings: [] })

  const bookings = await prisma.booking.findMany({
    where: { businessId: business.id },
    include: {
      service: { select: { name: true, duration: true, price: true } },
      staff: { select: { name: true, color: true } },
    },
    orderBy: [{ date: "asc" }, { timeSlot: "asc" }],
  })

  return NextResponse.json({ bookings })
}

// POST — public: créer une réservation
export async function POST(req: NextRequest) {
  const { businessId, serviceId, staffId, clientName, clientEmail, clientPhone, date, timeSlot, notes, partySize } = await req.json()

  if (!businessId || !clientName || !clientEmail || !date || !timeSlot) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 })
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { name: true, bookingType: true, bookingMaxCovers: true, user: { select: { email: true } } },
  })
  if (!business) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 })

  const isRestaurant = business.bookingType === "restaurant"

  let service = null
  if (!isRestaurant) {
    if (!serviceId) return NextResponse.json({ error: "Service manquant" }, { status: 400 })
    service = await prisma.service.findFirst({
      where: { id: serviceId, businessId, active: true },
      select: { name: true, duration: true, price: true },
    })
    if (!service) return NextResponse.json({ error: "Service introuvable" }, { status: 404 })
  }

  // Vérifier conflit côté serveur
  if (isRestaurant) {
    // Restaurant: vérifier capacité
    if (business.bookingMaxCovers) {
      const existingCovers = await prisma.booking.aggregate({
        where: { businessId, date, timeSlot, status: { not: "CANCELLED" } },
        _sum: { partySize: true },
      })
      const taken = existingCovers._sum.partySize ?? 0
      const needed = partySize ?? 1
      if (taken + needed > business.bookingMaxCovers) {
        return NextResponse.json({ error: "Plus de places disponibles pour ce créneau" }, { status: 409 })
      }
    }
  } else {
    const conflict = await prisma.booking.findFirst({
      where: {
        businessId, date, timeSlot,
        status: { not: "CANCELLED" },
        ...(staffId ? { staffId } : {}),
      },
    })
    if (conflict) return NextResponse.json({ error: "Ce créneau n'est plus disponible" }, { status: 409 })
  }

  const cancelToken = randomUUID()

  const booking = await prisma.booking.create({
    data: {
      businessId,
      serviceId: serviceId || null,
      staffId: staffId || null,
      clientName,
      clientEmail,
      clientPhone: clientPhone || null,
      date,
      timeSlot,
      notes: notes || null,
      partySize: partySize || null,
      cancelToken,
    },
  })

  const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  const cancelUrl = `${APP_URL}/cancel/${cancelToken}`

  const emailParams = {
    clientEmail,
    clientName,
    businessName: business.name,
    serviceName: isRestaurant ? `Table pour ${partySize ?? 1} personne(s)` : service!.name,
    date: dateLabel,
    timeSlot,
    duration: service?.duration ?? 0,
    price: service?.price ?? 0,
    cancelUrl,
    isRestaurant,
    partySize: partySize ?? null,
  }

  Promise.all([
    sendBookingRequestClient(emailParams).catch(console.error),
    business.user?.email
      ? sendBookingRequestOwner({
          ownerEmail: business.user.email,
          businessName: business.name,
          clientName,
          clientEmail,
          clientPhone: clientPhone || null,
          serviceName: emailParams.serviceName,
          date: dateLabel,
          timeSlot,
          duration: service?.duration ?? 0,
          price: service?.price ?? 0,
          dashboardUrl: `${APP_URL}/bookings`,
        }).catch(console.error)
      : Promise.resolve(),
  ])

  return NextResponse.json({ booking })
}
