export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendPushNotification } from "@/lib/push"

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-vapi-secret")
  if (secret !== process.env.VAPI_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { businessId, date, timeSlot, clientName, clientPhone, serviceId, notes } = body

    if (!businessId || !date || !timeSlot || !clientName) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 })
    }

    // Vérifier que le business existe et a vapiEnabled
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: { user: { select: { id: true, email: true } } }
    })
    if (!business || !business.vapiEnabled) {
      return NextResponse.json({ error: "Business non trouvé ou IA vocale désactivée" }, { status: 404 })
    }

    // Créer le RDV
    const booking = await prisma.booking.create({
      data: {
        businessId,
        serviceId: serviceId ?? null,
        clientName,
        clientEmail: `vapi-${Date.now()}@voice.reputix.net`, // email placeholder pour les RDV téléphoniques
        clientPhone: clientPhone ?? null,
        date,
        timeSlot,
        status: "CONFIRMED", // RDV vocal = confirmé directement
        notes: notes ? `[IA Vocale] ${notes}` : "[RDV pris par IA Vocale]",
      },
      include: { service: true }
    })

    // Push notification au pro
    const subs = await prisma.pushSubscription.findMany({ where: { userId: business.user.id } })
    if (subs.length > 0) {
      await Promise.all(subs.map(sub => sendPushNotification(sub, {
        title: "📞 Nouveau RDV (IA Vocale)",
        body: `${clientName} — ${date} à ${timeSlot}${booking.service ? ` · ${booking.service.name}` : ""}`,
        url: "/bookings",
      })))
    }

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      confirmationMessage: `Parfait ! Votre rendez-vous est confirmé le ${date} à ${timeSlot}. Vous recevrez un rappel la veille. À bientôt chez ${business.name} !`
    })
  } catch (err) {
    console.error("[vapi/book]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
