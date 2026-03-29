"use client"

import { useEffect, useState } from "react"
import { Building2, Users, CreditCard, CalendarDays, Mail, TrendingUp, TrendingDown, Star, ChevronDown, ChevronUp, Download, Send, ShieldCheck, ShieldOff, Activity, Bell } from "lucide-react"

interface BizStat {
  id: string; name: string; category: string; slug: string | null
  bookingEnabled: boolean; averageRating: number
  owner: { id: string; email: string; name: string | null; createdAt: string }
  subscription: { status: string; stripeCurrentPeriodEnd: string | null } | null
  totalBookings: number; totalLeads: number; totalReviews: number
  caTotal: number; createdAt: string
}

interface RecentBooking {
  id: string; clientName: string; clientEmail: string; date: string
  timeSlot: string; status: string; createdAt: string
  business: { name: string }
  service: { name: string; price: number } | null
}

interface Subscription {
  id: string; status: string; stripeCustomerId: string
  stripeSubscriptionId: string | null; stripePriceId: string | null
  stripeCurrentPeriodEnd: string | null; cancelAtPeriodEnd: boolean
  updatedAt: string
  user: { email: string; name: string | null }
}

interface AdminUser {
  id: string; email: string; name: string | null; image: string | null
  role: string; createdAt: string
  subscription: { status: string; stripeCurrentPeriodEnd: string | null; stripeCustomerId: string } | null
  _count: { businesses: number }
}

interface AdminStats {
  totalUsers: number; totalBusinesses: number; activeSubscriptions: number
  totalBookings: number; totalLeads: number
  businesses: BizStat[]
  signupsByDay: Record<string, number>
  recentBookings: RecentBooking[]
  subscriptions: Subscription[]
}

interface Lead {
  id: string; email: string; name: string | null; phone: string | null
  source: string; createdAt: string
  business: { name: string }
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  INACTIVE: "bg-slate-700 text-slate-400",
  PAST_DUE: "bg-red-500/20 text-red-400 border border-red-500/30",
  CANCELED: "bg-slate-700 text-slate-500",
  TRIALING: "bg-violet-500/20 text-violet-400 border border-violet-500/30",
}

const BOOKING_STATUS_COLOR: Record<string, string> = {
  CONFIRMED: "bg-emerald-500/20 text-emerald-400",
  PENDING: "bg-amber-500/20 text-amber-400",
  CANCELLED: "bg-slate-700 text-slate-500",
}

