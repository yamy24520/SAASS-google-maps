import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { replyToReview } from "@/lib/google-business"
import { z } from "zod"

const schema = z.object({ response: z.string().min(1) })

export async function POST(req: NextRequest, { params }: { params: Promise<{ reviewId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { reviewId } = await params
  const body = await req.json()
  const { response } = schema.parse(body)

  const bizId = new URL(req.url).searchParams.get("biz")
  const isAdmin = session.user.role === "ADMIN"
  const business = await prisma.business.findFirst({
    where: bizId
      ? (isAdmin ? { id: bizId } : { id: bizId, userId: session.user.id })
      : { userId: session.user.id },
  })
  if (!business) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 })

  const review = await prisma.review.findFirst({
    where: { id: reviewId, businessId: business.id },
  })
  if (!review) return NextResponse.json({ error: "Avis introuvable" }, { status: 404 })

  // Try to publish on Google — if GBP API unavailable, save locally anyway
  try {
    await replyToReview(business, review.googleReviewId, response)
  } catch {
    // GBP unavailable — save response locally as APPROVED (not yet published on Google)
    await prisma.review.update({
      where: { id: reviewId },
      data: { publishedResponse: response, publishedAt: new Date(), status: "APPROVED" },
    })
    return NextResponse.json({ success: true, warning: "Réponse sauvegardée localement. Publication Google indisponible pour le moment." })
  }

  await prisma.review.update({
    where: { id: reviewId },
    data: {
      publishedResponse: response,
      publishedAt: new Date(),
      status: "PUBLISHED",
    },
  })

  // Recalculate response rate
  const [total, published] = await Promise.all([
    prisma.review.count({ where: { businessId: business.id } }),
    prisma.review.count({ where: { businessId: business.id, status: "PUBLISHED" } }),
  ])

  await prisma.business.update({
    where: { id: business.id },
    data: { responseRate: total > 0 ? (published / total) * 100 : 0 },
  })

  return NextResponse.json({ success: true })
}
