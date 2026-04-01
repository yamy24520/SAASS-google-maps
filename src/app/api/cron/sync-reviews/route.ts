import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  fetchReviewsOutscraper,
  fetchTripAdvisorReviews,
  fetchBookingReviews,
  fetchTrustpilotReviews,
  fetchAirbnbReviews,
  OutscraperReview,
} from "@/lib/outscraper"
import { sendNegativeReviewAlert } from "@/lib/email"
import { ReviewSource } from "@prisma/client"

async function upsertReviews(
  reviews: OutscraperReview[],
  source: ReviewSource,
  business: {
    id: string
    name: string
    alertEmailEnabled: boolean
    user: { email: string | null; name: string | null }
  }
) {
  let synced = 0
  for (const r of reviews) {
    if (!r.review_id) continue
    const rating = Math.round(r.review_rating)
    const isNegative = rating <= 2
    const externalId = `${source}:${r.review_id}`

    const existing = await prisma.review.findUnique({ where: { externalReviewId: externalId } })
    if (existing) continue

    const review = await prisma.review.create({
      data: {
        businessId: business.id,
        externalReviewId: externalId,
        source,
        reviewerName: r.author_title,
        reviewerPhotoUrl: r.author_image ?? null,
        rating,
        comment: r.review_text ?? null,
        reviewPublishedAt: r.review_datetime_utc ? new Date(r.review_datetime_utc) : new Date(),
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

    synced++
  }
  return synced
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

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

    // Google
    if (placeId) {
      try {
        const reviews = await fetchReviewsOutscraper(placeId, 200)
        totalSynced += await upsertReviews(reviews, "GOOGLE", business)
      } catch (err) {
        errors.push(`[Google] ${business.id}: ${err}`)
      }
    }

    // TripAdvisor
    if (business.tripAdvisorUrl) {
      try {
        const reviews = await fetchTripAdvisorReviews(business.tripAdvisorUrl, 100)
        totalSynced += await upsertReviews(reviews, "TRIPADVISOR", business)
      } catch (err) {
        errors.push(`[TripAdvisor] ${business.id}: ${err}`)
      }
    }

    // Booking
    if (business.bookingUrl) {
      try {
        const reviews = await fetchBookingReviews(business.bookingUrl, 100)
        totalSynced += await upsertReviews(reviews, "BOOKING", business)
      } catch (err) {
        errors.push(`[Booking] ${business.id}: ${err}`)
      }
    }

    // Trustpilot
    if (business.trustpilotUrl) {
      try {
        const reviews = await fetchTrustpilotReviews(business.trustpilotUrl, 100)
        totalSynced += await upsertReviews(reviews, "TRUSTPILOT", business)
      } catch (err) {
        errors.push(`[Trustpilot] ${business.id}: ${err}`)
      }
    }

    // Airbnb
    if (business.airbnbUrl) {
      try {
        const reviews = await fetchAirbnbReviews(business.airbnbUrl, 100)
        totalSynced += await upsertReviews(reviews, "AIRBNB", business)
      } catch (err) {
        errors.push(`[Airbnb] ${business.id}: ${err}`)
      }
    }

    await prisma.business.update({ where: { id: business.id }, data: { lastSyncAt: new Date() } })
  }

  return NextResponse.json({ synced: totalSynced, errors, businesses: businesses.length })
}
