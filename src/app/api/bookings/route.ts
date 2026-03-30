import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendBookingRequestClient, sendBookingRequestOwner } from "@/lib/email"
import { sendPushNotification } from "@/lib/push"
import { randomUUID } from "crypto"
import { rateLimit } from "@/lib/rate-limit"

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
  const rl = rateLimit(`bookings:${ip}`, 10, 60_000)
  if (!rl.ok) return NextResponse.json({ error: "Trop de requêtes, réessayez dans " + rl.retryAfter + "s" }, { status: 429 })

  const { businessId, serviceId, staffId, clientName, clientEmail, clientPhone, date, timeSlot, notes, partySize, manualStatus, recurrence, recurrenceEnd, smsOptIn } = await req.json()

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
      id: true, name: true, bookingType: true, bookingMaxCovers: true,
      user: { select: { id: true, email: true } },
      emailHeaderUrl: true, emailBgColor: true, emailButtonColor: true,
      emailGreeting: true, emailFooterMessage: true, emailSenderName: true,
    },
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

  // Récurrence : générer toutes les dates
  const dates: string[] = [date]
  if (recurrence && recurrenceEnd) {
    const endDate = new Date(recurrenceEnd + "T00:00:00")
    let cur = new Date(date + "T00:00:00")
    while (true) {
      cur = new Date(cur)
      if (recurrence === "monthly") {
        cur.setMonth(cur.getMonth() + 1)
      } else {
        cur.setDate(cur.getDate() + (recurrence === "weekly" ? 7 : 14))
      }
      if (cur > endDate) break
      dates.push(cur.toISOString().split("T")[0])
    }
  }

  const recurrenceGroupId = dates.length > 1 ? randomUUID() : null
  const cancelToken = randomUUID()

  // Toute la logique de vérification + création dans une transaction sérialisée
  // pour éviter les race conditions (double booking au même créneau)
  let booking
  try { booking = await prisma.$transaction(async (tx) => {
    // Vérifier conflit côté serveur (seulement si pas manualStatus, i.e. réservation publique)
    if (!manualStatus) {
      if (isRestaurant) {
        if (business.bookingMaxCovers) {
          const existingCovers = await tx.booking.aggregate({
            where: { businessId: businessId2, date, timeSlot, status: { not: "CANCELLED" } },
            _sum: { partySize: true },
          })
          const taken = existingCovers._sum.partySize ?? 0
          const needed = partySize ?? 1
          if (taken + needed > business.bookingMaxCovers) {
            throw Object.assign(new Error("Plus de places disponibles pour ce créneau"), { status: 409 })
          }
        }
      } else {
        const conflict = await tx.booking.findFirst({
          where: { businessId: businessId2, date, timeSlot, status: { not: "CANCELLED" }, ...(staffId ? { staffId } : {}) },
        })
        if (conflict) throw Object.assign(new Error("Ce créneau n'est plus disponible"), { status: 409 })
      }
    }

    // Auto-assign staff
    let resolvedStaffId: string | null = staffId || null
    if (!resolvedStaffId && !isRestaurant) {
      const activeStaffs = await tx.staff.findMany({
        where: { businessId: businessId2, active: true },
        select: { id: true },
      })
      if (activeStaffs.length > 0) {
        const absences = await tx.staffAbsence.findMany({
          where: { staffId: { in: activeStaffs.map(s => s.id) }, startDate: { lte: date }, endDate: { gte: date } },
          select: { staffId: true },
        })
        const absentIds = new Set(absences.map(a => a.staffId))
        const slotConflicts = await tx.booking.findMany({
          where: { businessId: businessId2, date, timeSlot, status: { not: "CANCELLED" }, staffId: { in: activeStaffs.map(s => s.id) } },
          select: { staffId: true },
        })
        const bookedIds = new Set(slotConflicts.map(b => b.staffId).filter(Boolean) as string[])
        const available = activeStaffs.filter(s => !absentIds.has(s.id) && !bookedIds.has(s.id))
        if (available.length > 0) {
          const counts = await tx.booking.groupBy({
            by: ["staffId"],
            where: { businessId: businessId2, date, status: { not: "CANCELLED" }, staffId: { in: available.map(s => s.id) } },
            _count: { id: true },
          })
          const countMap = new Map(counts.map(c => [c.staffId, c._count.id]))
          const sorted = [...available].sort((a, b) => (countMap.get(a.id) ?? 0) - (countMap.get(b.id) ?? 0))
          resolvedStaffId = sorted[0].id
        }
      }
    }

    // Créer tous les RDV
    const bookingsData = dates.map((d, i) => ({
      businessId: businessId2,
      serviceId: serviceId || null,
      staffId: resolvedStaffId,
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

    await tx.booking.createMany({ data: bookingsData })
    return tx.booking.findFirst({ where: { cancelToken } })
  }, { isolationLevel: "Serializable" })
  } catch (err: unknown) {
    const e = err as Error & { status?: number }
    const status = e.status ?? 500
    return NextResponse.json({ error: e.message ?? "Erreur lors de la création" }, { status })
  }

  if (!booking) return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 })

  // Archiver le lead email — fire-and-forget intentionnel (non-critique)
  void prisma.leadEmail.upsert({
    where: { businessId_email: { businessId: businessId2, email: clientEmail } } as never,
    update: { name: clientName, phone: clientPhone || null },
    create: { businessId: businessId2, email: clientEmail, name: clientName, phone: clientPhone || null, source: "booking" },
  }).catch(() => null)

  // Upsert ClientProfile pour conserver smsOptIn (fire-and-forget)
  if (typeof smsOptIn === "boolean") {
    void prisma.clientProfile.upsert({
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
      emailBgColor: business.emailBgColor,
      emailButtonColor: business.emailButtonColor,
      emailGreeting: business.emailGreeting,
      emailFooterMessage: business.emailFooterMessage,
      emailSenderName: business.emailSenderName,
    },
  }

  // Notifications push au propriétaire
  if (business.user?.id) {
    prisma.pushSubscription.findMany({ where: { userId: business.user.id } }).then(subs => {
      const serviceName = isRestaurant ? `Table pour ${partySize ?? 1}` : (service?.name ?? "RDV")
      subs.forEach(sub => {
        sendPushNotification(sub, {
          title: `📅 Nouveau RDV — ${clientName}`,
          body: `${serviceName} · ${new Date(date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} à ${timeSlot}`,
          url: "/bookings",
        }).then(result => {
          if (result === "expired") {
            prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => null)
          }
        })
      })
    }).catch(() => null)
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
          price: isRestaurant ? 0 : (service?.price ?? 0),
          dashboardUrl: `${APP_URL}/bookings`,
          isRestaurant,
          partySize: partySize ?? null,
        }).catch(console.error)
      : Promise.resolve(),
  ])

  return NextResponse.json({ booking })
}
