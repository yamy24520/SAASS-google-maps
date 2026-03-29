"use client"

import { useEffect, useState } from "react"
import { Building2, Users, CreditCard, CalendarDays, Mail, TrendingUp, TrendingDown, Star, ChevronDown, ChevronUp, Download } from "lucide-react"

interface BizStat {
  id: string; name: string; category: string; slug: string | null
  bookingEnabled: boolean
  owner: { email: string; name: string | null; createdAt: string }
  subscription: { status: string; stripeCurrentPeriodEnd: string | null } | null
  totalBookings: number; totalLeads: number; totalReviews: number
  averageRating: number; caTotal: number; createdAt: string
}

interface AdminStats {
  totalUsers: number; totalBusinesses: number; activeSubscriptions: number
  totalBookings: number; totalLeads: number
  businesses: BizStat[]
}

interface Lead {
  id: string; email: string; name: string | null; phone: string | null
  source: string; createdAt: string
  business: { name: string }
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  INACTIVE: "bg-slate-100 text-slate-500",
  PAST_DUE: "bg-red-100 text-red-600",
  CANCELED: "bg-slate-100 text-slate-400",
  TRIALING: "bg-violet-100 text-violet-700",
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [tab, setTab] = useState<"overview" | "businesses" | "leads">("overview")
  const [expandedBiz, setExpandedBiz] = useState<string | null>(null)
  const [filterBiz, setFilterBiz] = useState("")
  const [leadsFilter, setLeadsFilter] = useState("")

  useEffect(() => {
    fetch("/api/admin/stats").then(r => r.json()).then(setStats)
    fetch("/api/admin/leads").then(r => r.json()).then(d => setLeads(d.leads ?? []))
  }, [])

  function exportLeadsCSV(bizId?: string) {
    const url = bizId ? `/api/admin/leads?biz=${bizId}` : "/api/admin/leads"
    fetch(url).then(r => r.json()).then(d => {
      const rows = [["Email", "Nom", "Téléphone", "Source", "Établissement", "Date"]]
      for (const l of d.leads) {
        rows.push([l.email, l.name ?? "", l.phone ?? "", l.source, l.business.name, new Date(l.createdAt).toLocaleDateString("fr-FR")])
      }
      const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n")
      const a = document.createElement("a")
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
      a.download = `leads${bizId ? `-${bizId}` : ""}.csv`
      a.click()
    })
  }

