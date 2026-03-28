import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendMonthlyReport } from "@/lib/email"

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const now = new Date()
  const month = now.toLocaleString("fr-FR", { month: "long", year: "numeric" })
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const businesses = await prisma.business.findMany({
    include: {
      user: { select: { email: true, name: true } },
      competitors: { orderBy: { rating: "desc" } },
      reviews: {
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { id: true, status: true, rating: true },
      },
      _count: { select: { reviews: true } },
    },
    where: {
      user: {
        subscription: { status: { in: ["ACTIVE", "TRIALING"] } },
      },
    },
  })

  let sent = 0

  for (const business of businesses) {
    try {
      const newReviews = business.reviews.length
      const publishedReplies = business.reviews.filter((r) => r.status === "PUBLISHED").length
      const responseRate = newReviews > 0 ? (publishedReplies / newReviews) * 100 : 0

      // Competitor ranking
      const allRatings = [
        business.averageRating,
        ...business.competitors.map((c) => c.rating),
      ].sort((a, b) => b - a)
      const rank = allRatings.indexOf(business.averageRating) + 1

      // SEO score (simplified)
      const seoChecks = [
        !!business.gbpLocationId,
        responseRate >= 80,
        business.averageRating >= 4.0,
        business.totalReviews >= 50,
        business.autoReplyEnabled,
        business.alertEmailEnabled,
      ]
      const seoScore = Math.round((seoChecks.filter(Boolean).length / seoChecks.length) * 100)

      await sendMonthlyReport({
        userEmail: business.user.email!,
        userName: business.user.name ?? "cher client",
        businessName: business.name,
        month,
        rating: business.averageRating,
        totalReviews: business._count.reviews,
        newReviews,
        responseRate,
        publishedReplies,
        seoScore,
        competitorRank: rank,
        totalCompetitors: business.competitors.length + 1,
      })

      sent++
    } catch (err) {
      console.error(`[monthly-report] Failed for business ${business.id}:`, err)
    }
  }

  return NextResponse.json({ sent })
}
