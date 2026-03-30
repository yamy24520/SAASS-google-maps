"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useSearchParams } from "next/navigation"
import {
  Mail, Phone, CalendarDays, Search, User, TrendingUp,
  X, Save, Star, Tag, AlertCircle, MessageSquare, Loader2
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toaster"

interface Booking {
  id: string; date: string; timeSlot: string; status: string
  service: { name: string; price: number; duration: number } | null
  staff: { id: string; name: string; color: string } | null
}

interface Client {
  email: string; name: string; phone: string | null
  bookings: Booking[]; totalSpent: number; lastVisit: string | null
}

interface ClientProfile {
  notes: string | null
  allergies: string | null
  preferences: string | null
  tags: string[] | null
  vip: boolean
  smsOptIn: boolean
  favoriteStaffId: string | null
  favoriteStaff: { id: string; name: string; color: string } | null
}

interface StaffOption { id: string; name: string; color: string }

function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-100",
  PENDING: "bg-amber-50 text-amber-700 border-amber-100",
  CANCELLED: "bg-slate-50 text-slate-400 border-slate-100",
}
const STATUS_LABELS: Record<string, string> = { CONFIRMED: "Confirmé", PENDING: "En attente", CANCELLED: "Annulé" }

export default function ClientsPage() {
  const searchParams = useSearchParams()
  const bizId = searchParams.get("biz")
  const bizParam = bizId ? `?biz=${bizId}` : ""

  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Panel state
  const [panelClient, setPanelClient] = useState<Client | null>(null)
  const [profile, setProfile] = useState<ClientProfile | null>(null)
  const [staffList, setStaffList] = useState<StaffOption[]>([])
  const [panelBookings, setPanelBookings] = useState<Booking[]>([])
  const [panelTab, setPanelTab] = useState<"infos" | "notes" | "historique">("infos")
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tagInput, setTagInput] = useState("")

  // Editable fields
  const [notes, setNotes] = useState("")
  const [allergies, setAllergies] = useState("")
  const [preferences, setPreferences] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [vip, setVip] = useState(false)
  const [smsOptIn, setSmsOptIn] = useState(false)
  const [favoriteStaffId, setFavoriteStaffId] = useState<string>("")

  const fetchClients = useCallback(async () => {
    const res = await fetch(`/api/bookings${bizParam}`)
    const data = await res.json()
    const bookings: (Booking & { clientName: string; clientEmail: string; clientPhone: string | null })[] = data.bookings ?? []

    const map = new Map<string, Client>()
    for (const b of bookings) {
      if (!map.has(b.clientEmail)) {
        map.set(b.clientEmail, { email: b.clientEmail, name: b.clientName, phone: b.clientPhone, bookings: [], totalSpent: 0, lastVisit: null })
      }
      const c = map.get(b.clientEmail)!
      c.bookings.push(b)
      if (b.status !== "CANCELLED") c.totalSpent += b.service?.price ?? 0
      if (b.status === "CONFIRMED" && (!c.lastVisit || b.date > c.lastVisit)) c.lastVisit = b.date
    }

    const sorted = Array.from(map.values()).sort((a, b) => (b.lastVisit ?? "").localeCompare(a.lastVisit ?? ""))
    setClients(sorted)
    setLoading(false)
  }, [bizParam])

  useEffect(() => { fetchClients() }, [fetchClients])

  function handleSearch(val: string) {
    setSearch(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 300)
  }

  async function openPanel(client: Client) {
    setPanelClient(client)
    setPanelTab("infos")
    setLoadingProfile(true)
    const res = await fetch(`/api/clients/${encodeURIComponent(client.email)}${bizParam}`)
    const data = await res.json()
    setProfile(data.profile)
    setPanelBookings(data.bookings ?? [])
    setStaffList(data.staffList ?? [])
    // Init editable fields
    const p = data.profile
    setNotes(p?.notes ?? "")
    setAllergies(p?.allergies ?? "")
    setPreferences(p?.preferences ?? "")
    setTags(p?.tags ?? [])
    setVip(p?.vip ?? false)
    setSmsOptIn(p?.smsOptIn ?? false)
    setFavoriteStaffId(p?.favoriteStaffId ?? "")
    setLoadingProfile(false)
  }

  function closePanel() {
    setPanelClient(null)
    setProfile(null)
  }

  async function handleSave() {
    if (!panelClient) return
    setSaving(true)
    const res = await fetch(`/api/clients/${encodeURIComponent(panelClient.email)}${bizParam}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes, allergies, preferences, tags, vip, smsOptIn, favoriteStaffId: favoriteStaffId || null }),
    })
    if (res.ok) {
      const data = await res.json()
      setProfile(data.profile)
      toast({ title: "Profil mis à jour", variant: "success" })
    } else {
      toast({ title: "Erreur", variant: "destructive" })
    }
    setSaving(false)
  }

  function addTag() {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) setTags([...tags, t])
    setTagInput("")
  }

  const q = debouncedSearch.toLowerCase()
  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.email.toLowerCase().includes(q) ||
    (c.phone ?? "").includes(debouncedSearch)
  )

  const totalRevenue = clients.reduce((s, c) => s + c.totalSpent, 0)
  const totalBookingsCount = clients.reduce((s, c) => s + c.bookings.filter(b => b.status !== "CANCELLED").length, 0)

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-40 bg-slate-200 rounded-xl" />
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-slate-200" />)}
      </div>
      <div className="h-10 rounded-xl bg-slate-200" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 rounded-xl bg-white border border-slate-100 flex items-center gap-3 px-4">
          <div className="w-9 h-9 rounded-full bg-slate-200 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-32 bg-slate-200 rounded" />
            <div className="h-3 w-48 bg-slate-100 rounded" />
          </div>
          <div className="h-4 w-12 bg-slate-200 rounded" />
        </div>
      ))}
    </div>
  )

  return (
    <div className="flex gap-6 h-full min-h-0">
      {/* ── Liste clients ── */}
      <div className={`flex flex-col gap-4 min-w-0 transition-all ${panelClient ? "w-[400px] flex-shrink-0" : "flex-1"}`}>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-slate-500 text-sm mt-0.5">{clients.length} client{clients.length > 1 ? "s" : ""} au total</p>
        </div>

        {clients.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-slate-100">
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{clients.length}</p>
                <p className="text-xs text-slate-500 mt-0.5">Clients</p>
              </CardContent>
            </Card>
            <Card className="border-slate-100">
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{totalRevenue.toFixed(0)} €</p>
                <p className="text-xs text-slate-500 mt-0.5">CA total</p>
              </CardContent>
            </Card>
            <Card className="border-slate-100">
              <CardContent className="pt-4 pb-4 text-center flex flex-col items-center">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-sky-500" />
                  <p className="text-2xl font-bold text-slate-900">{totalBookingsCount}</p>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">RDV totaux</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => handleSearch(e.target.value)} placeholder="Rechercher un client…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white" />
        </div>

        {filtered.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <User className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Aucun client trouvé</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-1.5 overflow-y-auto flex-1">
            {filtered.map(client => {
              const nb = client.bookings.filter(b => b.status !== "CANCELLED").length
              const isActive = panelClient?.email === client.email
              return (
                <button key={client.email} onClick={() => isActive ? closePanel() : openPanel(client)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${isActive ? "border-sky-500 bg-sky-50" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"}`}>
                  <div className="flex items-center gap-3">
                    <div className="relative w-9 h-9 flex-shrink-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900 text-sm truncate">{client.name}</p>
                        <span className="text-xs font-semibold text-emerald-600 flex-shrink-0">{client.totalSpent.toFixed(0)} €</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-slate-400 flex items-center gap-1"><CalendarDays className="w-3 h-3" />{nb} RDV</span>
                        {client.lastVisit && <span className="text-xs text-slate-400">Dernière : {formatDate(client.lastVisit)}</span>}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Panel latéral enrichi ── */}
      {panelClient && (
        <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center text-white font-bold">
                {panelClient.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900">{panelClient.name}</p>
                  {vip && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">⭐ VIP</span>}
                </div>
                <p className="text-xs text-slate-500">{panelClient.email}</p>
              </div>
            </div>
            <button onClick={closePanel} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-100 flex-shrink-0">
            {(["infos", "notes", "historique"] as const).map(t => (
              <button key={t} onClick={() => setPanelTab(t)}
                className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${panelTab === t ? "text-sky-600 border-b-2 border-sky-500" : "text-slate-500 hover:text-slate-700"}`}>
                {t === "infos" ? "Infos & Tags" : t === "notes" ? "Notes privées" : "Historique"}
              </button>
            ))}
          </div>

          {loadingProfile ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* ── Onglet Infos ── */}
              {panelTab === "infos" && (
                <div className="space-y-5">
                  {/* Contact */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact</p>
                    <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span>{panelClient.email}</span>
                      </div>
                      {panelClient.phone && (
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span>{panelClient.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* VIP + SMS opt-in */}
                  <div className="flex gap-3">
                    <button onClick={() => setVip(!vip)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${vip ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-white border-slate-200 text-slate-500 hover:border-amber-200"}`}>
                      <Star className={`w-4 h-4 ${vip ? "fill-amber-400 text-amber-400" : ""}`} />
                      Client VIP
                    </button>
                    <button onClick={() => setSmsOptIn(!smsOptIn)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${smsOptIn ? "bg-sky-50 border-sky-200 text-sky-700" : "bg-white border-slate-200 text-slate-500 hover:border-sky-200"}`}>
                      <Phone className="w-4 h-4" />
                      SMS rappels {smsOptIn ? "✓" : ""}
                    </button>
                  </div>

                  {/* Staff favori */}
                  {staffList.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Prestataire favori</p>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setFavoriteStaffId("")}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${!favoriteStaffId ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"}`}>
                          Aucun
                        </button>
                        {staffList.map(s => (
                          <button key={s.id} onClick={() => setFavoriteStaffId(s.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${favoriteStaffId === s.id ? "text-white border-0" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}
                            style={favoriteStaffId === s.id ? { background: s.color } : {}}>
                            <span className="w-2 h-2 rounded-full" style={{ background: favoriteStaffId === s.id ? "rgba(255,255,255,0.5)" : s.color }} />
                            {s.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" /> Tags
                    </p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                          {tag}
                          <button onClick={() => setTags(tags.filter(t => t !== tag))} className="text-slate-400 hover:text-red-500 ml-0.5">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())}
                        placeholder="Ajouter un tag…"
                        className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-400" />
                      <button onClick={addTag} className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg font-medium text-slate-600 transition-colors">
                        + Ajouter
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Onglet Notes ── */}
              {panelTab === "notes" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <MessageSquare className="w-3.5 h-3.5" /> Notes privées
                    </label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
                      placeholder="Notes internes sur ce client…"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400" /> Allergies
                    </label>
                    <textarea value={allergies} onChange={e => setAllergies(e.target.value)} rows={2}
                      placeholder="Allergies connues…"
                      className="w-full px-3 py-2.5 text-sm border border-red-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300 resize-none bg-red-50/40" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">Préférences</label>
                    <textarea value={preferences} onChange={e => setPreferences(e.target.value)} rows={3}
                      placeholder="Préférences de service, habitudes…"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none" />
                  </div>
                </div>
              )}

              {/* ── Onglet Historique ── */}
              {panelTab === "historique" && (
                <div className="space-y-2">
                  {panelBookings.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">Aucun RDV</p>
                  ) : panelBookings.map(b => (
                    <div key={b.id} className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${STATUS_COLORS[b.status] ?? "bg-slate-50 border-slate-100"}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold truncate">{b.service?.name ?? "RDV"}</p>
                          {b.service && b.status !== "CANCELLED" && (
                            <span className="font-bold flex-shrink-0">{b.service.price.toFixed(0)} €</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs opacity-75">
                          <span>{formatDate(b.date)} à {b.timeSlot}</span>
                          {b.staff && (
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full" style={{ background: b.staff.color }} />
                              {b.staff.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-medium flex-shrink-0">{STATUS_LABELS[b.status]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer save */}
          {!loadingProfile && panelTab !== "historique" && (
            <div className="px-5 py-4 border-t border-slate-100 flex-shrink-0">
              <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Enregistrer
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
