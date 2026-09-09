export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendPushNotification } from "@/lib/push"
import { getAvailability } from "@/lib/booking-availability"
import { dateSchema, timeSchema } from "@/lib/booking-rules"
import { z } from "zod"
import { randomUUID } from "node:crypto"

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-vapi-secret")
  if (!process.env.VAPI_WEBHOOK_SECRET || secret !== process.env.VAPI_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  try {
    const parsed = z.object({ businessId: z.string().min(1), date: dateSchema, timeSlot: timeSchema, clientName: z.string().trim().min(1).max(150), clientPhone: z.string().max(40).nullable().optional(), serviceId: z.string().nullable().optional(), notes: z.string().max(5000).nullable().optional(), partySize: z.number().int().min(1).max(500).optional() }).safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Réservation invalide." }, { status: 400 })
    const { businessId, date, timeSlot, clientName, clientPhone, serviceId, notes, partySize } = parsed.data

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
    const booking = await prisma.$transaction(async tx => {
      const availability = await getAvailability({ businessId, date, serviceId, partySize }, tx)
      if (!availability.slots.includes(timeSlot)) throw new Error("SLOT_UNAVAILABLE")
      return tx.booking.create({
      data: {
        businessId,
        serviceId: serviceId ?? null,
        staffId: availability.staffForSlot[timeSlot],
        partySize: business.bookingType === "restaurant" ? partySize ?? 1 : null,
        cancelToken: randomUUID(),
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
    }, { isolationLevel: "Serializable" })

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
      confirmationMessage: `Votre rendez-vous est confirmé le ${date} à ${timeSlot}. À bientôt chez ${business.name} !`
    })
  } catch (err) {
    if (err instanceof Error && (err.message === "SLOT_UNAVAILABLE" || (err as { code?: string }).code === "P2034")) return NextResponse.json({ error: "Ce créneau n’est plus disponible. Proposez un autre horaire." }, { status: 409 })
    console.error("[vapi/book]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
