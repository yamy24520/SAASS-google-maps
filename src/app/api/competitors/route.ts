import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { findNearbyCompetitors, getPlaceDetails } from "@/lib/google-places"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const business = await prisma.business.findFirst({
    where: { userId: session.user.id },
    include: { competitors: { orderBy: { rating: "desc" } } },
  })

  if (!business) return NextResponse.json({ error: "Aucun établissement" }, { status: 404 })

  return NextResponse.json({
    business: {
      name: business.name,
      rating: business.averageRating,
      reviewCount: business.totalReviews,
      responseRate: business.responseRate,
    },
    competitors: business.competitors,
  })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { lat, lng } = await req.json()

  const business = await prisma.business.findFirst({ where: { userId: session.user.id } })
  if (!business) return NextResponse.json({ error: "Aucun établissement" }, { status: 404 })

  try {
    const nearby = await findNearbyCompetitors(
      lat,
      lng,
      business.category,
      business.gbpLocationId ?? "",
      business.placeType ?? undefined
    )

    // Delete stale competitors, then insert fresh results
    await prisma.competitor.deleteMany({ where: { businessId: business.id } })
    for (const c of nearby) {
      await prisma.competitor.create({
        data: {
          businessId: business.id,
          placeId: c.placeId,
          name: c.name,
          rating: c.rating,
          reviewCount: c.reviewCount,
          address: c.address,
          category: c.category,
          photoUrl: c.photoUrl,
        },
      })
    }

    return NextResponse.json({ success: true, count: nearby.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur Places API"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
