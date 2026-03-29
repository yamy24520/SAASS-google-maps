import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30)
  const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 7)

  const [
    totalUsers,
    totalBusinesses,
    activeSubscriptions,
    totalBookings,
    totalLeads,
    businesses,
    recentUsers,
    recentBookings,
    subscriptions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.business.count(),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.booking.count(),
    prisma.leadEmail.count(),
    prisma.business.findMany({
      include: {
        user: {
          select: {
            id: true, email: true, name: true, createdAt: true,
            subscription: { select: { status: true, stripeCurrentPeriodEnd: true } },
          },
        },
        _count: { select: { bookings: true, leadEmails: true, reviews: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    // Inscriptions des 30 derniers jours (pour graphique)
    prisma.user.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    // Activité récente: dernières réservations
    prisma.booking.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: {
        id: true, clientName: true, clientEmail: true, date: true, timeSlot: true,
        status: true, createdAt: true,
        business: { select: { name: true } },
        service: { select: { name: true, price: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    // Abonnements Stripe
    prisma.subscription.findMany({
      include: {
        user: { select: { email: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ])

  // Calculer CA confirmé par business
  const confirmedBookings = await prisma.booking.findMany({
    where: { status: "CONFIRMED", service: { isNot: null } },
    select: { businessId: true, service: { select: { price: true } } },
  })
  const caByBiz = confirmedBookings.reduce<Record<string, number>>((acc, b) => {
    acc[b.businessId] = (acc[b.businessId] ?? 0) + (b.service?.price ?? 0)
    return acc
  }, {})

  // Grouper inscriptions par jour (30j)
  const signupsByDay: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i)
    signupsByDay[d.toISOString().split("T")[0]] = 0
  }
  for (const u of recentUsers) {
    const day = u.createdAt.toISOString().split("T")[0]
    if (day in signupsByDay) signupsByDay[day]++
  }

  const bizStats = businesses.map((b) => ({
    id: b.id,
    name: b.name,
    category: b.category,
    slug: b.pageSlug,
    bookingEnabled: b.bookingEnabled,
    averageRating: b.averageRating,
    owner: { id: b.user.id, email: b.user.email ?? "", name: b.user.name, createdAt: b.user.createdAt },
    subscription: b.user.subscription,
    totalBookings: b._count.bookings,
    totalLeads: b._count.leadEmails,
    totalReviews: b._count.reviews,
    caTotal: caByBiz[b.id] ?? 0,
    createdAt: b.createdAt,
  }))

  return NextResponse.json({
    totalUsers,
    totalBusinesses,
    activeSubscriptions,
    totalBookings,
    totalLeads,
    businesses: bizStats,
    signupsByDay,
    recentBookings,
    subscriptions,
  })
}
