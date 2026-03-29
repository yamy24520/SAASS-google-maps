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
        const bookingId = session.metadata.bookingId
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
          include: {
            business: { select: { name: true, user: { select: { email: true } } } },
            service: { select: { name: true, duration: true, price: true } },
          },
        })
        if (booking) {
          await prisma.booking.update({
            where: { id: bookingId },
            data: { status: "CONFIRMED", paymentStatus: "PAID" },
          })

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sub = subscription as any

      await prisma.subscription.upsert({
        where: { stripeCustomerId: session.customer as string },
        create: {
          userId,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscription.id,
          stripePriceId: subscription.items.data[0].price.id,
          stripeCurrentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
          status: subscription.status === "trialing" ? "TRIALING" : "ACTIVE",
        },
        update: {
          stripeSubscriptionId: subscription.id,
          stripePriceId: subscription.items.data[0].price.id,
          stripeCurrentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
          status: subscription.status === "trialing" ? "TRIALING" : "ACTIVE",
        },
      })
      break
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedSub = subscription as any
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: mapStatus(subscription.status),
          stripeCurrentPeriodEnd: updatedSub.current_period_end ? new Date(updatedSub.current_period_end * 1000) : null,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invoice = event.data.object as any
      if (invoice.subscription) {
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: invoice.subscription as string },
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
