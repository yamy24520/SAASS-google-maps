import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildPrompt } from "@/lib/ai-response"
import { anthropic, AI_MODEL } from "@/lib/anthropic"

export async function POST(req: NextRequest, { params }: { params: Promise<{ reviewId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { reviewId } = await params

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

  const prompt = buildPrompt(review, business)

  const encoder = new TextEncoder()
  let fullText = ""

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = anthropic.messages.stream({
          model: AI_MODEL,
          max_tokens: 300,
          messages: [{ role: "user", content: prompt }],
        })

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullText += event.delta.text
            const sseLine = `data: ${JSON.stringify({ type: "content_block_delta", delta: { type: "text_delta", text: event.delta.text } })}\n\n`
            controller.enqueue(encoder.encode(sseLine))
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        controller.close()

        // Save to DB after stream
        if (fullText) {
          await prisma.review.update({
            where: { id: reviewId },
            data: {
              aiDraftResponse: fullText,
              aiGeneratedAt: new Date(),
              status: "DRAFT",
            },
          })
        }
      } catch (err) {
        console.error("[generate] stream error:", err)
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
