import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendReviewRequestWithOffer } from "@/lib/email"
import { rateLimit } from "@/lib/rate-limit"

export async function GET(req: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { name: true, offerEnabled: true, offerText: true, offerType: true, gbpLocationId: true },
  })
  if (!business || !business.offerEnabled) {
    return NextResponse.json({ error: "Offre non disponible" }, { status: 404 })
  }
  return NextResponse.json({
    businessName: business.name,
    offerText: business.offerText,
    offerType: business.offerType,
    hasPlace: !!business.gbpLocationId,
  })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown"
  const rl = rateLimit(`collect:${ip}`, 5, 60_000)
  if (!rl.ok) return NextResponse.json({ error: "Trop de requêtes, réessayez dans " + rl.retryAfter + "s" }, { status: 429 })

  const { businessId } = await params
  const { email } = await req.json()

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 })
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { name: true, offerEnabled: true, offerText: true, offerType: true, spinPrizes: true, gbpLocationId: true },
  })

  if (!business || !business.offerEnabled) {
    return NextResponse.json({ error: "Offre non disponible" }, { status: 404 })
  }
  if (business.offerType === "FIXED" && !business.offerText) {
    return NextResponse.json({ error: "Offre non configurée" }, { status: 404 })
  }
  if (business.offerType === "SPIN_WHEEL" && !business.spinPrizes) {
    return NextResponse.json({ error: "Roulette non configurée" }, { status: 404 })
  }

  const existing = await prisma.reviewRequest.findFirst({
    where: {
      businessId,
      email,
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
  })
  if (existing) {
    return NextResponse.json({ success: true, alreadySent: true })
  }

  const claimToken = crypto.randomUUID()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "https://reputix.net"
  const claimUrl = `${appUrl}/collect/${businessId}/claim/${claimToken}`

  const reviewRequest = await prisma.reviewRequest.create({
    data: { businessId, email, status: "PENDING", claimToken },
  })

  const reviewUrl = business.gbpLocationId
    ? `https://search.google.com/local/writereview?placeid=${business.gbpLocationId}`
    : "https://www.google.com/maps"

  try {
    await sendReviewRequestWithOffer({
      customerEmail: email,
      businessName: business.name,
      offerText: business.offerText ?? "Tentez votre chance à la roulette !",
      offerType: business.offerType as "FIXED" | "SPIN_WHEEL",
      reviewUrl,
      claimUrl,
    })
    await prisma.reviewRequest.update({
      where: { id: reviewRequest.id },
      data: { status: "SENT", sentAt: new Date() },
    })
  } catch {
    // email failure non-blocking
  }

  return NextResponse.json({ success: true })
}