type Tab = "overview" | "businesses" | "subscriptions" | "users" | "leads" | "broadcast"

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [tab, setTab] = useState<Tab>("overview")
  const [expandedBiz, setExpandedBiz] = useState<string | null>(null)
  const [filterBiz, setFilterBiz] = useState("")
  const [filterUsers, setFilterUsers] = useState("")
  const [leadsFilter, setLeadsFilter] = useState("")
  const [broadcast, setBroadcast] = useState({ subject: "", message: "", target: "ALL" })
  const [broadcastStatus, setBroadcastStatus] = useState<{ sent?: number; failed?: number } | null>(null)
  const [broadcastLoading, setBroadcastLoading] = useState(false)
  const [roleLoading, setRoleLoading] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/stats").then(r => r.json()).then(setStats)
    fetch("/api/admin/users").then(r => r.json()).then(d => setUsers(d.users ?? []))
    fetch("/api/admin/leads").then(r => r.json()).then(d => setLeads(d.leads ?? []))
  }, [])

  function exportLeadsCSV(bizId?: string) {
    const url = bizId ? `/api/admin/leads?biz=${bizId}` : "/api/admin/leads"
    fetch(url).then(r => r.json()).then(d => {
      const rows = [["Email", "Nom", "Téléphone", "Source", "Établissement", "Date"]]
      for (const l of d.leads) rows.push([l.email, l.name ?? "", l.phone ?? "", l.source, l.business.name, new Date(l.createdAt).toLocaleDateString("fr-FR")])
      const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n")
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `leads${bizId ? `-${bizId}` : ""}.csv`; a.click()
    })
  }

  async function toggleRole(userId: string, currentRole: string) {
    setRoleLoading(userId)
    const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN"
    const res = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, role: newRole }) })
    if (res.ok) {
      setUsers(u => u.map(u => u.id === userId ? { ...u, role: newRole } : u))
    }
    setRoleLoading(null)
  }

  async function sendBroadcast() {
    if (!broadcast.subject || !broadcast.message) return
    setBroadcastLoading(true)
    const res = await fetch("/api/admin/broadcast", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(broadcast) })
    const data = await res.json()
    setBroadcastStatus(data)
    setBroadcastLoading(false)
  }

  if (!stats) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-slate-400 animate-pulse text-sm">Chargement…</div>
    </div>
  )

  const filteredBiz = stats.businesses.filter(b =>
    b.name.toLowerCase().includes(filterBiz.toLowerCase()) ||
    b.owner.email.toLowerCase().includes(filterBiz.toLowerCase())
  )
  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(filterUsers.toLowerCase()) ||
    (u.name ?? "").toLowerCase().includes(filterUsers.toLowerCase())
  )
  const filteredLeads = leads.filter(l =>
    l.email.toLowerCase().includes(leadsFilter.toLowerCase()) ||
    (l.name ?? "").toLowerCase().includes(leadsFilter.toLowerCase()) ||
    l.business.name.toLowerCase().includes(leadsFilter.toLowerCase())
  )

  const totalCA = stats.businesses.reduce((s, b) => s + b.caTotal, 0)
  const inactiveCount = stats.businesses.filter(b => !b.subscription || b.subscription.status !== "ACTIVE").length

  // Graphique inscriptions (30 jours)
  const signupEntries = Object.entries(stats.signupsByDay)
  const maxSignups = Math.max(...signupEntries.map(([, v]) => v), 1)

  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: "Vue globale" },
    { key: "businesses", label: `Établissements (${stats.totalBusinesses})` },
    { key: "subscriptions", label: "Abonnements" },
    { key: "users", label: `Utilisateurs (${stats.totalUsers})` },
    { key: "leads", label: `Leads (${stats.totalLeads})` },
    { key: "broadcast", label: "Broadcast" },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 px-8 py-5 flex items-center justify-between sticky top-0 bg-slate-950 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Reputix Admin</h1>
            <p className="text-xs text-slate-500">Panneau d&apos;administration</p>
          </div>
        </div>
        <button onClick={() => exportLeadsCSV()} className="flex items-center gap-2 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors">
          <Download className="w-3.5 h-3.5" /> Export leads CSV
        </button>
      </div>

      <div className="px-8 py-6 max-w-7xl mx-auto space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Utilisateurs", value: stats.totalUsers, icon: Users, color: "text-sky-400", bg: "bg-sky-500/10" },
            { label: "Établissements", value: stats.totalBusinesses, icon: Building2, color: "text-violet-400", bg: "bg-violet-500/10" },
            { label: "Abonnements actifs", value: stats.activeSubscriptions, icon: CreditCard, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Réservations", value: stats.totalBookings, icon: CalendarDays, color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "Leads collectés", value: stats.totalLeads, icon: Mail, color: "text-pink-400", bg: "bg-pink-500/10" },
          ].map(k => (
            <div key={k.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-500">{k.label}</p>
                <div className={`w-7 h-7 rounded-lg ${k.bg} flex items-center justify-center`}>
                  <k.icon className={`w-3.5 h-3.5 ${k.color}`} />
                </div>
              </div>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 flex-wrap bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${tab === t.key ? "bg-violet-500 text-white" : "text-slate-400 hover:text-slate-200"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ─── OVERVIEW ─── */}
        {tab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Graphique inscriptions */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 md:col-span-2">
              <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-sky-400" />Inscriptions (30 derniers jours)</h2>
              <div className="flex items-end gap-0.5 h-20">
                {signupEntries.map(([day, count]) => (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {count} · {day.slice(5)}
                    </div>
                    <div className="w-full rounded-sm transition-colors group-hover:bg-sky-400"
                      style={{ height: `${Math.max((count / maxSignups) * 100, 4)}%`, background: count > 0 ? "#38bdf8" : "#1e293b" }} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-slate-600">{signupEntries[0]?.[0]?.slice(5)}</span>
                <span className="text-xs text-slate-600">{signupEntries[signupEntries.length - 1]?.[0]?.slice(5)}</span>
              </div>
            </div>

            {/* Activité récente */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-amber-400" />Activité récente (7j)</h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stats.recentBookings.length === 0 && <p className="text-sm text-slate-500">Aucune réservation cette semaine</p>}
                {stats.recentBookings.map(b => (
                  <div key={b.id} className="flex items-center justify-between py-1.5 border-b border-slate-800 last:border-0">
                    <div>
                      <p className="text-sm text-white">{b.clientName} <span className="text-slate-500 font-normal text-xs">→ {b.business.name}</span></p>
                      <p className="text-xs text-slate-500">{b.date} à {b.timeSlot} · {b.service?.name ?? "RDV"}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BOOKING_STATUS_COLOR[b.status]}`}>{b.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CA + Performers */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="font-semibold text-white mb-1 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-400" />Revenus plateforme</h2>
              <p className="text-3xl font-bold text-emerald-400 mb-4">{totalCA.toFixed(0)} €</p>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">Top 5 établissements</p>
              <div className="space-y-1.5">
                {[...stats.businesses].sort((a, b) => b.caTotal - a.caTotal).slice(0, 5).map((b, i) => (
                  <div key={b.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600 w-4">{i + 1}.</span>
                      <p className="text-sm text-slate-300 truncate max-w-[140px]">{b.name}</p>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <span className="text-xs text-slate-500">{b.totalBookings} RDV</span>
                      <span className="text-sm font-bold text-emerald-400">{b.caTotal.toFixed(0)} €</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Inactifs */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 md:col-span-2">
              <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><TrendingDown className="w-4 h-4 text-red-400" />Sans abonnement actif ({inactiveCount})</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {stats.businesses.filter(b => !b.subscription || b.subscription.status !== "ACTIVE").map(b => (
                  <div key={b.id} className="bg-slate-800 rounded-lg p-3">
                    <p className="text-sm font-medium text-white truncate">{b.name}</p>
                    <p className="text-xs text-slate-400 truncate">{b.owner.email}</p>
                    <p className="text-xs text-slate-500 mt-1">{b.totalBookings} RDV · {b.totalLeads} leads</p>
                  </div>
                ))}
                {inactiveCount === 0 && <p className="text-sm text-slate-500 col-span-4">Tous les établissements ont un abonnement actif ✓</p>}
              </div>
            </div>
          </div>
        )}

        {/* ─── BUSINESSES ─── */}
        {tab === "businesses" && (
          <div className="space-y-3">
            <input value={filterBiz} onChange={e => setFilterBiz(e.target.value)} placeholder="Filtrer par nom ou email…"
              className="w-full max-w-sm px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-slate-600" />
            {filteredBiz.map(b => (
              <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button onClick={() => setExpandedBiz(expandedBiz === b.id ? null : b.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {b.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">{b.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[b.subscription?.status ?? "NONE"] ?? "bg-slate-700 text-slate-400"}`}>
                          {b.subscription?.status ?? "Pas d&apos;abo"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{b.owner.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5 shrink-0">
                    <div className="text-center hidden md:block"><p className="text-xs text-slate-500">RDV</p><p className="font-bold text-amber-400">{b.totalBookings}</p></div>
                    <div className="text-center hidden md:block"><p className="text-xs text-slate-500">Leads</p><p className="font-bold text-pink-400">{b.totalLeads}</p></div>
                    <div className="text-center hidden md:block"><p className="text-xs text-slate-500">CA</p><p className="font-bold text-emerald-400">{b.caTotal.toFixed(0)} €</p></div>
                    <div className="flex items-center gap-1 text-amber-300"><Star className="w-3.5 h-3.5" /><span className="text-sm font-medium">{b.averageRating.toFixed(1)}</span></div>
                    {expandedBiz === b.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>
                {expandedBiz === b.id && (
                  <div className="border-t border-slate-800 p-4 bg-slate-900/60 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><p className="text-slate-500 text-xs mb-1">Catégorie</p><p className="text-slate-200">{b.category}</p></div>
                    <div><p className="text-slate-500 text-xs mb-1">Réservation</p><p className="text-slate-200">{b.bookingEnabled ? "Activée" : "Désactivée"}</p></div>
                    <div><p className="text-slate-500 text-xs mb-1">Avis</p><p className="text-slate-200">{b.totalReviews}</p></div>
                    <div><p className="text-slate-500 text-xs mb-1">Slug</p><p className="text-slate-200 truncate">{b.slug ?? "—"}</p></div>
                    <div><p className="text-slate-500 text-xs mb-1">Créé le</p><p className="text-slate-200">{new Date(b.createdAt).toLocaleDateString("fr-FR")}</p></div>
                    <div><p className="text-slate-500 text-xs mb-1">Fin d&apos;abo</p><p className="text-slate-200">{b.subscription?.stripeCurrentPeriodEnd ? new Date(b.subscription.stripeCurrentPeriodEnd).toLocaleDateString("fr-FR") : "—"}</p></div>
                    <div className="col-span-2 flex items-end gap-2">
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

        {/* ─── SUBSCRIPTIONS ─── */}
        {tab === "subscriptions" && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Utilisateur</th>
                  <th className="text-left px-4 py-3">Statut</th>
                  <th className="text-left px-4 py-3">Client Stripe</th>
                  <th className="text-left px-4 py-3">Fin de période</th>
                  <th className="text-left px-4 py-3">Annulation</th>
                  <th className="text-left px-4 py-3">MAJ</th>
                </tr>
              </thead>
              <tbody>
                {stats.subscriptions.map(s => (
                  <tr key={s.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <p className="text-white text-sm">{s.user.name ?? s.user.email}</p>
                      <p className="text-slate-500 text-xs">{s.user.email}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[s.status] ?? "bg-slate-700 text-slate-400"}`}>{s.status}</span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs font-mono">{s.stripeCustomerId.slice(0, 14)}…</td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{s.stripeCurrentPeriodEnd ? new Date(s.stripeCurrentPeriodEnd).toLocaleDateString("fr-FR") : "—"}</td>
                    <td className="px-4 py-2.5 text-xs">{s.cancelAtPeriodEnd ? <span className="text-red-400">Oui</span> : <span className="text-slate-500">Non</span>}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{new Date(s.updatedAt).toLocaleDateString("fr-FR")}</td>
                  </tr>
                ))}
                {stats.subscriptions.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Aucun abonnement</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── USERS ─── */}
        {tab === "users" && (
          <div className="space-y-3">
            <input value={filterUsers} onChange={e => setFilterUsers(e.target.value)} placeholder="Filtrer par email ou nom…"
              className="w-full max-w-sm px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-slate-600" />
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Utilisateur</th>
                    <th className="text-left px-4 py-3">Rôle</th>
                    <th className="text-left px-4 py-3">Abonnement</th>
                    <th className="text-left px-4 py-3">Établissements</th>
                    <th className="text-left px-4 py-3">Inscrit le</th>
                    <th className="text-left px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {u.image
                            ? <img src={u.image} alt="" className="w-7 h-7 rounded-full" />
                            : <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-300 font-bold">{(u.name ?? u.email).charAt(0).toUpperCase()}</div>
                          }
                          <div>
                            <p className="text-white text-sm">{u.name ?? "—"}</p>
                            <p className="text-slate-500 text-xs">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === "ADMIN" ? "bg-violet-500/20 text-violet-400 border border-violet-500/30" : "bg-slate-700 text-slate-400"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[u.subscription?.status ?? "NONE"] ?? "bg-slate-700 text-slate-400"}`}>
                          {u.subscription?.status ?? "Aucun"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400">{u._count.businesses}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs">{new Date(u.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="px-4 py-2.5">
                        <button onClick={() => toggleRole(u.id, u.role)} disabled={roleLoading === u.id}
                          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors ${u.role === "ADMIN" ? "bg-slate-700 hover:bg-red-900/40 text-slate-300 hover:text-red-400" : "bg-slate-700 hover:bg-violet-900/40 text-slate-300 hover:text-violet-400"}`}>
                          {u.role === "ADMIN" ? <ShieldOff className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                          {roleLoading === u.id ? "…" : u.role === "ADMIN" ? "Retirer admin" : "Passer admin"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── LEADS ─── */}
        {tab === "leads" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input value={leadsFilter} onChange={e => setLeadsFilter(e.target.value)} placeholder="Filtrer par email, nom, établissement…"
                className="flex-1 max-w-sm px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-slate-600" />
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
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${l.source === "booking" ? "bg-sky-900/50 text-sky-300" : "bg-violet-900/50 text-violet-300"}`}>{l.source}</span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400">{l.business.name}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs">{new Date(l.createdAt).toLocaleDateString("fr-FR")}</td>
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

        {/* ─── BROADCAST ─── */}
        {tab === "broadcast" && (
          <div className="max-w-2xl space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <h2 className="font-semibold text-white flex items-center gap-2"><Bell className="w-4 h-4 text-amber-400" />Envoyer un email à tous les utilisateurs</h2>

              <div>
                <label className="text-xs text-slate-500 font-medium uppercase tracking-wide block mb-1.5">Destinataires</label>
                <select value={broadcast.target} onChange={e => setBroadcast(b => ({ ...b, target: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="ALL">Tous les utilisateurs ({stats.totalUsers})</option>
                  <option value="USER">Utilisateurs standard seulement</option>
                  <option value="ADMIN">Admins seulement</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-500 font-medium uppercase tracking-wide block mb-1.5">Sujet</label>
                <input value={broadcast.subject} onChange={e => setBroadcast(b => ({ ...b, subject: e.target.value }))}
                  placeholder="Ex: Nouvelle fonctionnalité disponible !"
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-slate-600" />
              </div>

              <div>
                <label className="text-xs text-slate-500 font-medium uppercase tracking-wide block mb-1.5">Message</label>
                <textarea value={broadcast.message} onChange={e => setBroadcast(b => ({ ...b, message: e.target.value }))}
                  rows={8} placeholder="Rédigez votre message ici…"
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-slate-600 resize-none" />
              </div>

              <button onClick={sendBroadcast} disabled={broadcastLoading || !broadcast.subject || !broadcast.message}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-medium text-white transition-colors">
                <Send className="w-4 h-4" />
                {broadcastLoading ? "Envoi en cours…" : "Envoyer"}
              </button>

              {broadcastStatus && (
                <div className={`p-3 rounded-lg text-sm ${broadcastStatus.failed ? "bg-amber-900/30 text-amber-300 border border-amber-700/30" : "bg-emerald-900/30 text-emerald-300 border border-emerald-700/30"}`}>
                  ✓ {broadcastStatus.sent} email{(broadcastStatus.sent ?? 0) > 1 ? "s" : ""} envoyé{(broadcastStatus.sent ?? 0) > 1 ? "s" : ""}
                  {(broadcastStatus.failed ?? 0) > 0 && ` · ${broadcastStatus.failed} échec(s)`}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
