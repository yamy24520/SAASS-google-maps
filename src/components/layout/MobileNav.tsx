"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { LayoutDashboard, CalendarDays, LayoutGrid, UserRound, MoreHorizontal, X, MessageSquare, TrendingUp, Users, Search, Sparkles, QrCode, Gift, Scissors, Settings, CreditCard, Building2, Plus, ShieldCheck, LogOut, UsersRound, Palette } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

const BOTTOM_NAV = [
  { href: "/dashboard",  label: "Accueil",       icon: LayoutDashboard },
  { href: "/bookings",   label: "Réservations",  icon: CalendarDays },
  { href: "/agenda",     label: "Agenda",         icon: LayoutGrid },
  { href: "/clients",    label: "Clients",        icon: UserRound },
]

const DRAWER_NAV = [
  { href: "/reviews",     label: "Avis",           icon: MessageSquare },
  { href: "/reputation",  label: "Réputation",      icon: TrendingUp },
  { href: "/competitors", label: "Concurrents",     icon: Users },
  { href: "/seo-local",   label: "SEO Local",       icon: Search },
  { href: "/insights",    label: "Insights IA",     icon: Sparkles },
  { href: "/qrcode",      label: "QR Code",         icon: QrCode },
  { href: "/campaigns",   label: "Campagne avis",   icon: Gift },
  { href: "/equipe",      label: "Équipe",          icon: UsersRound },
  { href: "/services",         label: "Configuration",   icon: Scissors },
  { href: "/personnalisation", label: "Apparence",       icon: Palette },
  { href: "/settings",         label: "Paramètres",      icon: Settings },
]

interface MobileNavProps {
  businesses: { id: string; name: string }[]
  isSubscribed: boolean
}

export function MobileNav({ businesses, isSubscribed }: MobileNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const isAdmin = session?.user?.role === "ADMIN"

  const activeBizId = searchParams.get("biz") ?? businesses[0]?.id ?? null
  const activeBiz = businesses.find(b => b.id === activeBizId) ?? businesses[0]

  function navHref(href: string) {
    return activeBizId ? `${href}?biz=${activeBizId}` : href
  }

  function switchBusiness(id: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("biz", id)
    router.push(`${pathname}?${params.toString()}`)
    setDrawerOpen(false)
  }

  const isMenuActive = DRAWER_NAV.some(i => pathname.startsWith(i.href)) ||
    pathname.startsWith("/admin") || pathname.startsWith("/billing")

  return (
    <>
      {/* Bottom nav bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 flex items-stretch h-16 safe-bottom">
        {BOTTOM_NAV.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={navHref(item.href)}
              className={cn("flex-1 flex flex-col items-center justify-center gap-1 transition-colors",
                active ? "text-sky-500" : "text-slate-400"
              )}>
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
        {/* Menu button */}
        <button onClick={() => setDrawerOpen(true)}
          className={cn("flex-1 flex flex-col items-center justify-center gap-1 transition-colors",
            isMenuActive ? "text-sky-500" : "text-slate-400"
          )}>
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] font-medium">Menu</span>
        </button>
      </nav>

      {/* Drawer overlay */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
              <div className="flex items-center gap-3">
                <Image src="/logo.png" alt="Reputix" width={28} height={28} className="rounded-lg" />
                <span className="font-bold text-slate-900 text-base">Menu</span>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="p-2 rounded-full bg-slate-100 text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Business switcher */}
            {businesses.length > 0 && (
              <div className="px-4 pb-3 flex-shrink-0">
                <div className="bg-slate-50 rounded-2xl p-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Établissement</p>
                  <div className="space-y-1">
                    {businesses.map(biz => (
                      <button key={biz.id} onClick={() => switchBusiness(biz.id)}
                        className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left transition-colors",
                          biz.id === activeBizId ? "bg-sky-500 text-white font-semibold" : "text-slate-700 hover:bg-white"
                        )}>
                        <Building2 className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{biz.name}</span>
                      </button>
                    ))}
                    <Link href="/onboarding/new" onClick={() => setDrawerOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-sky-600 hover:bg-white transition-colors">
                      <Plus className="w-4 h-4" />
                      Ajouter un établissement
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Nav items */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <div className="grid grid-cols-3 gap-2">
                {DRAWER_NAV.map(item => {
                  const active = pathname.startsWith(item.href)
                  return (
                    <Link key={item.href} href={navHref(item.href)} onClick={() => setDrawerOpen(false)}
                      className={cn("flex flex-col items-center gap-2 p-3 rounded-2xl text-center transition-colors",
                        active ? "bg-sky-50 text-sky-600" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                      )}>
                      <item.icon className="w-5 h-5" />
                      <span className="text-xs font-medium leading-tight">{item.label}</span>
                    </Link>
                  )
                })}

                {isAdmin && (
                  <Link href="/admin" onClick={() => setDrawerOpen(false)}
                    className={cn("flex flex-col items-center gap-2 p-3 rounded-2xl text-center transition-colors",
                      pathname.startsWith("/admin") ? "bg-violet-50 text-violet-600" : "bg-slate-50 text-slate-600"
                    )}>
                    <ShieldCheck className="w-5 h-5" />
                    <span className="text-xs font-medium">Admin</span>
                  </Link>
                )}

                {!isSubscribed && (
                  <Link href="/billing" onClick={() => setDrawerOpen(false)}
                    className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-amber-50 text-amber-600 text-center">
                    <CreditCard className="w-5 h-5" />
                    <span className="text-xs font-medium">Abonnement</span>
                  </Link>
                )}
              </div>
            </div>

            {/* User + logout */}
            <div className="flex-shrink-0 border-t border-slate-100 px-4 py-3 flex items-center gap-3 safe-bottom">
              {session?.user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.user.image} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-semibold text-sm">
                  {session?.user?.name?.charAt(0) ?? "?"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{session?.user?.name}</p>
                <p className="text-xs text-slate-400 truncate">{session?.user?.email}</p>
              </div>
              <button onClick={() => signOut({ callbackUrl: "/" })}
                className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
