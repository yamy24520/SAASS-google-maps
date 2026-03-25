"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Star, LayoutDashboard, MessageSquare, Settings, CreditCard, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reviews", label: "Avis", icon: MessageSquare },
  { href: "/settings", label: "Paramètres", icon: Settings },
  { href: "/billing", label: "Abonnement", icon: CreditCard },
]

export function AppSidebar({ isSubscribed }: { isSubscribed: boolean }) {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200 bg-white">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl gradient-bg flex items-center justify-center shadow-md shadow-sky-500/20">
            <Star className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="font-bold text-slate-900 text-lg">Reputix</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-md shadow-sky-500/20"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
              {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
            </Link>
          )
        })}
      </nav>

      {/* Subscription badge */}
      <div className="p-4 border-t border-slate-200">
        <div className={cn(
          "rounded-xl p-3 text-xs",
          isSubscribed
            ? "bg-emerald-50 border border-emerald-200"
            : "bg-amber-50 border border-amber-200"
        )}>
          <div className={cn("font-semibold mb-0.5", isSubscribed ? "text-emerald-700" : "text-amber-700")}>
            {isSubscribed ? "✓ Pro actif" : "⚠ Abonnement inactif"}
          </div>
          <div className={cn("text-xs", isSubscribed ? "text-emerald-600" : "text-amber-600")}>
            {isSubscribed ? "Toutes les fonctionnalités actives" : "Activez votre abonnement"}
          </div>
        </div>
      </div>
    </aside>
  )
}
