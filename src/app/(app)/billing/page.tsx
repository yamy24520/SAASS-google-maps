import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { BillingClient } from "./BillingClient"

export default async function BillingPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login")

  const [subscription, businessCount] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId: session.user.id } }),
    prisma.business.count({ where: { userId: session.user.id } }),
  ])

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
