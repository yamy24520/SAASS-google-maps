import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const subscription = await prisma.subscription.findUnique({ where: { userId: session.user.id } })
  if (!subscription?.stripeCustomerId) {
    return NextResponse.json({ error: "Aucun abonnement trouvé" }, { status: 404 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://reputix-zeta.vercel.app"

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${appUrl}/billing`,
    })
    return NextResponse.json({ url: portalSession.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur Stripe inconnue"
    console.error("Stripe portal error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
