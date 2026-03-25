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

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${process.env.NEXTAUTH_URL}/billing`,
  })

  return NextResponse.json({ url: portalSession.url })
}
