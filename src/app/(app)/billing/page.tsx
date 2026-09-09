import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { BillingClient } from "./BillingClient"

export default async function BillingPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login")

  const [subscription, businessCount, user] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId: session.user.id } }),
    prisma.business.count({ where: { userId: session.user.id } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } }),
  ])

  if (user?.role === "ADMIN" && !subscription) {
    return <div className="max-w-2xl rounded-2xl border bg-white p-6"><h1 className="text-xl font-semibold">Accès administrateur</h1><p className="mt-2 text-slate-600">Les fonctionnalités sont accessibles pour les tests et la gestion du site. Aucun abonnement Stripe ni prélèvement n’est associé à cet accès.</p></div>
  }

  const isActive = subscription?.status === "ACTIVE" || subscription?.status === "TRIALING"

  return (
    <BillingClient
      isActive={isActive}
      status={subscription?.status ?? null}
      periodEnd={subscription?.stripeCurrentPeriodEnd?.toISOString() ?? null}
      cancelAtPeriodEnd={subscription?.cancelAtPeriodEnd ?? false}
      businessCount={businessCount}
    />
  )
}
