"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { CalendarDays, Clock, Phone, Mail, CheckCircle2, XCircle, AlertCircle, Plus, Pencil, X, TrendingUp, Euro, Users, RotateCcw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/toaster"

interface Booking {
  id: string
  clientName: string
  clientEmail: string
  clientPhone: string | null
  date: string
  timeSlot: string
  status: "PENDING" | "CONFIRMED" | "CANCELLED"
  notes: string | null
  service: { name: string; duration: number; price: number } | null
  staff: { name: string; color: string } | null
  partySize: number | null
  recurrenceGroupId: string | null
  paymentStatus: "NOT_REQUIRED" | "PENDING" | "PAID" | "REFUNDED" | "FAILED"
  depositAmount: number | null
  createdAt: string
}

interface Service { id: string; name: string; duration: number; price: number }
interface WaitlistEntry {
  id: string; clientName: string; clientEmail: string; clientPhone: string | null
  preferredDate: string | null; notifiedAt: string | null
  service: { name: string } | null; createdAt: string
}
interface Stats {
  caMonth: number; caConfirmed: number; cancellationRate: number
  bookingsThisWeek: number; upcomingBookings: number; monthTotal: number; monthCancelled: number
}

const STATUS_CONFIG = {
  PENDING:   { label: "En attente", variant: "warning" as const,   icon: AlertCircle,   color: "text-amber-500" },
  CONFIRMED: { label: "Confirmé",   variant: "success" as const,   icon: CheckCircle2,  color: "text-emerald-500" },
  CANCELLED: { label: "Annulé",     variant: "secondary" as const, icon: XCircle,       color: "text-slate-400" },
}

const RECURRENCE_LABELS: Record<string, string> = { weekly: "Hebdo", biweekly: "Bi-hebdo", monthly: "Mensuel" }

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
}

function getDatesAhead(n: number) {
  const dates: string[] = []
  const today = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i)
    dates.push(d.toISOString().split("T")[0])
  }
  return dates
}

