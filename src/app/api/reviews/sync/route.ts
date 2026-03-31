import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  fetchReviewsOutscraper,
  fetchTripAdvisorReviews,
  fetchBookingReviews,
  fetchTrustpilotReviews,
  OutscraperReview,
} from "@/lib/outscraper"
import { sendNegativeReviewAlert } from "@/lib/email"
import { ReviewSource } from "@prisma/client"

async function upsertReviews(
  reviews: OutscraperReview[],
  source: ReviewSource,
  businessId: string,
  business: { id: string; alertEmailEnabled: boolean; user: { email: string | null; name: string | null }; name: string }
) {
  let synced = 0
  for (const r of reviews) {
    if (!r.review_id) continue
    const rating = Math.round(r.review_rating)
    const isNegative = rating <= 2
    const externalId = `${source}:${r.review_id}`

    const review = await prisma.review.upsert({
      where: { externalReviewId: externalId },
      create: {
        businessId,
        externalReviewId: externalId,
        source,
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
      update: {},
    })

    if (isNegative && !review.alertSentAt && business.alertEmailEnabled && business.user.email) {
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

    synced++
  }
  return synced
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const bizId = new URL(req.url).searchParams.get("biz")
  const isAdmin = session.user.role === "ADMIN"
  const business = await prisma.business.findFirst({
    where: bizId
      ? (isAdmin ? { id: bizId } : { id: bizId, userId: session.user.id })
      : { userId: session.user.id },
    include: { user: { select: { email: true, name: true } } },
  })
  if (!business) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 })

  // Resolve Google placeId
  const snapshot = await prisma.reputationSnapshot.findFirst({
    where: { businessId: business.id },
    orderBy: { recordedAt: "desc" },
    select: { placeId: true },
  })
  const placeId = business.gbpLocationId ?? snapshot?.placeId ?? null

  let synced = 0
  const errors: string[] = []

  // Google
  if (placeId) {
    try {
      const reviews = await fetchReviewsOutscraper(placeId, 100)
      synced += await upsertReviews(reviews, "GOOGLE", business.id, business)
    } catch (e) {
      console.error("[sync] Google error:", e)
      errors.push("Google")
    }
  }

  // TripAdvisor
  if (business.tripAdvisorUrl) {
    try {
      const reviews = await fetchTripAdvisorReviews(business.tripAdvisorUrl, 100)
      synced += await upsertReviews(reviews, "TRIPADVISOR", business.id, business)
    } catch (e) {
      console.error("[sync] TripAdvisor error:", e)
      errors.push("TripAdvisor")
    }
  }

  // Booking
  if (business.bookingUrl) {
    try {
      const reviews = await fetchBookingReviews(business.bookingUrl, 100)
      synced += await upsertReviews(reviews, "BOOKING", business.id, business)
    } catch (e) {
      console.error("[sync] Booking error:", e)
      errors.push("Booking")
    }
  }

  // Trustpilot
  if (business.trustpilotUrl) {
    try {
      const reviews = await fetchTrustpilotReviews(business.trustpilotUrl, 100)
      synced += await upsertReviews(reviews, "TRUSTPILOT", business.id, business)
    } catch (e) {
      console.error("[sync] Trustpilot error:", e)
      errors.push("Trustpilot")
    }
  }

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

  return NextResponse.json({ synced, errors: errors.length ? errors : undefined })
}
