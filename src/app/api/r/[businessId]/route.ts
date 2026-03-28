import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      name: true,
      gbpLocationId: true,
      averageRating: true,
      totalReviews: true,
      socialLinks: true,
      reputationPageEnabled: true,
      logoDataUrl: true,
      pageTheme: true,
      pageTagline: true,
    },
  })

  if (!business || !business.reputationPageEnabled) {
    return NextResponse.json({ error: "Page introuvable" }, { status: 404 })
  }

  // Latest snapshot for accurate rating/count
  const snapshot = await prisma.reputationSnapshot.findFirst({
    where: { businessId },
    orderBy: { recordedAt: "desc" },
    select: { rating: true, reviewCount: true, placeId: true },
  })

  // Recent positive reviews
  const reviews = await prisma.review.findMany({
    where: { businessId, rating: { gte: 4 }, comment: { not: null } },
    orderBy: { reviewPublishedAt: "desc" },
    take: 3,
    select: {
      reviewerName: true,
      rating: true,
      comment: true,
      reviewPublishedAt: true,
    },
  })

  const placeId = business.gbpLocationId ?? snapshot?.placeId ?? null
  const rating = snapshot?.rating ?? business.averageRating ?? 0
  const reviewCount = snapshot?.reviewCount ?? business.totalReviews ?? 0

  return NextResponse.json({
    businessName: business.name,
    rating,
    reviewCount,
    placeId,
    reviews,
    socialLinks: (business.socialLinks as Record<string, string>) ?? {},
    logoDataUrl: business.logoDataUrl ?? null,
    pageTheme: business.pageTheme ?? "dark",
    pageTagline: business.pageTagline ?? null,
  })
}
