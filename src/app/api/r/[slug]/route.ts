import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function findBusiness(slug: string) {
  // Try slug first, then businessId (backward compat)
  const bySlug = await prisma.business.findUnique({ where: { pageSlug: slug } })
  if (bySlug) return bySlug
  return prisma.business.findUnique({ where: { id: slug } })
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const session = await getServerSession(authOptions)

  const business = await findBusiness(slug)
  if (!business) return NextResponse.json({ error: "Page introuvable" }, { status: 404 })

  const isOwner = session?.user?.id === business.userId
  if (!business.reputationPageEnabled && !isOwner) {
    return NextResponse.json({ error: "Page introuvable" }, { status: 404 })
  }

  const snapshot = await prisma.reputationSnapshot.findFirst({
    where: { businessId: business.id },
    orderBy: { recordedAt: "desc" },
    select: { rating: true, reviewCount: true, placeId: true },
  })

  const reviews = await prisma.review.findMany({
    where: { businessId: business.id, rating: { gte: 4 }, comment: { not: null } },
    orderBy: { reviewPublishedAt: "desc" },
    take: 5,
    select: { reviewerName: true, rating: true, comment: true, reviewPublishedAt: true },
  })

  const placeId = business.gbpLocationId ?? snapshot?.placeId ?? null
  const rating = snapshot?.rating ?? business.averageRating ?? 0
  const reviewCount = snapshot?.reviewCount ?? business.totalReviews ?? 0

  const DEFAULT_SECTIONS = [
    { id: "reviews",  type: "reviews",  enabled: true,  order: 0 },
    { id: "menu",     type: "menu",     enabled: false, order: 1, categories: [] },
    { id: "social",   type: "social",   enabled: true,  order: 2, links: [] },
    { id: "hours",    type: "hours",    enabled: false, order: 3, schedule: {} },
    { id: "location", type: "location", enabled: false, order: 4, address: "" },
    { id: "photos",   type: "photos",   enabled: false, order: 5, images: [] },
  ]

  const savedConfig = business.pageConfig as { sections?: { type: string }[] } | null
  const savedSections = savedConfig?.sections ?? []
  const savedTypes = new Set(savedSections.map((s) => s.type))
  const missingSections = DEFAULT_SECTIONS.filter((s) => !savedTypes.has(s.type))
  const mergedSections = [...savedSections, ...missingSections]
  const pageConfig = { sections: mergedSections }

  return NextResponse.json({
    businessId: business.id,
    businessName: business.name,
    rating,
    reviewCount,
    placeId,
    reviews,
    logoDataUrl: business.logoDataUrl ?? null,
    pageTheme: business.pageTheme ?? "dark",
    pageTagline: business.pageTagline ?? null,
    pageAccentColor: business.pageAccentColor ?? null,
    pageCoverDataUrl: business.pageCoverDataUrl ?? null,
    pageDescription: business.pageDescription ?? null,
    pageLegalText: business.pageLegalText ?? null,
    pageLabels: (business.pageLabels as Record<string, string>) ?? null,
    pageServiceOrder: (business.pageServiceOrder as string[]) ?? null,
    pageShowHours: business.pageShowHours ?? false,
    bookingHours: business.bookingHours ?? null,
    pageConfig,
    socialLinks: (business.socialLinks as Record<string, string>) ?? {},
    bookingEnabled: business.bookingEnabled,
    bookingPageSlug: business.pageSlug ?? null,
    isOwner,
    reputationPageEnabled: business.reputationPageEnabled,
  })
}
