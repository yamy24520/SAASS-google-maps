import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { stripe, STRIPE_PRICE_ID } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 })

  let customerId: string

  const existing = await prisma.subscription.findUnique({ where: { userId: user.id } })
  if (existing?.stripeCustomerId) {
    customerId = existing.stripeCustomerId
  } else {
    const customer = await stripe.customers.create({
      email: user.email!,
      name: user.name ?? undefined,
      metadata: { userId: user.id },
    })
    customerId = customer.id
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://reputix.net"

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${appUrl}/onboarding?success=true`,
      cancel_url: `${appUrl}/billing`,
      subscription_data: { trial_period_days: 14 },
      locale: "fr",
      metadata: { userId: user.id },
    })
    return NextResponse.json({ url: checkoutSession.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur Stripe inconnue"
    console.error("Stripe checkout error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