  if (!stats) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-slate-400 animate-pulse">Chargement…</div>
    </div>
  )

  const filteredBiz = stats.businesses.filter(b =>
    b.name.toLowerCase().includes(filterBiz.toLowerCase()) ||
    b.owner.email.toLowerCase().includes(filterBiz.toLowerCase())
  )

  const filteredLeads = leads.filter(l =>
    l.email.toLowerCase().includes(leadsFilter.toLowerCase()) ||
    (l.name ?? "").toLowerCase().includes(leadsFilter.toLowerCase()) ||
    l.business.name.toLowerCase().includes(leadsFilter.toLowerCase())
  )

  const activeCount = stats.businesses.filter(b => b.subscription?.status === "ACTIVE").length
  const inactiveCount = stats.businesses.filter(b => !b.subscription || b.subscription.status !== "ACTIVE").length
  const totalCA = stats.businesses.reduce((s, b) => s + b.caTotal, 0)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Reputix Admin</h1>
          <p className="text-xs text-slate-500 mt-0.5">Panneau d&apos;administration</p>
        </div>
        <button onClick={() => exportLeadsCSV()} className="flex items-center gap-2 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors">
          <Download className="w-3.5 h-3.5" /> Exporter tous les leads
        </button>
      </div>

      <div className="px-8 py-6 max-w-7xl mx-auto space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Utilisateurs", value: stats.totalUsers, icon: Users, color: "text-sky-400" },
            { label: "Établissements", value: stats.totalBusinesses, icon: Building2, color: "text-violet-400" },
            { label: "Abonnements actifs", value: stats.activeSubscriptions, icon: CreditCard, color: "text-emerald-400" },
            { label: "Réservations totales", value: stats.totalBookings, icon: CalendarDays, color: "text-amber-400" },
            { label: "Leads collectés", value: stats.totalLeads, icon: Mail, color: "text-pink-400" },
          ].map(k => (
            <div key={k.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500">{k.label}</p>
                <k.icon className={`w-4 h-4 ${k.color}`} />
              </div>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
          {(["overview", "businesses", "leads"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${tab === t ? "bg-sky-500 text-white" : "text-slate-400 hover:text-slate-200"}`}>
              {t === "overview" ? "Vue globale" : t === "businesses" ? "Établissements" : "Leads"}
            </button>
          ))}
        </div>

        {/* ─── OVERVIEW ─── */}
        {tab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Abonnements */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4 text-emerald-400" />Abonnements</h2>
              <div className="space-y-2">
                {Object.entries(
                  stats.businesses.reduce<Record<string, number>>((acc, b) => {
                    const s = b.subscription?.status ?? "NONE"
                    acc[s] = (acc[s] ?? 0) + 1
                    return acc
                  }, {})
                ).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[status] ?? "bg-slate-700 text-slate-300"}`}>{status}</span>
                    <span className="text-sm font-bold text-white">{count}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800">
                <p className="text-xs text-slate-500">CA total généré (RDV confirmés)</p>
                <p className="text-xl font-bold text-emerald-400 mt-1">{totalCA.toFixed(0)} €</p>
              </div>
            </div>

            {/* Performers */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-amber-400" />Top établissements</h2>
              <div className="space-y-2">
                {[...stats.businesses].sort((a, b) => b.totalBookings - a.totalBookings).slice(0, 5).map(b => (
                  <div key={b.id} className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium text-white">{b.name}</p>
                      <p className="text-xs text-slate-500">{b.owner.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-amber-400">{b.totalBookings} RDV</p>
                      <p className="text-xs text-slate-500">{b.caTotal.toFixed(0)} €</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Inactifs */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 md:col-span-2">
              <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><TrendingDown className="w-4 h-4 text-red-400" />Sans abonnement actif ({inactiveCount})</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {stats.businesses.filter(b => !b.subscription || b.subscription.status !== "ACTIVE").map(b => (
                  <div key={b.id} className="bg-slate-800 rounded-lg p-3">
                    <p className="text-sm font-medium text-white truncate">{b.name}</p>
                    <p className="text-xs text-slate-400 truncate">{b.owner.email}</p>
                    <p className="text-xs text-slate-500 mt-1">{b.totalBookings} RDV · {b.totalLeads} leads</p>
                  </div>
                ))}
                {inactiveCount === 0 && <p className="text-sm text-slate-500">Tous les établissements ont un abonnement actif</p>}
              </div>
            </div>
          </div>
        )}

        {/* ─── BUSINESSES ─── */}
        {tab === "businesses" && (
          <div className="space-y-3">
            <input value={filterBiz} onChange={e => setFilterBiz(e.target.value)} placeholder="Filtrer par nom ou email…"
              className="w-full max-w-sm px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-600" />

            {filteredBiz.map(b => (
              <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button onClick={() => setExpandedBiz(expandedBiz === b.id ? null : b.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                      {b.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">{b.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[b.subscription?.status ?? "NONE"] ?? "bg-slate-700 text-slate-400"}`}>
                          {b.subscription?.status ?? "Pas d'abo"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{b.owner.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-right">
                    <div><p className="text-xs text-slate-500">RDV</p><p className="font-bold text-amber-400">{b.totalBookings}</p></div>
                    <div><p className="text-xs text-slate-500">Leads</p><p className="font-bold text-pink-400">{b.totalLeads}</p></div>
                    <div><p className="text-xs text-slate-500">CA</p><p className="font-bold text-emerald-400">{b.caTotal.toFixed(0)} €</p></div>
                    <div className="flex items-center gap-1 text-amber-300">
                      <Star className="w-3.5 h-3.5" />
                      <span className="text-sm font-medium">{b.averageRating.toFixed(1)}</span>
                    </div>
                    {expandedBiz === b.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {expandedBiz === b.id && (
                  <div className="border-t border-slate-800 p-4 bg-slate-900/60 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><p className="text-slate-500 text-xs mb-1">Catégorie</p><p className="text-slate-200">{b.category}</p></div>
                    <div><p className="text-slate-500 text-xs mb-1">Réservation</p><p className="text-slate-200">{b.bookingEnabled ? "Activée" : "Désactivée"}</p></div>
                    <div><p className="text-slate-500 text-xs mb-1">Avis</p><p className="text-slate-200">{b.totalReviews}</p></div>
                    <div><p className="text-slate-500 text-xs mb-1">Slug page</p><p className="text-slate-200 truncate">{b.slug ?? "—"}</p></div>
                    <div><p className="text-slate-500 text-xs mb-1">Créé le</p><p className="text-slate-200">{new Date(b.createdAt).toLocaleDateString("fr-FR")}</p></div>
                    <div><p className="text-slate-500 text-xs mb-1">Fin d&apos;abo</p><p className="text-slate-200">{b.subscription?.stripeCurrentPeriodEnd ? new Date(b.subscription.stripeCurrentPeriodEnd).toLocaleDateString("fr-FR") : "—"}</p></div>
                    <div className="col-span-2 flex items-end">
                      <button onClick={() => exportLeadsCSV(b.id)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors">
                        <Download className="w-3 h-3" /> Leads CSV
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ─── LEADS ─── */}
        {tab === "leads" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input value={leadsFilter} onChange={e => setLeadsFilter(e.target.value)} placeholder="Filtrer par email, nom, établissement…"
                className="flex-1 max-w-sm px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-600" />
              <span className="text-xs text-slate-500">{filteredLeads.length} lead{filteredLeads.length > 1 ? "s" : ""}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Email</th>
                    <th className="text-left px-4 py-3">Nom</th>
                    <th className="text-left px-4 py-3">Téléphone</th>
                    <th className="text-left px-4 py-3">Source</th>
                    <th className="text-left px-4 py-3">Établissement</th>
                    <th className="text-left px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map(l => (
                    <tr key={l.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-2.5 text-sky-400">{l.email}</td>
                      <td className="px-4 py-2.5 text-slate-300">{l.name ?? "—"}</td>
                      <td className="px-4 py-2.5 text-slate-400">{l.phone ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${l.source === "booking" ? "bg-sky-900 text-sky-300" : "bg-violet-900 text-violet-300"}`}>
                          {l.source}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400">{l.business.name}</td>
                      <td className="px-4 py-2.5 text-slate-500">{new Date(l.createdAt).toLocaleDateString("fr-FR")}</td>
                    </tr>
                  ))}
                  {filteredLeads.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Aucun lead trouvé</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
