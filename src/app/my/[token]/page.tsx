"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Calendar, Clock, User, X, RefreshCw, ChevronRight, CheckCircle, AlertCircle } from "lucide-react"

type Booking = {
  id: string
  date: string
  timeSlot: string
  status: string
  clientName: string
  notes: string | null
  service: { id: string; name: string; duration: number; price: number } | null
  staff: { id: string; name: string; color: string } | null
}

type PortalData = {
  email: string
  business: { id: string; name: string; slug: string; bookingType: string }
  upcoming: Booking[]
  past: Booking[]
}

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING:   { label: "En attente", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    CONFIRMED: { label: "Confirmé",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    CANCELLED: { label: "Annulé",     cls: "bg-red-50 text-red-500 border-red-200" },
  }
  const s = map[status] ?? { label: status, cls: "bg-slate-50 text-slate-500 border-slate-200" }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>
      {s.label}
    </span>
  )
}

export default function ClientPortalPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [cancelledIds, setCancelledIds] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming")

  useEffect(() => {
    fetch(`/api/client-portal/me?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch(() => setError("Erreur de connexion"))
      .finally(() => setLoading(false))
  }, [token])

  async function cancelBooking(bookingId: string) {
    if (cancelling) return
    setCancelling(bookingId)
    try {
      const res = await fetch(`/api/client-portal/cancel/${bookingId}?token=${token}`, { method: "DELETE" })
      const json = await res.json()
      if (json.ok) {
        setCancelledIds(prev => new Set([...prev, bookingId]))
      } else {
        alert(json.error ?? "Erreur lors de l'annulation")
      }
    } catch {
      alert("Erreur de connexion")
    } finally {
      setCancelling(null)
    }
  }

  function rebookUrl(b: Booking) {
    if (!data) return "#"
    const params = new URLSearchParams()
    if (b.service?.id) params.set("service", b.service.id)
    if (b.staff?.id) params.set("staff", b.staff.id)
    return `/book/${data.business.slug}?${params.toString()}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="font-semibold text-slate-800 mb-2">Lien invalide</h2>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const allUpcoming = data.upcoming.map(b => ({ ...b, isCancelled: cancelledIds.has(b.id) }))
  const allPast = data.past

  const activeTab = tab === "upcoming" ? allUpcoming : allPast

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
              {data.business.name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">{data.business.name}</p>
              <p className="text-xs text-slate-400">{data.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Tabs */}
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          {(["upcoming", "past"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t === "upcoming"
                ? `À venir (${allUpcoming.filter(b => !b.isCancelled).length})`
                : `Historique (${allPast.length})`}
            </button>
          ))}
        </div>

        {/* Booking list */}
        {activeTab.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-slate-300 bg-white">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">
              {tab === "upcoming" ? "Aucun rendez-vous à venir" : "Aucun historique"}
            </p>
            {tab === "upcoming" && (
              <a
                href={`/book/${data.business.slug}`}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 text-white text-sm font-semibold hover:bg-sky-600 transition-colors"
              >
                Prendre un RDV <ChevronRight className="w-4 h-4" />
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {activeTab.map(b => {
              const isCancelled = "isCancelled" in b ? b.isCancelled : b.status === "CANCELLED"
              return (
                <div
                  key={b.id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-opacity ${
                    isCancelled ? "opacity-60 border-red-100" : "border-slate-200"
                  }`}
                >
                  {/* Color strip from staff */}
                  {b.staff && (
                    <div className="h-1" style={{ background: b.staff.color }} />
                  )}

                  <div className="p-4 space-y-3">
                    {/* Date + Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm capitalize">{fmtDate(b.date)}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs text-slate-500">{b.timeSlot}</span>
                          {b.service && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="text-xs text-slate-500">{b.service.duration} min</span>
                            </>
                          )}
                        </div>
                      </div>
                      <StatusBadge status={isCancelled ? "CANCELLED" : b.status} />
                    </div>

                    {/* Service + Staff */}
                    <div className="flex items-center gap-3">
                      {b.service && (
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{b.service.name}</p>
                          {b.service.price > 0 && (
                            <p className="text-xs text-slate-400">{b.service.price.toFixed(2)} €</p>
                          )}
                        </div>
                      )}
                      {b.staff && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ background: b.staff.color }}
                          >
                            {b.staff.name.charAt(0)}
                          </div>
                          <span className="text-xs text-slate-500">{b.staff.name}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {!isCancelled && tab === "upcoming" && (
                      <div className="flex gap-2 pt-1 border-t border-slate-100">
                        <button
                          onClick={() => router.push(rebookUrl(b))}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Rebooker
                        </button>
                        {b.status !== "CANCELLED" && (
                          <button
                            onClick={() => {
                              if (confirm("Annuler ce rendez-vous ?")) cancelBooking(b.id)
                            }}
                            disabled={cancelling === b.id}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                          >
                            {cancelling === b.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <X className="w-3.5 h-3.5" />
                            )}
                            Annuler
                          </button>
                        )}
                      </div>
                    )}

                    {isCancelled && (
                      <div className="pt-1 border-t border-slate-100">
                        <a
                          href={rebookUrl(b)}
                          className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-sky-50 text-sky-600 text-xs font-medium hover:bg-sky-100 transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Reprendre ce service
                        </a>
                      </div>
                    )}

                    {tab === "past" && b.status === "CONFIRMED" && (
                      <div className="pt-1 border-t border-slate-100">
                        <a
                          href={rebookUrl(b)}
                          className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-50 text-slate-600 text-xs font-medium hover:bg-slate-100 transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Reprendre ce RDV
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* CTA nouveau RDV */}
        {tab === "upcoming" && allUpcoming.length > 0 && (
          <a
            href={`/book/${data.business.slug}`}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-sky-500 text-white font-semibold text-sm hover:bg-sky-600 transition-colors"
          >
            <Calendar className="w-4 h-4" /> Nouveau rendez-vous
          </a>
        )}

        <p className="text-center text-xs text-slate-400 pb-4">
          Ce lien est personnel et expire dans 24h.
        </p>
      </div>
    </div>
  )
}
