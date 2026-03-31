import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest, { params }: { params: Promise<{ reviewId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { reviewId } = await params
  const bizId = new URL(req.url).searchParams.get("biz")
  const isAdmin = session.user.role === "ADMIN"

  const business = await prisma.business.findFirst({
    where: bizId
      ? (isAdmin ? { id: bizId } : { id: bizId, userId: session.user.id })
      : { userId: session.user.id },
    select: { id: true, gbpLocationId: true, tripAdvisorUrl: true, bookingUrl: true, trustpilotUrl: true },
  })
  if (!business) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  const review = await prisma.review.findFirst({ where: { id: reviewId, businessId: business.id } })
  if (!review) return NextResponse.json({ error: "Avis introuvable" }, { status: 404 })

  // Resolve placeId for Google reply page
  const snapshot = await prisma.reputationSnapshot.findFirst({
    where: { businessId: business.id },
    orderBy: { recordedAt: "desc" },
    select: { placeId: true },
  })
  const placeId = business.gbpLocationId ?? snapshot?.placeId ?? null

  // Resolve platform URL based on review source
  const platformUrlMap: Record<string, string | null> = {
    TRIPADVISOR: business.tripAdvisorUrl ?? null,
    BOOKING: business.bookingUrl ?? null,
    TRUSTPILOT: business.trustpilotUrl ?? null,
  }
  const platformUrl = platformUrlMap[review.source] ?? null

  return NextResponse.json({ review, placeId, platformUrl })
}