export default function BookingsPage() {
  const searchParams = useSearchParams()
  const bizParam = searchParams.get("biz") ? `?biz=${searchParams.get("biz")}` : ""

  const [bookings, setBookings] = useState<Booking[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "CONFIRMED" | "CANCELLED">("ALL")
  const [activeTab, setActiveTab] = useState<"bookings" | "waitlist">("bookings")
  const [updating, setUpdating] = useState<string | null>(null)

  // Modal nouveau RDV
  const [showModal, setShowModal] = useState(false)
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const [modalForm, setModalForm] = useState({
    clientName: "", clientEmail: "", clientPhone: "", serviceId: "",
    date: "", timeSlot: "", notes: "", status: "CONFIRMED",
    recurrence: "", recurrenceEnd: "",
  })
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [submittingModal, setSubmittingModal] = useState(false)

  const fetchAll = useCallback(async () => {
    const [bRes, sRes, wRes, stRes] = await Promise.all([
      fetch(`/api/bookings${bizParam}`),
      fetch(`/api/services${bizParam}`),
      fetch(`/api/waitlist${bizParam}`),
      fetch(`/api/stats${bizParam}`),
    ])
    const [bData, sData, wData, stData] = await Promise.all([bRes.json(), sRes.json(), wRes.json(), stRes.json()])
    setBookings(bData.bookings ?? [])
    setServices(sData.services ?? [])
    setWaitlist(wData.entries ?? [])
    setStats(stData.caMonth !== undefined ? stData : null)
    setLoading(false)
  }, [bizParam])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Charger les créneaux dispo quand date/service change dans le modal
  useEffect(() => {
    if (!modalForm.date || (!modalForm.serviceId && !editingBooking)) return
    const bizId = searchParams.get("biz")
    const svcId = modalForm.serviceId || editingBooking?.service ? (modalForm.serviceId || editingBooking?.service?.name) : ""
    // On a besoin du businessId — on le récupère via l'API availability
    fetch(`/api/bookings${bizParam}`)
      .then(r => r.json())
      .then(async (d) => {
        // On cherche le businessId depuis les bookings existants ou via l'API
        const biz = await fetch(`/api/services${bizParam}`).then(r => r.json())
        // Pour récupérer businessId, on passe par une autre route si besoin
        // Pour l'instant on affiche juste un input libre
      })
    setAvailableSlots([])
  }, [modalForm.date, modalForm.serviceId])

  async function updateStatus(id: string, status: "CONFIRMED" | "CANCELLED") {
    setUpdating(id)
    const res = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
      toast({ title: status === "CONFIRMED" ? "RDV confirmé" : "RDV annulé", variant: "success" })
    } else {
      toast({ title: "Erreur", variant: "destructive" })
    }
    setUpdating(null)
  }

  function openNewModal() {
    setEditingBooking(null)
    setModalForm({ clientName: "", clientEmail: "", clientPhone: "", serviceId: "", date: new Date().toISOString().split("T")[0], timeSlot: "", notes: "", status: "CONFIRMED", recurrence: "", recurrenceEnd: "" })
    setShowModal(true)
  }

  function openEditModal(b: Booking) {
    setEditingBooking(b)
    setModalForm({
      clientName: b.clientName, clientEmail: b.clientEmail, clientPhone: b.clientPhone ?? "",
      serviceId: b.service ? "" : "", date: b.date, timeSlot: b.timeSlot,
      notes: b.notes ?? "", status: b.status, recurrence: "", recurrenceEnd: "",
    })
    setShowModal(true)
  }

  async function submitModal() {
    if (!modalForm.clientName || !modalForm.date || !modalForm.timeSlot) return
    setSubmittingModal(true)

    if (editingBooking) {
      // Modifier
      const res = await fetch(`/api/bookings/${editingBooking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: modalForm.status,
          date: modalForm.date,
          timeSlot: modalForm.timeSlot,
          notes: modalForm.notes || null,
          clientName: modalForm.clientName,
          clientPhone: modalForm.clientPhone || null,
        }),
      })
      if (res.ok) {
        await fetchAll()
        toast({ title: "RDV modifié", variant: "success" })
        setShowModal(false)
      } else {
        toast({ title: "Erreur lors de la modification", variant: "destructive" })
      }
    } else {
      // Nouveau RDV manuel
      const res = await fetch(`/api/bookings${bizParam}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: "auto", // sera résolu côté serveur via session
          serviceId: modalForm.serviceId || null,
          clientName: modalForm.clientName,
          clientEmail: modalForm.clientEmail,
          clientPhone: modalForm.clientPhone || null,
          date: modalForm.date,
          timeSlot: modalForm.timeSlot,
          notes: modalForm.notes || null,
          manualStatus: modalForm.status,
          recurrence: modalForm.recurrence || null,
          recurrenceEnd: modalForm.recurrenceEnd || null,
        }),
      })
      if (res.ok) {
        await fetchAll()
        toast({ title: "RDV créé", variant: "success" })
        setShowModal(false)
      } else {
        const d = await res.json()
        toast({ title: d.error ?? "Erreur", variant: "destructive" })
      }
    }
    setSubmittingModal(false)
  }

  async function notifyWaitlist(id: string) {
    const res = await fetch(`/api/waitlist/${id}`, { method: "POST" })
    if (res.ok) {
      setWaitlist(prev => prev.map(e => e.id === id ? { ...e, notifiedAt: new Date().toISOString() } : e))
      toast({ title: "Notification envoyée", variant: "success" })
    } else {
      toast({ title: "Erreur envoi", variant: "destructive" })
    }
  }

  async function removeWaitlist(id: string) {
    const res = await fetch(`/api/waitlist/${id}`, { method: "DELETE" })
    if (res.ok) { setWaitlist(prev => prev.filter(e => e.id !== id)); toast({ title: "Supprimé", variant: "success" }) }
  }

  const filtered = bookings.filter(b => filter === "ALL" || b.status === filter)
  const pendingCount = bookings.filter(b => b.status === "PENDING").length
  const grouped = filtered.reduce<Record<string, Booking[]>>((acc, b) => {
    if (!acc[b.date]) acc[b.date] = []
    acc[b.date].push(b)
    return acc
  }, {})

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-200" />)}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Réservations</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {pendingCount > 0 ? <span className="text-amber-600 font-medium">{pendingCount} en attente de confirmation</span> : "Aucun RDV en attente"}
          </p>
        </div>
        <Button onClick={openNewModal} className="gap-2">
          <Plus className="w-4 h-4" /> Nouveau RDV
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "CA du mois", value: `${stats.caMonth.toFixed(0)} €`, sub: `${stats.caConfirmed.toFixed(0)} € confirmé`, icon: Euro, color: "text-emerald-600" },
            { label: "RDV cette semaine", value: stats.bookingsThisWeek, sub: "7 derniers jours", icon: CalendarDays, color: "text-sky-600" },
            { label: "À venir", value: stats.upcomingBookings, sub: "confirmés + en attente", icon: Clock, color: "text-violet-600" },
            { label: "Taux annulation", value: `${stats.cancellationRate}%`, sub: `${stats.monthCancelled} / ${stats.monthTotal} ce mois`, icon: TrendingUp, color: stats.cancellationRate > 20 ? "text-red-500" : "text-slate-500" },
          ].map(s => (
            <Card key={s.label} className="border-slate-100">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
                  </div>
                  <s.icon className={`w-4 h-4 mt-1 ${s.color} opacity-60`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-0">
        {[
          { key: "bookings", label: "Réservations", count: bookings.filter(b => b.status !== "CANCELLED").length },
          { key: "waitlist", label: "Liste d'attente", count: waitlist.length },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === tab.key ? "border-sky-500 text-sky-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {tab.label}
            {tab.count > 0 && <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? "bg-sky-100 text-sky-600" : "bg-slate-100 text-slate-500"}`}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Onglet Réservations */}
      {activeTab === "bookings" && (
        <>
          {/* Filtres */}
          <div className="flex gap-2">
            {(["ALL", "PENDING", "CONFIRMED", "CANCELLED"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {f === "ALL" ? "Tous" : STATUS_CONFIG[f].label}
              </button>
            ))}
          </div>

          {Object.keys(grouped).length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Aucune réservation</p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([date, dayBookings]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-sm font-semibold text-slate-700 capitalize">{formatDate(date)}</p>
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-400">{dayBookings.length} RDV</span>
                </div>
                <div className="space-y-3">
                  {dayBookings.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot)).map(booking => {
                    const cfg = STATUS_CONFIG[booking.status]
                    const Icon = cfg.icon
                    return (
                      <Card key={booking.id} className={`hover:shadow-md transition-shadow ${booking.status === "CANCELLED" ? "opacity-60" : ""}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="text-center min-w-[52px]">
                              <p className="text-lg font-bold text-slate-900">{booking.timeSlot}</p>
                              <p className="text-xs text-slate-400">{booking.service?.duration ?? "—"}min</p>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold text-slate-900">{booking.clientName}</p>
                                    {booking.recurrenceGroupId && <span className="text-xs bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><RotateCcw className="w-2.5 h-2.5" /> récurrent</span>}
                                    {booking.partySize && <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Users className="w-2.5 h-2.5" /> {booking.partySize}</span>}
                                  </div>
                                  <p className="text-sm text-sky-600 font-medium">
                                    {booking.service?.name ?? "Table"}
                                    {booking.service && ` — ${booking.service.price.toFixed(2)} €`}
                                    {booking.staff && <span className="ml-1 text-slate-400 text-xs">· {booking.staff.name}</span>}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {booking.paymentStatus === "PAID" && (
                                    <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                                      💳 {booking.depositAmount ? `${booking.depositAmount.toFixed(0)} €` : "Payé"}
                                    </span>
                                  )}
                                  {booking.paymentStatus === "PENDING" && (
                                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">⏳ En attente</span>
                                  )}
                                  {booking.paymentStatus === "FAILED" && (
                                    <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">❌ Échec</span>
                                  )}
                                  <Badge variant={cfg.variant} className="flex items-center gap-1">
                                    <Icon className="w-3 h-3" />{cfg.label}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-2">
                                <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{booking.clientEmail}</span>
                                {booking.clientPhone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{booking.clientPhone}</span>}
                              </div>
                              {booking.notes && <p className="text-xs text-slate-400 mt-1.5 italic">{booking.notes}</p>}
                            </div>
                            <div className="flex flex-col gap-2 shrink-0">
                              <button onClick={() => openEditModal(booking)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {booking.status === "PENDING" && (
                                <>
                                  <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-500 hover:bg-emerald-600"
                                    disabled={updating === booking.id} onClick={() => updateStatus(booking.id, "CONFIRMED")}>
                                    <CheckCircle2 className="w-3 h-3" /> Confirmer
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-500 border-red-200 hover:bg-red-50"
                                    disabled={updating === booking.id} onClick={() => updateStatus(booking.id, "CANCELLED")}>
                                    <XCircle className="w-3 h-3" /> Annuler
                                  </Button>
                                </>
                              )}
                              {booking.status === "CONFIRMED" && (
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-500 border-red-200 hover:bg-red-50"
                                  disabled={updating === booking.id} onClick={() => updateStatus(booking.id, "CANCELLED")}>
                                  <XCircle className="w-3 h-3" /> Annuler
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* Onglet Liste d'attente */}
      {activeTab === "waitlist" && (
        <div className="space-y-3">
          {waitlist.length === 0 ? (
            <Card><CardContent className="py-16 text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Aucun client en liste d'attente</p>
            </CardContent></Card>
          ) : waitlist.map(entry => (
            <Card key={entry.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-slate-900">{entry.clientName}</p>
                      {entry.notifiedAt && <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">Notifié</span>}
                    </div>
                    <p className="text-sm text-sky-600">{entry.service?.name ?? "Toute prestation"}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-1.5">
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{entry.clientEmail}</span>
                      {entry.clientPhone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{entry.clientPhone}</span>}
                      {entry.preferredDate && <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{formatDate(entry.preferredDate)}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => notifyWaitlist(entry.id)}
                      disabled={!!entry.notifiedAt}>
                      {entry.notifiedAt ? "Notifié" : "Notifier"}
                    </Button>
                    <button onClick={() => removeWaitlist(entry.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Nouveau / Modifier RDV */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">{editingBooking ? "Modifier le RDV" : "Nouveau RDV"}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Client */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-slate-500 block mb-1.5">Nom client *</label>
                  <input value={modalForm.clientName} onChange={e => setModalForm(f => ({ ...f, clientName: e.target.value }))} placeholder="Jean Dupont"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1.5">Email</label>
                  <input type="email" value={modalForm.clientEmail} onChange={e => setModalForm(f => ({ ...f, clientEmail: e.target.value }))} placeholder="jean@exemple.fr"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1.5">Téléphone</label>
                  <input type="tel" value={modalForm.clientPhone} onChange={e => setModalForm(f => ({ ...f, clientPhone: e.target.value }))} placeholder="06 12 34 56 78"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
              </div>

              {/* Prestation */}
              {!editingBooking && services.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1.5">Prestation</label>
                  <select value={modalForm.serviceId} onChange={e => setModalForm(f => ({ ...f, serviceId: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500">
                    <option value="">— Sans prestation —</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.duration}min · {s.price.toFixed(2)}€)</option>)}
                  </select>
                </div>
              )}

              {/* Date & Heure */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1.5">Date *</label>
                  <input type="date" value={modalForm.date} onChange={e => setModalForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1.5">Heure *</label>
                  <input type="time" value={modalForm.timeSlot} onChange={e => setModalForm(f => ({ ...f, timeSlot: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
              </div>

              {/* Statut */}
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">Statut</label>
                <div className="flex gap-2">
                  {(["CONFIRMED", "PENDING", "CANCELLED"] as const).map(s => (
                    <button key={s} onClick={() => setModalForm(f => ({ ...f, status: s }))}
                      className={`flex-1 py-2 text-xs font-medium rounded-xl border transition-all ${modalForm.status === s ? "bg-sky-500 text-white border-sky-500" : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"}`}>
                      {STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Récurrence (nouveau RDV seulement) */}
              {!editingBooking && (
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1.5">Récurrence</label>
                  <div className="flex gap-2 flex-wrap">
                    {[{ value: "", label: "Unique" }, { value: "weekly", label: "Hebdo" }, { value: "biweekly", label: "Bi-hebdo" }, { value: "monthly", label: "Mensuel" }].map(opt => (
                      <button key={opt.value} onClick={() => setModalForm(f => ({ ...f, recurrence: opt.value }))}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${modalForm.recurrence === opt.value ? "bg-violet-500 text-white border-violet-500" : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {modalForm.recurrence && (
                    <div className="mt-2">
                      <label className="text-xs font-medium text-slate-500 block mb-1">Jusqu'au</label>
                      <input type="date" value={modalForm.recurrenceEnd} onChange={e => setModalForm(f => ({ ...f, recurrenceEnd: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">Notes</label>
                <textarea value={modalForm.notes} onChange={e => setModalForm(f => ({ ...f, notes: e.target.value }))} placeholder="Informations complémentaires..." rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none" />
              </div>
            </div>

            <div className="px-6 pb-6">
              <Button onClick={submitModal} disabled={submittingModal || !modalForm.clientName || !modalForm.date || !modalForm.timeSlot} className="w-full">
                {submittingModal ? "Enregistrement..." : editingBooking ? "Enregistrer les modifications" : "Créer le RDV"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
