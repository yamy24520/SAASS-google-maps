"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CalendarDays, Clock, Phone, Mail, CheckCircle2, XCircle, AlertCircle, ChevronDown } from "lucide-react"
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
  service: { name: string; duration: number; price: number }
  createdAt: string
}

const STATUS_CONFIG = {
  PENDING:   { label: "En attente", variant: "warning" as const,   icon: AlertCircle,   color: "text-amber-500" },
  CONFIRMED: { label: "Confirmé",   variant: "success" as const,   icon: CheckCircle2,  color: "text-emerald-500" },
  CANCELLED: { label: "Annulé",     variant: "secondary" as const, icon: XCircle,       color: "text-slate-400" },
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
}

export default function BookingsPage() {
  const searchParams = useSearchParams()
  const bizParam = searchParams.get("biz") ? `?biz=${searchParams.get("biz")}` : ""

  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "CONFIRMED" | "CANCELLED">("ALL")
  const [updating, setUpdating] = useState<string | null>(null)

  async function fetchBookings() {
    const res = await fetch(`/api/bookings${bizParam}`)
    const data = await res.json()
    setBookings(data.bookings ?? [])
    setLoading(false)
  }

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

  useEffect(() => { fetchBookings() }, [bizParam]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = bookings.filter(b => filter === "ALL" || b.status === filter)
  const pendingCount = bookings.filter(b => b.status === "PENDING").length

  // Group by date
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Réservations</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {pendingCount > 0 ? <span className="text-amber-600 font-medium">{pendingCount} en attente de confirmation</span> : "Aucun RDV en attente"}
          </p>
        </div>
        {/* Filter */}
        <div className="flex gap-2">
          {(["ALL", "PENDING", "CONFIRMED", "CANCELLED"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {f === "ALL" ? "Tous" : STATUS_CONFIG[f].label}
            </button>
          ))}
        </div>
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
                        {/* Time */}
                        <div className="text-center min-w-[52px]">
                          <p className="text-lg font-bold text-slate-900">{booking.timeSlot}</p>
                          <p className="text-xs text-slate-400">{booking.service.duration}min</p>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div>
                              <p className="font-semibold text-slate-900">{booking.clientName}</p>
                              <p className="text-sm text-sky-600 font-medium">{booking.service.name} — {booking.service.price.toFixed(2)} €</p>
                            </div>
                            <Badge variant={cfg.variant} className="flex items-center gap-1 shrink-0">
                              <Icon className="w-3 h-3" />
                              {cfg.label}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-2">
                            <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{booking.clientEmail}</span>
                            {booking.clientPhone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{booking.clientPhone}</span>}
                          </div>
                          {booking.notes && <p className="text-xs text-slate-400 mt-1.5 italic">{booking.notes}</p>}
                        </div>

                        {/* Actions */}
                        {booking.status === "PENDING" && (
                          <div className="flex flex-col gap-2 shrink-0">
                            <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-500 hover:bg-emerald-600"
                              disabled={updating === booking.id} onClick={() => updateStatus(booking.id, "CONFIRMED")}>
                              <CheckCircle2 className="w-3 h-3" /> Confirmer
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-500 border-red-200 hover:bg-red-50"
                              disabled={updating === booking.id} onClick={() => updateStatus(booking.id, "CANCELLED")}>
                              <XCircle className="w-3 h-3" /> Annuler
                            </Button>
                          </div>
                        )}
                        {booking.status === "CONFIRMED" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-500 border-red-200 hover:bg-red-50 shrink-0"
                            disabled={updating === booking.id} onClick={() => updateStatus(booking.id, "CANCELLED")}>
                            <XCircle className="w-3 h-3" /> Annuler
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
