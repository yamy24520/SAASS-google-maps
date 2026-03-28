import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const business = await prisma.business.findFirst({ where: { userId: session.user.id } })
  if (!business) return NextResponse.json({ error: "Aucun établissement" }, { status: 404 })

  const { count } = await prisma.reviewRequest.deleteMany({ where: { businessId: business.id } })
  return NextResponse.json({ deleted: count })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const business = await prisma.business.findFirst({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      offerEnabled: true,
      offerText: true,
      gbpLocationId: true,
      reviewRequests: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, email: true, status: true, createdAt: true, sentAt: true, claimStatus: true, prizeWon: true },
      },
    },
  })

  if (!business) return NextResponse.json({ error: "Aucun établissement" }, { status: 404 })

  const total = business.reviewRequests.length
  const sent = business.reviewRequests.filter((r) => r.status === "SENT").length
  const thisWeek = business.reviewRequests.filter(
    (r) => r.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length

  return NextResponse.json({
    business: {
      id: business.id,
      name: business.name,
      offerEnabled: business.offerEnabled,
      offerText: business.offerText,
      collectUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL}/collect/${business.id}`,
    },
    stats: { total, sent, thisWeek },
    requests: business.reviewRequests,
  })
}
