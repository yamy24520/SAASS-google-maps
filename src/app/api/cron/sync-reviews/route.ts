import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { fetchReviewsOutscraper } from "@/lib/outscraper"
import { sendNegativeReviewAlert } from "@/lib/email"

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  // Fetch all businesses with a placeId (via snapshot) or gbpLocationId
  const businesses = await prisma.business.findMany({
    where: {
      user: { subscription: { status: { in: ["ACTIVE", "TRIALING"] } } },
    },
    include: {
      user: { select: { email: true, name: true } },
      reputationSnapshots: {
        orderBy: { recordedAt: "desc" },
        take: 1,
        select: { placeId: true },
      },
    },
  })

  let totalSynced = 0
  const errors: string[] = []

  for (const business of businesses) {
    const placeId = business.gbpLocationId ?? business.reputationSnapshots[0]?.placeId ?? null
    if (!placeId) continue

    try {
      const reviews = await fetchReviewsOutscraper(placeId, 200)

      for (const r of reviews) {
        if (!r.review_id) continue
        const rating = Math.round(r.review_rating)
        const isNegative = rating <= 2

        const existing = await prisma.review.findUnique({ where: { googleReviewId: r.review_id } })
        if (existing) continue

        const review = await prisma.review.create({
          data: {
            businessId: business.id,
            googleReviewId: r.review_id,
            reviewerName: r.author_title,
            reviewerPhotoUrl: r.author_image ?? null,
            rating,
            comment: r.review_text ?? null,
            reviewPublishedAt: new Date(r.review_datetime_utc),
            isNegative,
            status: r.owner_answer ? "PUBLISHED" : "PENDING",
            publishedResponse: r.owner_answer ?? null,
            publishedAt: r.owner_answer_timestamp_datetime_utc
              ? new Date(r.owner_answer_timestamp_datetime_utc)
              : null,
          },
        })

        if (isNegative && business.alertEmailEnabled && business.user.email) {
          try {
            await sendNegativeReviewAlert({
              userEmail: business.user.email,
              userName: business.user.name ?? "Propriétaire",
              businessName: business.name,
              reviewerName: r.author_title,
              rating,
              comment: r.review_text ?? "",
              reviewId: review.id,
            })
            await prisma.review.update({ where: { id: review.id }, data: { alertSentAt: new Date() } })
          } catch {
            // Non-blocking
          }
        }

        totalSynced++
      }

      await prisma.business.update({ where: { id: business.id }, data: { lastSyncAt: new Date() } })
    } catch (err) {
      errors.push(`Business ${business.id}: ${err}`)
    }
  }

  return NextResponse.json({ synced: totalSynced, errors, businesses: businesses.length })
}
