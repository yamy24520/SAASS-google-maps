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
      staff: { select: { id: true, name: true, color: true } },
    },
    orderBy: [{ date: "asc" }, { timeSlot: "asc" }],
  })

  return NextResponse.json({ bookings })
}

// POST — public ou dashboard (manuelle): créer une réservation
export async function POST(req: NextRequest) {
  const { businessId, serviceId, staffId, clientName, clientEmail, clientPhone, date, timeSlot, notes, partySize, manualStatus, recurrence, recurrenceEnd } = await req.json()

  if (!clientName || !date || !timeSlot) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 })
  }

  // businessId "auto" = création manuelle depuis le dashboard (session requise)
  let resolvedBusinessId = businessId
  if (businessId === "auto" || !businessId) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    const bizId = new URL(req.url).searchParams.get("biz")
    const biz = bizId
      ? await prisma.business.findFirst({ where: { id: bizId, userId: session.user.id } })
      : await prisma.business.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" } })
    if (!biz) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 })
    resolvedBusinessId = biz.id
  }

  const business = await prisma.business.findUnique({
    where: { id: resolvedBusinessId },
    select: { id: true, name: true, bookingType: true, bookingMaxCovers: true, user: { select: { email: true } } },
  })
  if (!business) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 })
  const businessId2 = business.id

  const isRestaurant = business.bookingType === "restaurant"

  let service = null
  if (!isRestaurant && serviceId) {
    service = await prisma.service.findFirst({
      where: { id: serviceId, businessId: businessId2, active: true },
      select: { name: true, duration: true, price: true },
    })
  }

  // Vérifier conflit côté serveur (seulement si pas manualStatus, i.e. réservation publique)
  if (!manualStatus) {
    if (isRestaurant) {
      if (business.bookingMaxCovers) {
        const existingCovers = await prisma.booking.aggregate({
          where: { businessId: businessId2, date, timeSlot, status: { not: "CANCELLED" } },
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
        where: { businessId: businessId2, date, timeSlot, status: { not: "CANCELLED" }, ...(staffId ? { staffId } : {}) },
      })
      if (conflict) return NextResponse.json({ error: "Ce créneau n'est plus disponible" }, { status: 409 })
    }
  }

  // Récurrence : générer toutes les dates
  const dates: string[] = [date]
  if (recurrence && recurrenceEnd) {
    const endDate = new Date(recurrenceEnd + "T00:00:00")
    let cur = new Date(date + "T00:00:00")
    const step = recurrence === "weekly" ? 7 : recurrence === "biweekly" ? 14 : 30
    while (true) {
      cur = new Date(cur)
      if (recurrence === "monthly") {
        cur.setMonth(cur.getMonth() + 1)
      } else {
        cur.setDate(cur.getDate() + step)
      }
      if (cur > endDate) break
      dates.push(cur.toISOString().split("T")[0])
    }
  }

  const recurrenceGroupId = dates.length > 1 ? randomUUID() : null
  const cancelToken = randomUUID()

  // Créer tous les RDV (récurrence ou single)
  const bookingsData = dates.map((d, i) => ({
    businessId: businessId2,
    serviceId: serviceId || null,
    staffId: staffId || null,
    clientName,
    clientEmail,
    clientPhone: clientPhone || null,
    date: d,
    timeSlot,
    notes: notes || null,
    partySize: partySize || null,
    cancelToken: i === 0 ? cancelToken : randomUUID(),
    recurrenceGroupId,
    status: (manualStatus ?? "PENDING") as "PENDING" | "CONFIRMED" | "CANCELLED",
  }))

  await prisma.booking.createMany({ data: bookingsData })
  const booking = await prisma.booking.findFirst({ where: { cancelToken } })

  // Archiver le lead email (upsert par email+business pour éviter les doublons)
  prisma.leadEmail.upsert({
    where: { businessId_email: { businessId: businessId2, email: clientEmail } } as never,
    update: { name: clientName, phone: clientPhone || null },
    create: { businessId: businessId2, email: clientEmail, name: clientName, phone: clientPhone || null, source: "booking" },
  }).catch(() => null)

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
