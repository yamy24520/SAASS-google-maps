import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const APP_URL = process.env.NEXTAUTH_URL ?? "https://reputix.net"

export async function POST(req: NextRequest) {
  const { bookingId } = await req.json()
  if (!bookingId) return NextResponse.json({ error: "bookingId requis" }, { status: 400 })

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      business: { select: { id: true, name: true, stripeAccountId: true, bookingSettings: true } },
      service: { select: { name: true, price: true, duration: true } },
    },
  })

  if (!booking) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 })
  if (!booking.business.stripeAccountId) return NextResponse.json({ error: "Paiement non configuré" }, { status: 400 })

  const settings = (booking.business.bookingSettings ?? {}) as Record<string, unknown>
  const depositType = (settings.depositType as string) ?? "full"
  const depositValue = (settings.depositValue as number) ?? 100
  const servicePrice = booking.service?.price ?? 0

  let amount = 0
  if (depositType === "percent") {
    amount = Math.round((servicePrice * depositValue) / 100 * 100) // en centimes
  } else if (depositType === "fixed") {
    amount = Math.round(depositValue * 100)
  } else {
    amount = Math.round(servicePrice * 100)
  }

  if (amount < 50) return NextResponse.json({ error: "Montant trop faible (min 0,50 €)" }, { status: 400 })

  const dateLabel = new Date(booking.date + "T12:00:00").toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  })

  // Commission plateforme Reputix : 1.5%
  const platformFee = Math.round(amount * 0.015)

  const checkoutSession = await stripe.checkout.sessions.create(
    {
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: booking.clientEmail,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: booking.service?.name ?? `Réservation — ${booking.business.name}`,
              description: `${dateLabel} à ${booking.timeSlot}${depositType !== "full" ? ` (${depositType === "percent" ? `acompte ${depositValue}%` : `acompte ${depositValue} €`})` : ""}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(platformFee > 0 ? { application_fee_amount: platformFee } as any : {}),
      success_url: `${APP_URL}/book/success?booking=${bookingId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/book/cancel?booking=${bookingId}`,
      metadata: { bookingId: booking.id, businessId: booking.businessId },
    },
    { stripeAccount: booking.business.stripeAccountId }
  )

  // Mettre à jour le booking avec le session ID et le montant
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      paymentStatus: "PENDING",
      paymentIntentId: checkoutSession.id,
      depositAmount: amount / 100,
    },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
