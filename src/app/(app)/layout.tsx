import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { AppTopbar } from "@/components/layout/AppTopbar"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login")

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  })

  const isActive = subscription?.status === "ACTIVE" || subscription?.status === "TRIALING"

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <AppSidebar isSubscribed={isActive} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppTopbar user={session.user} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {!isActive ? (
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
            children
          )}
        </main>
      </div>
    </div>
  )
}
