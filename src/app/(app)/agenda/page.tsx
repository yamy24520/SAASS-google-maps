"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight, CalendarDays, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Booking {
  id: string
  clientName: string
  date: string
  timeSlot: string
  status: "PENDING" | "CONFIRMED" | "CANCELLED"
  service: { name: string; duration: number; price: number } | null
  staff: { name: string; color: string } | null
  partySize: number | null
}

const STATUS_COLORS = {
  PENDING:   { bg: "#fef9c3", border: "#fbbf24", text: "#92400e" },
  CONFIRMED: { bg: "#dcfce7", border: "#4ade80", text: "#166534" },
  CANCELLED: { bg: "#f1f5f9", border: "#cbd5e1", text: "#94a3b8" },
}

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 7h → 20h
const SLOT_HEIGHT = 60

function getWeekDates(refDate: Date): Date[] {
  const d = new Date(refDate)
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((day + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday); dd.setDate(monday.getDate() + i); return dd
  })
}

function toDateStr(d: Date) { return d.toISOString().split("T")[0] }
function toMin(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m }

export default function AgendaPage() {
  const searchParams = useSearchParams()
  const bizParam = searchParams.get("biz") ? `?biz=${searchParams.get("biz")}` : ""

  const [ref, setRef] = useState(() => new Date())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"week" | "day">("week")

  const weekDates = getWeekDates(ref)
  const weekStart = toDateStr(weekDates[0])
  const weekEnd   = toDateStr(weekDates[6])
  const todayStr  = toDateStr(new Date())
  const dayStr    = toDateStr(ref)

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/bookings${bizParam}`)
    const data = await res.json()
    setBookings(data.bookings ?? [])
    setLoading(false)
  }, [bizParam])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  function prevPeriod() {
    setRef(d => { const n = new Date(d); n.setDate(d.getDate() - (view === "week" ? 7 : 1)); return n })
  }
  function nextPeriod() {
    setRef(d => { const n = new Date(d); n.setDate(d.getDate() + (view === "week" ? 7 : 1)); return n })
  }

  const displayBookings = view === "week"
    ? bookings.filter(b => b.date >= weekStart && b.date <= weekEnd && b.status !== "CANCELLED")
    : bookings.filter(b => b.date === dayStr && b.status !== "CANCELLED")

  // ─── VUE SEMAINE ──────────────────────────────────────────────────────────────
  const WeekView = () => (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col" style={{ maxHeight: "calc(100vh - 220px)" }}>
      {/* Headers */}
      <div className="grid border-b border-slate-200 flex-shrink-0" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
        <div className="border-r border-slate-100" />
        {weekDates.map((d, i) => {
          const ds = toDateStr(d)
          const isToday = ds === todayStr
          const count = displayBookings.filter(b => b.date === ds).length
          return (
            <button key={i} onClick={() => { setRef(d); setView("day") }}
              className={`py-3 px-2 text-center border-r border-slate-100 last:border-0 hover:bg-slate-50 transition-colors ${isToday ? "bg-sky-50" : ""}`}>
              <p className={`text-xs font-medium uppercase tracking-wide ${isToday ? "text-sky-600" : "text-slate-400"}`}>{DAY_LABELS[d.getDay()]}</p>
              <p className={`text-lg font-bold mt-0.5 ${isToday ? "text-sky-600" : "text-slate-900"}`}>{d.getDate()}</p>
              {count > 0 && <p className="text-xs text-slate-400 mt-0.5">{count} RDV</p>}
            </button>
          )
        })}
      </div>

      {/* Grid */}
      <div className="overflow-y-auto flex-1">
        <div className="relative grid" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
          <div className="relative border-r border-slate-100">
            {HOURS.map(h => (
              <div key={h} style={{ height: SLOT_HEIGHT }} className="border-b border-slate-100 flex items-start justify-end pr-2 pt-1">
                <span className="text-xs text-slate-400">{String(h).padStart(2, "0")}h</span>
              </div>
            ))}
          </div>
          {weekDates.map((d, colIdx) => {
            const ds = toDateStr(d)
            const isToday = ds === todayStr
            const dayBookings = displayBookings.filter(b => b.date === ds)
            return (
              <div key={colIdx} className={`relative border-r border-slate-100 last:border-0 ${isToday ? "bg-sky-50/30" : ""}`} style={{ height: HOURS.length * SLOT_HEIGHT }}>
                {HOURS.map((_, hi) => <div key={hi} style={{ position: "absolute", top: hi * SLOT_HEIGHT, left: 0, right: 0, borderTop: "1px solid #f1f5f9" }} />)}
                {dayBookings.map(booking => {
                  const slotMin = toMin(booking.timeSlot)
                  const duration = booking.service?.duration ?? 60
                  const top    = ((slotMin - 7 * 60) / 60) * SLOT_HEIGHT
                  const height = Math.max((duration / 60) * SLOT_HEIGHT - 2, 20)
                  const colors = STATUS_COLORS[booking.status]
                  return (
                    <div key={booking.id} style={{ position: "absolute", top: top + 1, left: 2, right: 2, height, background: colors.bg, border: `1px solid ${colors.border}`, borderLeft: `3px solid ${booking.staff?.color ?? "#0ea5e9"}`, borderRadius: 6, padding: "2px 6px", overflow: "hidden" }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: colors.text, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {booking.timeSlot} {booking.clientName}
                      </p>
                      {height > 30 && (
                        <p style={{ fontSize: 10, color: colors.text, opacity: 0.8, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {booking.service?.name ?? (booking.partySize ? `${booking.partySize} pers.` : "RDV")}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  // ─── VUE JOURNALIÈRE ─────────────────────────────────────────────────────────
  const DayView = () => (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col" style={{ maxHeight: "calc(100vh - 220px)" }}>
      <div className="border-b border-slate-200 px-4 py-3 flex-shrink-0">
        <p className="font-semibold text-slate-900 capitalize">
          {ref.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">{displayBookings.length} RDV ce jour</p>
      </div>
      <div className="overflow-y-auto flex-1">
        <div className="relative flex" style={{ height: HOURS.length * SLOT_HEIGHT }}>
          {/* Heures */}
          <div className="w-14 flex-shrink-0 border-r border-slate-100">
            {HOURS.map(h => (
              <div key={h} style={{ height: SLOT_HEIGHT }} className="border-b border-slate-100 flex items-start justify-end pr-2 pt-1">
                <span className="text-xs text-slate-400">{String(h).padStart(2, "0")}h</span>
              </div>
            ))}
          </div>
          {/* Colonne */}
          <div className="flex-1 relative" style={{ height: HOURS.length * SLOT_HEIGHT }}>
            {HOURS.map((_, hi) => <div key={hi} style={{ position: "absolute", top: hi * SLOT_HEIGHT, left: 0, right: 0, borderTop: "1px solid #f1f5f9" }} />)}

            {/* Ligne "maintenant" si aujourd'hui */}
            {dayStr === todayStr && (() => {
              const now = new Date()
              const nowMin = now.getHours() * 60 + now.getMinutes()
              const top = ((nowMin - 7 * 60) / 60) * SLOT_HEIGHT
              return top >= 0 ? <div style={{ position: "absolute", top, left: 0, right: 0, height: 2, background: "#ef4444", zIndex: 10 }} /> : null
            })()}

            {displayBookings.map(booking => {
              const slotMin = toMin(booking.timeSlot)
              const duration = booking.service?.duration ?? 60
              const top    = ((slotMin - 7 * 60) / 60) * SLOT_HEIGHT
              const height = Math.max((duration / 60) * SLOT_HEIGHT - 3, 32)
              const colors = STATUS_COLORS[booking.status]
              return (
                <div key={booking.id} style={{ position: "absolute", top: top + 1, left: 8, right: 8, height, background: colors.bg, border: `1px solid ${colors.border}`, borderLeft: `4px solid ${booking.staff?.color ?? "#0ea5e9"}`, borderRadius: 8, padding: "6px 10px", overflow: "hidden" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: colors.text, margin: "0 0 2px" }}>{booking.timeSlot} — {booking.clientName}</p>
                  <p style={{ fontSize: 11, color: colors.text, opacity: 0.8, margin: 0 }}>
                    {booking.service?.name ?? (booking.partySize ? `${booking.partySize} pers.` : "RDV")}
                    {booking.service && ` · ${booking.service.duration}min · ${booking.service.price.toFixed(0)}€`}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )

  const periodLabel = view === "week"
    ? `${weekDates[0].toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} – ${weekDates[6].toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`
    : ref.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  return (
    <div className="flex flex-col gap-4" style={{ height: "100%" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agenda</h1>
          <p className="text-slate-500 text-sm mt-0.5 capitalize">{periodLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/api/bookings/export${bizParam}`} download>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs"><Download className="w-3 h-3" /> iCal</Button>
          </a>
          {/* Toggle vue */}
          <div className="flex rounded-xl border border-slate-200 overflow-hidden">
            {(["week", "day"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === v ? "bg-sky-500 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
                {v === "week" ? "Semaine" : "Journée"}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => setRef(new Date())} className="text-xs">Aujourd&apos;hui</Button>
          <button onClick={prevPeriod} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"><ChevronLeft className="w-4 h-4 text-slate-600" /></button>
          <button onClick={nextPeriod} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"><ChevronRight className="w-4 h-4 text-slate-600" /></button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 rounded-2xl bg-slate-100 animate-pulse" />
      ) : view === "week" ? <WeekView /> : <DayView />}
    </div>
  )
}
