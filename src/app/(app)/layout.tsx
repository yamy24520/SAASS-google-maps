import { Suspense } from "react"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { AppTopbar } from "@/components/layout/AppTopbar"
import { MobileNav } from "@/components/layout/MobileNav"
import { PushNotificationBanner } from "@/components/PushNotificationBanner"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login")

  const [subscription, businesses] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId: session.user.id } }),
    prisma.business.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
  ])

  const isActive = subscription?.status === "ACTIVE" || subscription?.status === "TRIALING"

  const headersList = await headers()
  const pathname = headersList.get("x-pathname") ?? ""
  const isBillingPage = pathname === "/billing" || pathname.startsWith("/billing")

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <AppSidebar isSubscribed={isActive} businesses={businesses} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppTopbar user={session.user} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 pb-20 lg:pb-8">
          {!isActive && !isBillingPage ? (
            <div className="max-w-2xl mx-auto mt-8">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
                <p className="font-semibold text-amber-800 mb-2">Abonnement inactif</p>
                <p className="text-sm text-amber-700 mb-4">Activez votre abonnement pour accéder à toutes les fonctionnalités.</p>
                <a href="/billing" className="inline-flex items-center gap-2 bg-gradient-to-r from-sky-500 to-cyan-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
                  Activer mon abonnement →
                </a>
              </div>
            </div>
          ) : (
            <>
              <PushNotificationBanner />
              {children}
            </>
          )}
        </main>
      </div>
      <Suspense fallback={null}>
        <MobileNav businesses={businesses} isSubscribed={isActive} />
      </Suspense>
    </div>
  )
}
