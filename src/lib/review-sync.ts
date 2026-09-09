import { prisma } from "@/lib/prisma"
import { listReviews, starRatingToNumber } from "@/lib/google-business"
import { fetchReviewsOutscraper, fetchTripAdvisorReviews, fetchBookingReviews, fetchTrustpilotReviews, fetchAirbnbReviews, outscraperEnabled, type OutscraperReview } from "@/lib/outscraper"
import type { Business, ReviewSource } from "@prisma/client"
import { sendNegativeReviewAlert } from "@/lib/email"
import { getPlaceReviews } from "@/lib/google-places"
import { createHash } from "node:crypto"

export function normalizedDate(value: string | undefined, fallback: Date): Date {
  const date = value ? new Date(value) : fallback
  return Number.isFinite(date.getTime()) ? date : fallback
}

export function reviewKey(businessId: string, source: ReviewSource, id: string): string {
  return `${businessId}:${source}:${id}`
}

export async function storeReviews(businessId: string, source: ReviewSource, reviews: OutscraperReview[]) {
  let inserted = 0
  for (const review of reviews) {
    if (!review.review_id || !Number.isFinite(review.review_rating)) continue
    const externalReviewId = reviewKey(businessId, source, review.review_id)
    // Preserve existing records/drafts while migrating from globally unique IDs.
    const legacyId = source === "GOOGLE" && review.review_id.startsWith("accounts/") ? review.review_id.split("/reviews/")[1] : review.review_id
    const existing = await prisma.review.findFirst({ where: { businessId, externalReviewId: { in: [externalReviewId, `${source}:${review.review_id}`, review.review_id, `${source}:${legacyId}`] } } })
    const now = new Date()
    const rating = Math.min(5, Math.max(1, Math.round(review.review_rating)))
    const data = {
      reviewerName: review.author_title || "Anonyme",
      reviewerPhotoUrl: review.author_image ?? null,
      rating,
      comment: review.review_text ?? null,
      reviewPublishedAt: normalizedDate(review.review_datetime_utc, existing?.reviewPublishedAt ?? now),
      isNegative: rating <= 2,
      ...(review.owner_answer ? { status: "PUBLISHED" as const, publishedResponse: review.owner_answer, publishedAt: normalizedDate(review.owner_answer_timestamp_datetime_utc, existing?.publishedAt ?? now) } : {}),
    }
    if (existing) {
      await prisma.review.update({ where: { id: existing.id }, data: { ...data, externalReviewId } })
    } else {
      // createMany skipDuplicates is safe even when another request races us.
      const result = await prisma.review.createMany({ data: [{ ...data, businessId, externalReviewId, source }], skipDuplicates: true })
      inserted += result.count
    }
  }
  return inserted
}

export async function updateReviewStats(businessId: string) {
  const [stats, published] = await Promise.all([
    prisma.review.aggregate({ where: { businessId }, _count: true, _avg: { rating: true } }),
    prisma.review.count({ where: { businessId, status: "PUBLISHED" } }),
  ])
  await prisma.business.update({ where: { id: businessId }, data: { totalReviews: stats._count, averageRating: stats._avg.rating ?? 0, responseRate: stats._count ? published / stats._count * 100 : 0 } })
}

