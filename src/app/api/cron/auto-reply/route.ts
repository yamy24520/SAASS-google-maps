import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateAIResponse } from "@/lib/ai-response"
import { replyToReview } from "@/lib/google-business"

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const businesses = await prisma.business.findMany({
    where: {
      autoReplyEnabled: true,
      gbpLocationId: { not: null },
      gbpAccessToken: { not: null },
      user: { subscription: { status: { in: ["ACTIVE", "TRIALING"] } } },
    },
  })

  let totalReplied = 0

  for (const business of businesses) {
    const pendingReviews = await prisma.review.findMany({
      where: {
        businessId: business.id,
        status: "PENDING",
        rating: { gte: business.autoReplyMinRating },
      },
      take: 10, // Process max 10 per run to avoid rate limits
    })

    for (const review of pendingReviews) {
      try {
        const { text, promptTokens, completionTokens } = await generateAIResponse(review, business)

        await replyToReview(business, review.externalReviewId, text)

        await prisma.review.update({
          where: { id: review.id },
          data: {
            aiDraftResponse: text,
            aiGeneratedAt: new Date(),
            aiPromptTokens: promptTokens,
            aiCompletionTokens: completionTokens,
            publishedResponse: text,
            publishedAt: new Date(),
            status: "PUBLISHED",
          },
        })

        totalReplied++
      } catch {
        await prisma.review.update({ where: { id: review.id }, data: { status: "FAILED" } })
      }
    }
  }

  return NextResponse.json({ replied: totalReplied })
}
