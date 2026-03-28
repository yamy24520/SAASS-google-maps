import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPlaceDetails } from "@/lib/google-places"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const business = await prisma.business.findFirst({
    where: { userId: session.user.id },
    include: {
      reputationSnapshots: {
        orderBy: { recordedAt: "asc" },
        take: 90,
      },
    },
  })

  if (!business) return NextResponse.json({ error: "Aucun établissement" }, { status: 404 })

  // If placeId set but coords or type missing, fetch and save them
  let placeLat = business.placeLat
  let placeLng = business.placeLng
  let placeType = business.placeType
  if (business.gbpLocationId && (placeLat == null || placeLng == null || placeType == null)) {
    try {
      const details = await getPlaceDetails(business.gbpLocationId)
      const updates: Record<string, unknown> = {}
      if (details.lat != null) { updates.placeLat = details.lat; placeLat = details.lat }
      if (details.lng != null) { updates.placeLng = details.lng; placeLng = details.lng }
      if (details.primaryType) { updates.placeType = details.primaryType; placeType = details.primaryType }
      if (Object.keys(updates).length > 0) {
        await prisma.business.update({ where: { id: business.id }, data: updates })
      }
    } catch {
      // non-blocking
    }
  }

  return NextResponse.json({
    business: {
      id: business.id,
      name: business.name,
      placeId: business.gbpLocationId,
      rating: business.averageRating,
      totalReviews: business.totalReviews,
      responseRate: business.responseRate,
      lat: placeLat,
      lng: placeLng,
      placeType,
    },
    snapshots: business.reputationSnapshots.map((s) => ({
      date: s.recordedAt.toISOString().split("T")[0],
      rating: s.rating,
      reviewCount: s.reviewCount,
    })),
  })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { placeId } = await req.json()

  const business = await prisma.business.findFirst({ where: { userId: session.user.id } })
  if (!business) return NextResponse.json({ error: "Aucun établissement" }, { status: 404 })

  try {
    const details = await getPlaceDetails(placeId)

    // Save snapshot
    await prisma.reputationSnapshot.create({
      data: {
        businessId: business.id,
        placeId,
        rating: details.rating,
        reviewCount: details.reviewCount,
      },
    })

    // Update business with placeId, coords, type and latest stats
    await prisma.business.update({
      where: { id: business.id },
      data: {
        gbpLocationId: placeId,
        averageRating: details.rating,
        totalReviews: details.reviewCount,
        ...(details.lat != null && { placeLat: details.lat }),
        ...(details.lng != null && { placeLng: details.lng }),
        ...(details.primaryType && { placeType: details.primaryType }),
      },
    })

    return NextResponse.json({ success: true, details })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur Places API"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
