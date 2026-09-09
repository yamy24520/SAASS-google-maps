import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { sendBookingConfirmedClient } from "@/lib/email"
import type Stripe from "stripe"

const APP_URL = process.env.NEXTAUTH_URL ?? "https://reputix.net"

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: "Webhook signature invalide" }, { status: 400 })
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session

      // ── Paiement réservation (bookingId dans metadata) ──
      if (session.metadata?.bookingId) {
        if (session.payment_status !== "paid") break
        const bookingId = session.metadata.bookingId
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
          include: {
            business: { select: { name: true, user: { select: { email: true } } } },
            service: { select: { name: true, duration: true, price: true } },
          },
        })
        if (booking && booking.paymentIntentId === session.id && session.amount_total === Math.round((booking.depositAmount ?? 0) * 100)) {
          const claimed = await prisma.booking.updateMany({
            where: { id: bookingId, paymentIntentId: session.id, paymentStatus: "PENDING" },
            data: { ...(booking.status === "CANCELLED" ? {} : { status: "CONFIRMED" }), paymentStatus: "PAID" },
          })
          if (!claimed.count || booking.status === "CANCELLED") break

          const dateLabel = new Date(booking.date + "T12:00:00").toLocaleDateString("fr-FR", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          })
          const cancelUrl = booking.cancelToken ? `${APP_URL}/cancel/${booking.cancelToken}` : undefined

          await sendBookingConfirmedClient({
            clientEmail: booking.clientEmail,
            clientName: booking.clientName,
            businessName: booking.business.name,
            serviceName: booking.service?.name ?? "Réservation",
            date: dateLabel,
            timeSlot: booking.timeSlot,
            duration: booking.service?.duration ?? 0,
            price: booking.service?.price ?? 0,
            cancelUrl,
          }).catch(() => null)
        }
        break
      }

      // ── Abonnement Reputix ──
      const userId = session.metadata?.userId
      if (!userId || !session.subscription) break

      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
      const periodEnd = subscription.items.data[0]?.current_period_end

      await prisma.subscription.upsert({
        where: { stripeCustomerId: session.customer as string },
        create: {
          userId,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscription.id,
          stripePriceId: subscription.items.data[0].price.id,
          stripeCurrentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
          status: mapStatus(subscription.status),
        },
        update: {
          stripeSubscriptionId: subscription.id,
          stripePriceId: subscription.items.data[0].price.id,
          stripeCurrentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
          status: mapStatus(subscription.status),
        },
      })
      break
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription
      const updatedPeriodEnd = subscription.items.data[0]?.current_period_end
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: mapStatus(subscription.status),
          stripeCurrentPeriodEnd: updatedPeriodEnd ? new Date(updatedPeriodEnd * 1000) : null,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      })
      break
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: { status: "CANCELED" },
      })
      break
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice
      const invoiceSubscription = invoice.parent?.subscription_details?.subscription
      if (invoiceSubscription) {
        const invoiceSub = typeof invoiceSubscription === "string" ? invoiceSubscription : invoiceSubscription.id
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: invoiceSub as string },
          data: { status: "PAST_DUE" },
        })
      }
      break
    }

    case "account.updated": {
      const account = event.data.object as Stripe.Account
      const active = account.charges_enabled && account.payouts_enabled
      await prisma.business.updateMany({
        where: { stripeAccountId: account.id },
        data: { stripeAccountStatus: active ? "active" : "pending" },
      })
      break
    }
  }

  return NextResponse.json({ received: true })
}

function mapStatus(status: string): "ACTIVE" | "INACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING" {
  const map: Record<string, "ACTIVE" | "INACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING"> = {
    active: "ACTIVE",
    trialing: "TRIALING",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    unpaid: "PAST_DUE",
    incomplete: "INACTIVE",
    incomplete_expired: "CANCELED",
    paused: "INACTIVE",
  }
  return map[status] ?? "INACTIVE"
}
