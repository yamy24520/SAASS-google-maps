import { after, NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendBookingRequestClient, sendBookingRequestOwner } from "@/lib/email"
import { sendPushNotification } from "@/lib/push"
import { randomUUID } from "crypto"
import { rateLimit } from "@/lib/rate-limit"

import { bookingSchema, recurringDates } from "@/lib/booking-rules"
import { getAvailability } from "@/lib/booking-availability"

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
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown"
  const rl = await rateLimit(`bookings:${ip}`, 10, 60_000)
  if (!rl.ok) return NextResponse.json({ error: "Trop de requêtes, réessayez dans " + rl.retryAfter + "s" }, { status: 429 })

  const parsed = bookingSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Réservation invalide. Vérifiez les champs, la date et l’adresse email." }, { status: 400 })
  const { businessId, serviceId, staffId, clientName, clientEmail, clientPhone, date, timeSlot, notes, partySize, manualStatus, recurrence, recurrenceEnd, smsOptIn } = parsed.data

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
    select: {
      id: true, name: true, bookingType: true, bookingMaxCovers: true, bookingEnabled: true,
      user: { select: { id: true, email: true } },
      emailHeaderUrl: true, emailHeaderHeight: true, emailBgColor: true, emailButtonColor: true,
      emailGreeting: true, emailFooterMessage: true, emailSenderName: true,
    },
  })
  if (!business) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 })
  const ownerSession = await getServerSession(authOptions)
  const isOwner = ownerSession?.user?.id === business.user.id
  if ((manualStatus || (recurrence && recurrence !== "none")) && !isOwner) return NextResponse.json({ error: "Création manuelle réservée au propriétaire." }, { status: 403 })
  if (!isOwner && !business.bookingEnabled) return NextResponse.json({ error: "Les réservations sont désactivées." }, { status: 403 })
  const businessId2 = business.id

  const isRestaurant = business.bookingType === "restaurant"

  let service = null
  if (!isRestaurant && serviceId) {
    service = await prisma.service.findFirst({
      where: { id: serviceId, businessId: businessId2, active: true },
      select: { name: true, duration: true, price: true },
    })
  }

  if (!isRestaurant && !service) return NextResponse.json({ error: "Prestation introuvable." }, { status: 400 })
  let dates: string[]
  try { dates = recurringDates(date, recurrence, recurrenceEnd) }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Récurrence invalide" }, { status: 400 }) }

  const recurrenceGroupId = dates.length > 1 ? randomUUID() : null
  const cancelToken = randomUUID()

  // Toute la logique de vérification + création dans une transaction sérialisée
  // pour éviter les race conditions (double booking au même créneau)
  let booking
  try { booking = await prisma.$transaction(async (tx) => {
    for (let index = 0; index < dates.length; index++) {
      const d = dates[index]
      const availability = await getAvailability({ businessId: businessId2, date: d, serviceId, staffId, partySize: partySize ?? 1 }, tx)
      if (!availability.slots.includes(timeSlot)) throw Object.assign(new Error(`Créneau indisponible le ${d} à ${timeSlot}.`), { status: 409 })
      await tx.booking.create({ data: {
        businessId: businessId2, serviceId: isRestaurant ? null : serviceId,
        staffId: availability.staffForSlot[timeSlot], clientName, clientEmail,
        clientPhone: clientPhone || null, date: d, timeSlot, notes: notes || null,
        partySize: isRestaurant ? partySize ?? 1 : null,
        cancelToken: index === 0 ? cancelToken : randomUUID(), recurrenceGroupId,
        status: manualStatus ?? "PENDING",
      } })
    }
    return tx.booking.findFirst({ where: { cancelToken } })
  }, { isolationLevel: "Serializable", timeout: 30000 })
  } catch (err: unknown) {
    const e = err as Error & { status?: number; code?: string }
    const status = e.code === "P2034" ? 409 : e.status ?? 500
    return NextResponse.json({ error: status === 500 ? "Erreur lors de la création" : e.code === "P2034" ? "Ce créneau vient de changer. Réessayez." : e.message }, { status })
  }

  if (!booking) return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 })

  // Archiver le lead email — fire-and-forget intentionnel (non-critique)
  await prisma.leadEmail.upsert({
    where: { businessId_email: { businessId: businessId2, email: clientEmail } } as never,
    update: { name: clientName, phone: clientPhone || null },
    create: { businessId: businessId2, email: clientEmail, name: clientName, phone: clientPhone || null, source: "booking" },
  }).catch(() => null)

  // Upsert ClientProfile pour conserver smsOptIn (fire-and-forget)
  if (typeof smsOptIn === "boolean") {
    await prisma.clientProfile.upsert({
      where: { businessId_email: { businessId: businessId2, email: clientEmail } },
      update: { smsOptIn },
      create: { businessId: businessId2, email: clientEmail, smsOptIn },
    }).catch(() => null)
  }

  const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  const cancelUrl = `${APP_URL}/cancel/${cancelToken}`

  // Generate portal session (fire-and-forget)
  let portalUrl: string | undefined
  try {
    const portalToken = randomUUID()
    await prisma.clientSession.create({
      data: {
        businessId: businessId2,
        clientEmail,
        token: portalToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    })
    portalUrl = `${APP_URL}/my/${portalToken}`
  } catch { /* non-critical */ }

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
    portalUrl,
    isRestaurant,
    partySize: partySize ?? null,
    branding: {
      emailHeaderUrl: business.emailHeaderUrl,
      emailHeaderHeight: business.emailHeaderHeight,
      emailBgColor: business.emailBgColor,
      emailButtonColor: business.emailButtonColor,
      emailGreeting: business.emailGreeting,
      emailFooterMessage: business.emailFooterMessage,
      emailSenderName: business.emailSenderName,
    },
  }

  // Notifications push au propriétaire
  after(async () => {
  if (business.user?.id) {
    await prisma.pushSubscription.findMany({ where: { userId: business.user.id } }).then(subs => {
      const serviceName = isRestaurant ? `Table pour ${partySize ?? 1}` : (service?.name ?? "RDV")
      return Promise.all(subs.map(async sub => {
        await sendPushNotification(sub, {
          title: `📅 Nouveau RDV — ${clientName}`,
          body: `${serviceName} · ${new Date(date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} à ${timeSlot}`,
          url: "/bookings",
        }).then(result => {
          if (result === "expired") {
            prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => null)
          }
        })
      }))
    }).catch(() => null)
  }

  await Promise.all([
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
          price: isRestaurant ? 0 : (service?.price ?? 0),
          dashboardUrl: `${APP_URL}/bookings`,
          isRestaurant,
          partySize: partySize ?? null,
        }).catch(console.error)
      : Promise.resolve(),
  ])

  })
  return NextResponse.json({ booking })
}
