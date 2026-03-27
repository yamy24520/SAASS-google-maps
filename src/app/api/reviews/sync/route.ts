import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { listReviews, starRatingToNumber } from "@/lib/google-business"
import { sendNegativeReviewAlert } from "@/lib/email"

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const business = await prisma.business.findFirst({
    where: { userId: session.user.id },
    include: { user: { select: { email: true, name: true } } },
  })

  if (!business?.gbpLocationId) {
    return NextResponse.json({ error: "Google non connecté" }, { status: 400 })
  }

  let synced = 0
  let pageToken: string | undefined

  do {
    const { reviews, nextPageToken } = await listReviews(business, pageToken)
    pageToken = nextPageToken

    for (const r of reviews) {
      const rating = starRatingToNumber(r.starRating)
      const isNegative = rating <= 2

      const review = await prisma.review.upsert({
        where: { googleReviewId: r.name },
        create: {
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
        update: {},
      })

      // Send negative alert if not already sent
      if (isNegative && !review.alertSentAt && business.alertEmailEnabled && business.user.email) {
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
          // Email failure is non-blocking
        }
      }

      synced++
    }
  } while (pageToken)

  // Update business stats
  const stats = await prisma.review.aggregate({
    where: { businessId: business.id },
    _count: true,
    _avg: { rating: true },
  })

  const published = await prisma.review.count({
    where: { businessId: business.id, status: "PUBLISHED" },
  })

  await prisma.business.update({
    where: { id: business.id },
    data: {
      lastSyncAt: new Date(),
      totalReviews: stats._count,
      averageRating: stats._avg.rating ?? 0,
      responseRate: stats._count > 0 ? (published / stats._count) * 100 : 0,
    },
  })

  return NextResponse.json({ synced })
}
