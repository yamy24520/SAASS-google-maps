import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendBookingRequestClient, sendBookingRequestOwner } from "@/lib/email"

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
    include: { service: { select: { name: true, duration: true, price: true } } },
    orderBy: [{ date: "asc" }, { timeSlot: "asc" }],
  })

  return NextResponse.json({ bookings })
}

// POST — public: créer une réservation
export async function POST(req: NextRequest) {
  const { businessId, serviceId, clientName, clientEmail, clientPhone, date, timeSlot, notes } = await req.json()

  if (!businessId || !serviceId || !clientName || !clientEmail || !date || !timeSlot) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 })
  }

  // Vérifier service + business en une requête
  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId, active: true },
    include: {
      business: {
        select: {
          name: true,
          user: { select: { email: true } },
        },
      },
    },
  })
  if (!service) return NextResponse.json({ error: "Service introuvable" }, { status: 404 })

  // Vérifier conflit (double-check côté serveur)
  const conflict = await prisma.booking.findFirst({
    where: { businessId, date, timeSlot, status: { not: "CANCELLED" } },
  })
  if (conflict) return NextResponse.json({ error: "Ce créneau n'est plus disponible" }, { status: 409 })

  const booking = await prisma.booking.create({
    data: { businessId, serviceId, clientName, clientEmail, clientPhone: clientPhone || null, date, timeSlot, notes: notes || null },
  })

  // Formatter la date lisible
  const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  const emailParams = {
    clientEmail,
    clientName,
    businessName: service.business.name,
    serviceName: service.name,
    date: dateLabel,
    timeSlot,
    duration: service.duration,
    price: service.price,
  }

  // Emails en parallèle, sans bloquer la réponse
  Promise.all([
    sendBookingRequestClient(emailParams).catch(console.error),
    service.business.user?.email
      ? sendBookingRequestOwner({
          ownerEmail: service.business.user.email,
          businessName: service.business.name,
          clientName,
          clientEmail,
          clientPhone: clientPhone || null,
          serviceName: service.name,
          date: dateLabel,
          timeSlot,
          duration: service.duration,
          price: service.price,
          dashboardUrl: `${APP_URL}/bookings`,
        }).catch(console.error)
      : Promise.resolve(),
  ])

  return NextResponse.json({ booking })
}
