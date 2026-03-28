import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { imageBase64, mediaType } = await req.json()
  if (!imageBase64) return NextResponse.json({ error: "Image manquante" }, { status: 400 })

  const type = (mediaType ?? "image/jpeg") as "image/jpeg" | "image/png" | "image/webp"

  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [{
      role: "user",
      content: [
        {
          type: "image",
          source: { type: "base64", media_type: type, data: imageBase64 },
        },
        {
          type: "text",
          text: `Extrait tous les plats de cette carte de restaurant.
Réponds UNIQUEMENT avec ce JSON, sans markdown ni texte autour:
{"categories":[{"name":"string","items":[{"name":"string","description":"string","price":"string"}]}]}
Règles:
- Inclure TOUTES les catégories visibles (Entrées, Plats, Desserts, Boissons...)
- description: max 70 caractères, "" si absente
- price: inclure le symbole (€, $...) ou "" si absent
- Ne rien inventer, utiliser uniquement ce qui est lisible sur l'image`,
        },
      ],
    }],
  })

  const raw = (msg.content[0] as { type: string; text: string }).text.trim()
  // Extract JSON robustly
  const start = raw.indexOf("{")
  const end = raw.lastIndexOf("}")
  if (start === -1 || end === -1) return NextResponse.json({ error: "Impossible de lire la carte" }, { status: 422 })

  try {
    const data = JSON.parse(raw.slice(start, end + 1))
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Format inattendu, réessayez" }, { status: 422 })
  }
}
