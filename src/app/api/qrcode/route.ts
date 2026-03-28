import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const business = await prisma.business.findFirst({
    where: { userId: session.user.id },
    select: { name: true, gbpLocationId: true },
  })

  if (!business) return NextResponse.json({ error: "Aucun établissement" }, { status: 404 })
  if (!business.gbpLocationId) return NextResponse.json({ error: "Aucune fiche liée" }, { status: 400 })

  const reviewUrl = `https://search.google.com/local/writereview?placeid=${business.gbpLocationId}`
  const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${business.gbpLocationId}`

  return NextResponse.json({ reviewUrl, mapsUrl, businessName: business.name })
}
