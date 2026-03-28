import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPlaceReviews } from "@/lib/google-places"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const business = await prisma.business.findFirst({
    where: { userId: session.user.id },
    include: {
      reviews: {
        orderBy: { reviewPublishedAt: "desc" },
        take: 50,
        select: { rating: true, comment: true, reviewerName: true, reviewPublishedAt: true },
      },
    },
  })

  if (!business) return NextResponse.json({ error: "Aucun établissement" }, { status: 404 })

  // Gather reviews: from DB first, then supplement with Places API public reviews
  type ReviewItem = { rating: number; text: string; author: string }
  let reviews: ReviewItem[] = business.reviews
    .filter((r) => r.comment)
    .map((r) => ({ rating: r.rating, text: r.comment!, author: r.reviewerName }))

  if (reviews.length < 5 && business.gbpLocationId) {
    try {
      const placeReviews = await getPlaceReviews(business.gbpLocationId)
      const existing = new Set(reviews.map((r) => r.text.slice(0, 30)))
      for (const pr of placeReviews) {
        if (pr.text && !existing.has(pr.text.slice(0, 30))) {
          reviews.push({ rating: pr.rating, text: pr.text, author: pr.authorName })
        }
      }
    } catch {
      // non-blocking
    }
  }

  if (reviews.length === 0) {
    return NextResponse.json({ error: "Pas assez d'avis pour analyser" }, { status: 400 })
  }

  const reviewsText = reviews
    .map((r, i) => `Avis ${i + 1} (${r.rating}/5 - ${r.author}): "${r.text}"`)
    .join("\n")

  const prompt = `Tu es un expert en analyse de réputation pour les établissements locaux (restaurants, hôtels, bars).

Analyse ces ${reviews.length} avis clients pour l'établissement "${business.name}" et retourne UNIQUEMENT un JSON valide (pas de markdown, pas de texte avant/après) avec cette structure exacte :

{
  "summary": "Résumé en 2 phrases de la réputation globale",
  "sentiment": { "positive": 0, "neutral": 0, "negative": 0 },
  "themes": [
    { "theme": "Nom du thème", "count": 0, "sentiment": "positive|negative|neutral", "emoji": "🍽️" }
  ],
  "topCompliments": ["compliment 1", "compliment 2", "compliment 3"],
  "topComplaints": ["plainte 1", "plainte 2", "plainte 3"],
  "recommendations": ["action concrète 1", "action concrète 2", "action concrète 3"]
}

Règles :
- sentiment.positive/neutral/negative = nombre d'avis (total doit faire ${reviews.length})
- themes : 3 à 5 thèmes les plus mentionnés (service, nourriture, ambiance, prix, propreté, attente...)
- topCompliments : ce que les clients adorent (max 3, phrases courtes)
- topComplaints : ce qui revient le plus dans les critiques (max 3, seulement si présents)
- recommendations : actions concrètes prioritaires pour améliorer la note (max 3)

Avis à analyser :
${reviewsText}`

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    })

    const raw = message.content[0].type === "text" ? message.content[0].text : ""
    const start = raw.indexOf("{")
    const end = raw.lastIndexOf("}")
    if (start === -1 || end === -1) throw new Error("Réponse IA invalide")
    const analysis = JSON.parse(raw.slice(start, end + 1))

    return NextResponse.json({ analysis, reviewCount: reviews.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur analyse IA"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
