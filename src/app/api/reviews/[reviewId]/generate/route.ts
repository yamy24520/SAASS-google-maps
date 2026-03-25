import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateAIResponseStream } from "@/lib/ai-response"
import { Anthropic } from "@anthropic-ai/sdk"

export async function POST(req: NextRequest, { params }: { params: Promise<{ reviewId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { reviewId } = await params

  const business = await prisma.business.findUnique({ where: { userId: session.user.id } })
  if (!business) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 })

  const review = await prisma.review.findFirst({
    where: { id: reviewId, businessId: business.id },
  })
  if (!review) return NextResponse.json({ error: "Avis introuvable" }, { status: 404 })

  const stream = await generateAIResponseStream(review, business)

  // Collect full text to save to DB after streaming
  const [streamForClient, streamForSave] = stream.tee()

  // Save to DB asynchronously after stream completes
  ;(async () => {
    const reader = streamForSave.getReader()
    let fullText = ""
    let promptTokens = 0
    let completionTokens = 0

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const decoder = new TextDecoder()
        const chunk = decoder.decode(value)
        const lines = chunk.split("\n").filter(Boolean)

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6)) as Anthropic.MessageStreamEvent
              if (data.type === "content_block_delta" && data.delta.type === "text_delta") {
                fullText += data.delta.text
              }
              if (data.type === "message_delta" && "usage" in data) {
                completionTokens = (data.usage as { output_tokens: number }).output_tokens
              }
              if (data.type === "message_start" && "message" in data) {
                promptTokens = (data.message as { usage: { input_tokens: number } }).usage.input_tokens
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    if (fullText) {
      await prisma.review.update({
        where: { id: reviewId },
        data: {
          aiDraftResponse: fullText,
          aiGeneratedAt: new Date(),
          aiPromptTokens: promptTokens,
          aiCompletionTokens: completionTokens,
          status: "DRAFT",
        },
      })
    }
  })()

  return new Response(streamForClient, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
