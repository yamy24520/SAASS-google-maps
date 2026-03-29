import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const APP_URL = process.env.NEXTAUTH_URL ?? "https://reputix.net"

// GET — vérifier le statut du compte connecté
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const bizId = new URL(req.url).searchParams.get("biz")
  const business = bizId
    ? await prisma.business.findFirst({ where: { id: bizId, userId: session.user.id } })
    : await prisma.business.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" } })

  if (!business) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 })

  if (!business.stripeAccountId) {
    return NextResponse.json({ connected: false })
  }

  try {
    const account = await stripe.accounts.retrieve(business.stripeAccountId)
    const active = account.charges_enabled && account.payouts_enabled
    const newStatus = active ? "active" : "pending"
    if (business.stripeAccountStatus !== newStatus) {
      await prisma.business.update({
        where: { id: business.id },
        data: { stripeAccountStatus: newStatus },
      })
    }
    return NextResponse.json({
      connected: true,
      active,
      accountId: business.stripeAccountId,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    })
  } catch {
    return NextResponse.json({ connected: false })
  }
}

// POST — créer un lien d'onboarding Stripe Connect
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { bizId } = await req.json()
  const business = bizId
    ? await prisma.business.findFirst({ where: { id: bizId, userId: session.user.id } })
    : await prisma.business.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" } })

  if (!business) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 })

  // Créer ou réutiliser le compte Stripe Connect
  let accountId = business.stripeAccountId
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "FR",
      email: session.user.email ?? undefined,
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      business_type: "individual",
      metadata: { businessId: business.id, userId: session.user.id },
    })
    accountId = account.id
    await prisma.business.update({
      where: { id: business.id },
      data: { stripeAccountId: accountId, stripeAccountStatus: "pending" },
    })
  }

  // Lien d'onboarding
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${APP_URL}/settings?biz=${business.id}&connect=refresh`,
    return_url: `${APP_URL}/settings?biz=${business.id}&connect=success`,
    type: "account_onboarding",
  })

  return NextResponse.json({ url: accountLink.url })
}
