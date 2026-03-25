import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { listReviews, starRatingToNumber } from "@/lib/google-business"
import { sendNegativeReviewAlert } from "@/lib/email"

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const businesses = await prisma.business.findMany({
    where: {
      gbpLocationId: { not: null },
      gbpAccessToken: { not: null },
      user: { subscription: { status: { in: ["ACTIVE", "TRIALING"] } } },
    },
    include: { user: { select: { email: true, name: true } } },
  })

  let totalSynced = 0
  const errors: string[] = []

  for (const business of businesses) {
    try {
      let pageToken: string | undefined

      do {
        const { reviews, nextPageToken } = await listReviews(business, pageToken)
        pageToken = nextPageToken

        for (const r of reviews) {
          const rating = starRatingToNumber(r.starRating)
          const isNegative = rating <= 2

          const existing = await prisma.review.findUnique({ where: { googleReviewId: r.name } })
          if (existing) continue // Already synced

          const review = await prisma.review.create({
            data: {
              businessId: business.id,
              googleReviewId: r.name,
              reviewerName: r.reviewer.displayName,
              reviewerPhotoUrl: r.reviewer.profilePhotoUrl,
              rating,
              comment: r.comment,
              reviewPublishedAt: new Date(r.createTime),
              isNegative,
              status: r.reviewReply ? "PUBLISHED" : "PENDING",
              publishedResponse: r.reviewReply?.comment,
              publishedAt: r.reviewReply ? new Date(r.reviewReply.updateTime) : undefined,
            },
          })

          // Alert for new negative reviews
          if (isNegative && business.alertEmailEnabled && business.user.email) {
            try {
              await sendNegativeReviewAlert({
                userEmail: business.user.email,
                userName: business.user.name ?? "Propriétaire",
                businessName: business.name,
                reviewerName: r.reviewer.displayName,
                rating,
                comment: r.comment ?? "",
                reviewId: review.id,
              })
              await prisma.review.update({ where: { id: review.id }, data: { alertSentAt: new Date() } })
            } catch {
              // Non-blocking
            }
          }

          totalSynced++
        }
      } while (pageToken)

      await prisma.business.update({ where: { id: business.id }, data: { lastSyncAt: new Date() } })
    } catch (err) {
      errors.push(`Business ${business.id}: ${err}`)
    }
  }

  return NextResponse.json({ synced: totalSynced, errors, businesses: businesses.length })
}
