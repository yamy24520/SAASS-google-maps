"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { LayoutDashboard, MessageSquare, Settings, CreditCard, ChevronRight, Building2, Plus, ChevronDown, TrendingUp, Users, Search, QrCode, Sparkles, Gift } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reviews", label: "Avis", icon: MessageSquare },
  { href: "/reputation", label: "Réputation", icon: TrendingUp },
  { href: "/competitors", label: "Concurrents", icon: Users },
  { href: "/seo-local", label: "SEO Local", icon: Search },
  { href: "/insights", label: "Insights IA", icon: Sparkles },
  { href: "/qrcode", label: "QR Code", icon: QrCode },
  { href: "/campaigns", label: "Campagne avis", icon: Gift },
  { href: "/settings", label: "Paramètres", icon: Settings },
]

interface Business {
  id: string
  name: string
}

interface AppSidebarProps {
  isSubscribed: boolean
  businesses: Business[]
}

export function AppSidebar({ isSubscribed, businesses }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showBusinessMenu, setShowBusinessMenu] = useState(false)

  const activeBizId = searchParams.get("biz") ?? businesses[0]?.id ?? null
  const activeBiz = businesses.find((b) => b.id === activeBizId) ?? businesses[0]

  function switchBusiness(id: string) {
    setShowBusinessMenu(false)
    const params = new URLSearchParams(searchParams.toString())
    params.set("biz", id)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200 bg-white">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200">
        <Link href="/dashboard" className="flex items-center">
          <Image src="/logo.png" alt="Reputix" width={80} height={80} className="rounded-xl" />
        </Link>
      </div>

      {/* Business selector */}
      {businesses.length > 0 && (
        <div className="px-4 pt-4 relative">
          <button
            onClick={() => setShowBusinessMenu(!showBusinessMenu)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors text-left"
          >
            <Building2 className="w-4 h-4 text-sky-500 flex-shrink-0" />
            <span className="flex-1 text-sm font-medium text-slate-700 truncate">
              {activeBiz?.name ?? "Établissement"}
            </span>
            <ChevronDown className={cn("w-3 h-3 text-slate-400 transition-transform", showBusinessMenu && "rotate-180")} />
          </button>

          {showBusinessMenu && (
            <div className="absolute left-4 right-4 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
              {businesses.map((biz) => (
                <button
                  key={biz.id}
                  onClick={() => switchBusiness(biz.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors text-left",
                    biz.id === activeBizId
                      ? "bg-sky-50 text-sky-700 font-medium"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{biz.name}</span>
                </button>
              ))}
              <div className="border-t border-slate-100">
                <Link
                  href="/onboarding/new"
                  onClick={() => setShowBusinessMenu(false)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-sky-600 hover:bg-sky-50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter un établissement
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const href = activeBizId ? `${item.href}?biz=${activeBizId}` : item.href
          return (
            <Link
              key={item.href}
              href={href}
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

        {/* Billing séparé */}
        {!isSubscribed && (
          <Link
            href="/billing"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 mt-2",
              pathname.startsWith("/billing")
                ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-md shadow-sky-500/20"
                : "text-amber-600 hover:bg-amber-50"
            )}
          >
            <CreditCard className="w-4 h-4 flex-shrink-0" />
            Abonnement
            {pathname.startsWith("/billing") && <ChevronRight className="w-3 h-3 ml-auto" />}
          </Link>
        )}
      </nav>

      {/* Subscription badge */}
      <div className="p-4 border-t border-slate-200">
        {isSubscribed ? (
          <div className="rounded-xl p-3 text-xs bg-emerald-50 border border-emerald-200">
            <div className="font-semibold mb-0.5 text-emerald-700">✓ Pro actif</div>
            <div className="text-emerald-600">
              {businesses.length} établissement{businesses.length > 1 ? "s" : ""}
            </div>
          </div>
        ) : (
          <Link href="/billing" className="block rounded-xl p-3 text-xs bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors">
            <div className="font-semibold mb-0.5 text-amber-700">⚠ Abonnement inactif</div>
            <div className="text-amber-600">Activez votre abonnement</div>
          </Link>
        )}
      </div>
    </aside>
  )
}
