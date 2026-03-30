"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Mail, Phone, CalendarDays, ChevronRight, Search, User, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface Booking {
  id: string; date: string; timeSlot: string; status: string
  service: { name: string; price: number } | null
}

interface Client {
  email: string; name: string; phone: string | null
  bookings: Booking[]; totalSpent: number; lastVisit: string | null
}

function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
}

export default function ClientsPage() {
  const searchParams = useSearchParams()
  const bizParam = searchParams.get("biz") ? `?biz=${searchParams.get("biz")}` : ""

  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selected, setSelected] = useState<Client | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchClients = useCallback(async () => {
    const res = await fetch(`/api/bookings${bizParam}`)
    const data = await res.json()
    const bookings: (Booking & { clientName: string; clientEmail: string; clientPhone: string | null })[] = data.bookings ?? []

    // Grouper par email
    const map = new Map<string, Client>()
    for (const b of bookings) {
      if (!map.has(b.clientEmail)) {
        map.set(b.clientEmail, { email: b.clientEmail, name: b.clientName, phone: b.clientPhone, bookings: [], totalSpent: 0, lastVisit: null })
      }
      const c = map.get(b.clientEmail)!
      c.bookings.push(b)
      if (b.status !== "CANCELLED") {
        c.totalSpent += b.service?.price ?? 0
      }
      if (b.status === "CONFIRMED" && (!c.lastVisit || b.date > c.lastVisit)) {
        c.lastVisit = b.date
      }
    }

    const sorted = Array.from(map.values()).sort((a, b) => {
      const aLast = a.lastVisit ?? ""
      const bLast = b.lastVisit ?? ""
      return bLast.localeCompare(aLast)
    })
    setClients(sorted)
    setLoading(false)
  }, [bizParam])

  useEffect(() => { fetchClients() }, [fetchClients])

  function handleSearch(val: string) {
    setSearch(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 300)
  }

  const q = debouncedSearch.toLowerCase()
  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.email.toLowerCase().includes(q) ||
    (c.phone ?? "").includes(debouncedSearch)
  )

  const totalRevenue = clients.reduce((s, c) => s + c.totalSpent, 0)
  const totalBookings = clients.reduce((s, c) => s + c.bookings.filter(b => b.status !== "CANCELLED").length, 0)

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
    <div className="flex gap-6 h-full">
      {/* Liste */}
      <div className="flex-1 space-y-4 min-w-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-slate-500 text-sm mt-0.5">{clients.length} client{clients.length > 1 ? "s" : ""} au total</p>
        </div>

        {/* Stats */}
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
                  <p className="text-2xl font-bold text-slate-900">{totalBookings}</p>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">RDV totaux</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recherche */}
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
          <div className="space-y-2">
            {filtered.map(client => {
              const totalBookings = client.bookings.filter(b => b.status !== "CANCELLED").length
              const isSelected = selected?.email === client.email
              return (
                <button key={client.email} onClick={() => setSelected(isSelected ? null : client)} className={`w-full text-left p-4 rounded-xl border transition-all ${isSelected ? "border-sky-500 bg-sky-50" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-slate-900 text-sm">{client.name}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-semibold text-emerald-600">{client.totalSpent.toFixed(0)} €</span>
                          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-slate-400 flex items-center gap-1"><CalendarDays className="w-3 h-3" />{totalBookings} RDV</span>
                        {client.lastVisit && <span className="text-xs text-slate-400">Dernière visite : {formatDate(client.lastVisit)}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Fiche expandée */}
                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-slate-200 space-y-3 text-left" onClick={e => e.stopPropagation()}>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{client.email}</span>
                        {client.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{client.phone}</span>}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Historique</p>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {client.bookings.sort((a, b) => b.date.localeCompare(a.date)).map(b => (
                            <div key={b.id} className={`flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg ${b.status === "CANCELLED" ? "text-slate-400 bg-slate-50" : "text-slate-700 bg-white border border-slate-100"}`}>
                              <span className="font-medium w-10">{b.timeSlot}</span>
                              <span className="flex-1 truncate">{b.service?.name ?? "RDV"}</span>
                              <span className="text-slate-400">{formatDate(b.date)}</span>
                              {b.service && b.status !== "CANCELLED" && <span className="font-semibold text-emerald-600 shrink-0">{b.service.price.toFixed(0)} €</span>}
                              {b.status === "CANCELLED" && <span className="text-slate-400 shrink-0">Annulé</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
