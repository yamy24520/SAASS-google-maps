import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardClient } from "./DashboardClient"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login")

  const business = await prisma.business.findUnique({ where: { userId: session.user.id } })

  // If no business yet, redirect to onboarding
  if (!business) redirect("/onboarding")

  return <DashboardClient />
}
