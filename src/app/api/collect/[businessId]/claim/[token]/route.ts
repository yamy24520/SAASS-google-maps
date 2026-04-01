import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function spinWheel(prizes: { label: string; emoji: string; probability: number }[]): string {
  const total = prizes.reduce((s, p) => s + p.probability, 0)
  let rand = Math.random() * total
  for (const prize of prizes) {
    rand -= prize.probability
    if (rand <= 0) return `${prize.emoji} ${prize.label}`
  }
  return `${prizes[prizes.length - 1].emoji} ${prizes[prizes.length - 1].label}`
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ businessId: string; token: string }> }
) {
  const { businessId, token } = await params

  const request = await prisma.reviewRequest.findFirst({
    where: { claimToken: token, businessId },
    include: {
      business: {
        select: { name: true, offerText: true, offerType: true, spinPrizes: true, gbpLocationId: true },
      },
    },
  })

  if (!request) return NextResponse.json({ error: "Lien invalide" }, { status: 404 })

  return NextResponse.json({
    businessName: request.business.name,
    offerType: request.business.offerType,
    offerText: request.business.offerText,
    spinPrizes: request.business.spinPrizes,
    placeId: request.business.gbpLocationId,
    alreadyClaimed: request.claimStatus === "CLAIMED",
    prizeWon: request.prizeWon,
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ businessId: string; token: string }> }
) {
  const { businessId, token } = await params

  const request = await prisma.reviewRequest.findFirst({
    where: { claimToken: token, businessId },
    include: {
      business: {
        select: { name: true, offerText: true, offerType: true, spinPrizes: true, gbpLocationId: true },
      },
    },
  })

  if (!request) return NextResponse.json({ error: "Lien invalide" }, { status: 404 })
  if (request.claimStatus === "CLAIMED") {
    return NextResponse.json({ alreadyClaimed: true, prizeWon: request.prizeWon })
  }

  let prizeWon: string

  if (request.business.offerType === "SPIN_WHEEL" && request.business.spinPrizes) {
    const prizes = request.business.spinPrizes as { label: string; emoji: string; probability: number }[]
    prizeWon = spinWheel(prizes)
  } else {
    prizeWon = request.business.offerText ?? "Offre spéciale"
  }

  await prisma.reviewRequest.update({
    where: { id: request.id },
    data: { claimStatus: "CLAIMED", claimedAt: new Date(), prizeWon },
  })

  return NextResponse.json({ prizeWon, businessName: request.business.name })
}
