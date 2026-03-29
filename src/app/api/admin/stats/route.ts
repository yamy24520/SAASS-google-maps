import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [
    totalUsers,
    totalBusinesses,
    activeSubscriptions,
    totalBookings,
    totalLeads,
    businesses,
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
            email: true, name: true, createdAt: true,
            subscription: { select: { status: true, stripeCurrentPeriodEnd: true } },
          },
        },
        _count: { select: { bookings: true, leadEmails: true, reviews: true } },
      },
      orderBy: { createdAt: "desc" },
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

  const bizStats = businesses.map((b) => ({
    id: b.id,
    name: b.name,
    category: b.category,
    slug: b.pageSlug,
    bookingEnabled: b.bookingEnabled,
    owner: { email: b.user.email ?? "", name: b.user.name, createdAt: b.user.createdAt },
    subscription: b.user.subscription,
    totalBookings: b._count.bookings,
    totalLeads: b._count.leadEmails,
    totalReviews: b._count.reviews,
    averageRating: b.averageRating,
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
  })
}
