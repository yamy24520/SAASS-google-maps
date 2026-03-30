export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const bizId = searchParams.get("biz")

  const business = await prisma.business.findFirst({
    where: { id: bizId ?? "", userId: session.user.id },
    include: { services: { where: { active: true } } }
  })
  if (!business) return NextResponse.json({ error: "Business non trouvé" }, { status: 404 })

  const vapiKey = process.env.VAPI_API_KEY
  if (!vapiKey) return NextResponse.json({ error: "VAPI_API_KEY non configurée" }, { status: 500 })

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://reputix.net"
  const webhookSecret = process.env.VAPI_WEBHOOK_SECRET ?? ""

  const serviceList = business.services.map(s => `- ${s.name} (${s.duration} min, ${s.price}€)`).join("\n") || "- Aucun service configuré"

  const systemPrompt = `Tu es l'assistante vocale de ${business.name}. Tu réponds uniquement en français, avec un ton chaleureux et professionnel.

Ton seul rôle est de prendre des rendez-vous pour les clients.

Services disponibles :
${serviceList}

Processus de prise de RDV :
1. Accueille chaleureusement le client
2. Demande le service souhaité parmi ceux listés ci-dessus
3. Demande la date souhaitée (si c'est "demain", "vendredi", etc., convertis en date au format YYYY-MM-DD)
4. Appelle l'outil check_availability pour vérifier les créneaux disponibles
5. Propose les créneaux disponibles au client
6. Demande l'heure souhaitée
7. Demande le prénom et nom du client
8. Demande le numéro de téléphone (optionnel)
9. Appelle l'outil create_booking pour confirmer
10. Confirme le RDV et souhaite une bonne journée

Si aucun créneau n'est disponible, propose une autre date.
Ne réponds pas à des questions qui ne concernent pas les réservations.
Sois concise et naturelle.`

  const assistantConfig = {
    name: `${business.name} — Réservations`,
    model: {
      provider: "openai",
      model: "gpt-4o-mini",
      systemPrompt,
      tools: [
        {
          type: "function",
          function: {
            name: "check_availability",
            description: "Vérifie les créneaux disponibles pour une date donnée",
            parameters: {
              type: "object",
              properties: {
                date: { type: "string", description: "Date au format YYYY-MM-DD" },
                serviceId: { type: "string", description: "ID du service (optionnel)" }
              },
              required: ["date"]
            }
          },
          server: {
            url: `${baseUrl}/api/vapi/availability?businessId=${business.id}`,
            secret: webhookSecret
          }
        },
        {
          type: "function",
          function: {
            name: "create_booking",
            description: "Crée un rendez-vous confirmé",
            parameters: {
              type: "object",
              properties: {
                date: { type: "string", description: "Date au format YYYY-MM-DD" },
                timeSlot: { type: "string", description: "Heure au format HH:MM" },
                clientName: { type: "string", description: "Nom complet du client" },
                clientPhone: { type: "string", description: "Numéro de téléphone (optionnel)" },
                serviceId: { type: "string", description: "ID du service choisi (optionnel)" },
                notes: { type: "string", description: "Notes supplémentaires (optionnel)" }
              },
              required: ["date", "timeSlot", "clientName"]
            }
          },
          server: {
            url: `${baseUrl}/api/vapi/book`,
            secret: webhookSecret
          }
        }
      ]
    },
    voice: {
      provider: "11labs",
      voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel - voix féminine française naturelle
      stability: 0.5,
      similarityBoost: 0.75
    },
    firstMessage: `Bonjour, vous êtes bien chez ${business.name}. Je suis votre assistante virtuelle pour la prise de rendez-vous. Comment puis-je vous aider ?`,
    endCallMessage: "Merci de votre appel. À bientôt !",
    transcriber: {
      provider: "deepgram",
      model: "nova-2",
      language: "fr"
    }
  }

  try {
    let assistantId = business.vapiAssistantId

    if (assistantId) {
      // Mettre à jour l'assistant existant
      await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${vapiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(assistantConfig)
      })
    } else {
      // Créer un nouvel assistant
      const createRes = await fetch("https://api.vapi.ai/assistant", {
        method: "POST",
        headers: { "Authorization": `Bearer ${vapiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(assistantConfig)
      })
      const created = await createRes.json()
      if (!createRes.ok) {
        return NextResponse.json({ error: `Vapi API error: ${created.message ?? JSON.stringify(created)}` }, { status: 500 })
      }
      assistantId = created.id
    }

    // Mettre à jour le business
    await prisma.business.update({
      where: { id: business.id },
      data: { vapiAssistantId: assistantId, vapiEnabled: true }
    })

    return NextResponse.json({ success: true, assistantId })
  } catch (err) {
    console.error("[vapi/setup]", err)
    return NextResponse.json({ error: "Erreur création assistant Vapi" }, { status: 500 })
  }
}

// DELETE — désactiver l'IA vocale
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const bizId = searchParams.get("biz")

  await prisma.business.updateMany({
    where: { id: bizId ?? "", userId: session.user.id },
    data: { vapiEnabled: false }
  })

  return NextResponse.json({ ok: true })
}
