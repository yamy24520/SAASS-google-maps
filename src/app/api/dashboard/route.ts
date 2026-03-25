import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const business = await prisma.business.findUnique({ where: { userId: session.user.id } })
  if (!business) return NextResponse.json({ stats: null, recentReviews: [] })

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  const [
    totalReviews,
    reviewsThisMonth,
    reviewsLastMonth,
    avgRating,
    avgRatingLastMonth,
    pendingCount,
    publishedCount,
    recentReviews,
    ratingByWeek,
  ] = await Promise.all([
    prisma.review.count({ where: { businessId: business.id } }),
    prisma.review.count({ where: { businessId: business.id, reviewPublishedAt: { gte: thirtyDaysAgo } } }),
    prisma.review.count({ where: { businessId: business.id, reviewPublishedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    prisma.review.aggregate({ where: { businessId: business.id }, _avg: { rating: true } }),
    prisma.review.aggregate({ where: { businessId: business.id, reviewPublishedAt: { lt: thirtyDaysAgo } }, _avg: { rating: true } }),
    prisma.review.count({ where: { businessId: business.id, status: "PENDING" } }),
    prisma.review.count({ where: { businessId: business.id, status: "PUBLISHED" } }),
    prisma.review.findMany({
      where: { businessId: business.id },
      orderBy: { reviewPublishedAt: "desc" },
      take: 5,
    }),
    // Rating evolution - last 8 weeks grouped
    prisma.$queryRaw<{ week: Date; avg: number; count: bigint }[]>`
      SELECT
        date_trunc('week', "reviewPublishedAt") as week,
        AVG(rating)::float as avg,
        COUNT(*) as count
      FROM "Review"
      WHERE "businessId" = ${business.id}
        AND "reviewPublishedAt" >= ${new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000)}
      GROUP BY week
      ORDER BY week ASC
    `,
  ])

  const responseRate = totalReviews > 0 ? Math.round((publishedCount / totalReviews) * 100) : 0

  return NextResponse.json({
    stats: {
      totalReviews,
      reviewsThisMonth,
      reviewsLastMonthDelta: reviewsThisMonth - reviewsLastMonth,
      averageRating: avgRating._avg.rating ?? 0,
      avgRatingDelta: (avgRating._avg.rating ?? 0) - (avgRatingLastMonth._avg.rating ?? 0),
      responseRate,
      pendingCount,
    },
    recentReviews,
    ratingByWeek: (ratingByWeek as { week: Date; avg: number; count: bigint }[]).map((r) => ({
      week: r.week,
      avg: Math.round(r.avg * 10) / 10,
      count: Number(r.count),
    })),
  })
}
