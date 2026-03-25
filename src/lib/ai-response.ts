import { anthropic, AI_MODEL } from "./anthropic"
import type { Business, Review } from "@prisma/client"

const TONE_INSTRUCTIONS: Record<string, string> = {
  PROFESSIONAL:
    "Ton professionnel et soigné. Vouvoie le client. Utilise un langage formel mais chaleureux.",
  FRIENDLY:
    "Ton amical et chaleureux. Vouvoie le client. Sois accueillant et sincère.",
  LUXURY:
    "Ton raffiné et premium. Vouvoie le client. Utilise un vocabulaire sophistiqué qui reflète une expérience haut de gamme.",
  CASUAL:
    "Ton décontracté et moderne. Tutoie le client si approprié. Sois naturel et authentique.",
}

export function buildPrompt(
  review: Pick<Review, "rating" | "comment" | "reviewerName">,
  business: Pick<Business, "name" | "category" | "responseTone" | "customSignature" | "language">
): string {
  const tone = TONE_INSTRUCTIONS[business.responseTone] ?? TONE_INSTRUCTIONS.PROFESSIONAL
  const signature = business.customSignature ?? `L'équipe ${business.name}`
  const reviewerFirstName = review.reviewerName.split(" ")[0]

  const ratingContext =
    review.rating >= 4
      ? "C'est un avis positif. Remercie sincèrement le client et encourage-le à revenir."
      : review.rating === 3
      ? "C'est un avis mitigé. Remercie le client, reconnais les points d'amélioration mentionnés et montre ta volonté de progresser."
      : "C'est un avis négatif. Reste professionnel et empathique. Excuse-toi pour l'expérience décevante, propose une solution ou invite le client à te contacter directement. Ne sois jamais défensif."

  return `Tu es le gestionnaire de réputation de "${business.name}". Tu dois rédiger une réponse à un avis Google.

CONSIGNES:
- Langue: Français
- ${tone}
- Longueur: 80-130 mots maximum
- ${ratingContext}
- Commence directement la réponse (pas de "Réponse:" ou autre préfixe)
- Termine avec la signature: "${signature}"
- N'invente jamais de faits non mentionnés dans l'avis
- Si le client mentionne son prénom ou un détail spécifique, utilise-le naturellement

AVIS DU CLIENT (${review.rating}/5 étoiles):
Auteur: ${review.reviewerName.split(" ")[0]}
Commentaire: ${review.comment ?? "(Sans commentaire écrit)"}

Rédige maintenant la réponse:`
}

export async function generateAIResponse(
  review: Pick<Review, "rating" | "comment" | "reviewerName">,
  business: Pick<Business, "name" | "category" | "responseTone" | "customSignature" | "language">
): Promise<{ text: string; promptTokens: number; completionTokens: number }> {
  const prompt = buildPrompt(review, business)

  const message = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  })

  const text =
    message.content[0].type === "text" ? message.content[0].text : ""

  return {
    text,
    promptTokens: message.usage.input_tokens,
    completionTokens: message.usage.output_tokens,
  }
}

export async function generateAIResponseStream(
  review: Pick<Review, "rating" | "comment" | "reviewerName">,
  business: Pick<Business, "name" | "category" | "responseTone" | "customSignature" | "language">
): Promise<ReadableStream> {
  const prompt = buildPrompt(review, business)

  const stream = anthropic.messages.stream({
    model: AI_MODEL,
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  })

  return stream.toReadableStream()
}