export async function synchronizeReviews(business: Business, mode: "manual" | "cron") {
  const now = new Date()
  const paid = outscraperEnabled() && (mode === "manual" || process.env.OUTSCRAPER_CRON_ENABLED === "true")
  const hasGoogleAccess = !!(business.gbpReviewLocationId && (business.gbpRefreshToken || business.gbpAccessToken))
  if (!hasGoogleAccess && !paid) {
    return { synced: 0, errors: [] as string[], warnings: [mode === "cron" ? "Import automatique payant désactivé. Utilisez la synchronisation manuelle." : "Import indisponible : configurez un fournisseur ou connectez Google Business Profile."], cached: false }
  }
  const cooldownMs = paid ? 24 * 60 * 60_000 : 15 * 60_000
  const leaseUntil = new Date(now.getTime() + 300_000)
  const claimed = await prisma.business.updateMany({
    where: { id: business.id, AND: [
      { OR: [{ syncAttemptAt: null }, { syncAttemptAt: { lte: new Date(now.getTime() - cooldownMs) } }] },
      { OR: [{ syncLeaseUntil: null }, { syncLeaseUntil: { lte: now } }] },
    ] },
    data: { syncAttemptAt: now, syncLeaseUntil: leaseUntil },
  })
  if (!claimed.count) return { synced: 0, errors: [] as string[], warnings: ["Synchronisation déjà en cours ou effectuée récemment."], cached: true }

  let synced = 0
  let completed = 0
  const errors: string[] = []
  const warnings: string[] = []
  try {
    if (business.gbpReviewLocationId && (business.gbpRefreshToken || business.gbpAccessToken)) {
      try {
        let pageToken: string | undefined = business.reviewSyncCursor ?? undefined
        const seen = new Set<string>()
        // Save the cursor after each page so large histories resume on the next run.
        let pages = 0
        do {
          const page = await listReviews(business, pageToken)
          synced += await storeReviews(business.id, "GOOGLE", page.reviews.map(review => ({
            review_id: review.name,
            author_title: review.reviewer?.displayName ?? "Anonyme",
            author_image: review.reviewer?.profilePhotoUrl,
            review_rating: starRatingToNumber(review.starRating),
            review_text: review.comment,
            review_datetime_utc: review.createTime,
            owner_answer: review.reviewReply?.comment,
            owner_answer_timestamp_datetime_utc: review.reviewReply?.updateTime,
          })))
          pageToken = page.nextPageToken
          await prisma.business.update({ where: { id: business.id }, data: { reviewSyncCursor: pageToken ?? null } })
          if (pageToken && seen.has(pageToken)) throw new Error("Pagination Google invalide")
          if (pageToken) seen.add(pageToken)
          pages++
        } while (pageToken && pages < 10 && Date.now() - now.getTime() < 180_000)
        if (pageToken) warnings.push("Google : import partiel enregistré. La prochaine synchronisation reprendra l’historique restant.")
        completed++
      } catch { errors.push("Google : synchronisation impossible. Vérifiez votre connexion et les autorisations Business Profile.") }
    } else if (paid && business.gbpLocationId) {
      try { synced += await storeReviews(business.id, "GOOGLE", await fetchReviewsOutscraper(business.gbpLocationId, 25)); completed++ }
      catch {
        try {
          const sample = await getPlaceReviews(business.gbpLocationId)
          synced += await storeReviews(business.id, "GOOGLE", sample.slice(0, 5).map(review => ({
            review_id: review.id ?? `places-${createHash("sha256").update(`${business.gbpLocationId}:${review.authorName}:${review.publishTime}`).digest("hex")}`,
            author_title: review.authorName, review_rating: review.rating, review_text: review.text, review_datetime_utc: review.publishTime,
          })))
          completed++
          warnings.push("Outscraper indisponible : aperçu Google Places limité à 5 avis. L’historique complet nécessite un fournisseur opérationnel ou la connexion Google Business Profile.")
        } catch { errors.push("Import indisponible : Outscraper et Google Places n’ont pas répondu correctement.") }
      }
    } else {
      warnings.push("Google : connectez votre compte et sélectionnez l’établissement dans Paramètres pour synchroniser sans Outscraper.")
    }
    const sources = [
      ["TRIPADVISOR", business.tripAdvisorUrl, fetchTripAdvisorReviews],
      ["BOOKING", business.bookingUrl, fetchBookingReviews],
      ["TRUSTPILOT", business.trustpilotUrl, fetchTrustpilotReviews],
      ["AIRBNB", business.airbnbUrl, fetchAirbnbReviews],
    ] as const
    for (const [source, url, fetcher] of sources) {
      if (!url) continue
      if (!paid) { warnings.push(`${source} : import payant désactivé ; les avis déjà enregistrés restent disponibles.`); continue }
      if (Date.now() - now.getTime() > 220_000) { warnings.push(`${source} : reporté pour respecter la durée maximale.`); continue }
      try { synced += await storeReviews(business.id, source, await fetcher(url, 25)); completed++ }
      catch { errors.push(`${source} : l’import a échoué.`) }
    }
    await updateReviewStats(business.id)
    if (business.alertEmailEnabled && completed) {
      const user = await prisma.user.findUnique({ where: { id: business.userId }, select: { email: true, name: true } })
      if (user?.email) {
        const alerts = await prisma.review.findMany({ where: { businessId: business.id, isNegative: true, alertSentAt: null }, take: 10, orderBy: { reviewPublishedAt: "desc" } })
        for (const review of alerts) {
          try {
            await sendNegativeReviewAlert({ userEmail: user.email, userName: user.name ?? "Propriétaire", businessName: business.name, reviewerName: review.reviewerName, rating: review.rating, comment: review.comment ?? "", reviewId: review.id })
            await prisma.review.update({ where: { id: review.id }, data: { alertSentAt: new Date() } })
          } catch { warnings.push("Une alerte email n’a pas pu être envoyée ; elle sera retentée."); break }
        }
      }
    }
    if (completed) await prisma.business.update({ where: { id: business.id }, data: { lastSyncAt: new Date() } })
    return { synced, errors, warnings, cached: false }
  } finally {
    await prisma.business.updateMany({ where: { id: business.id, syncLeaseUntil: leaseUntil }, data: { syncLeaseUntil: null } })
  }
}
