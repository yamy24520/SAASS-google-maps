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
  PENDING: { bg: "#fef9c3", border: "#fbbf24", text: "#92400e" },
  CONFIRMED: { bg: "#dcfce7", border: "#4ade80", text: "#166534" },
  CANCELLED: { bg: "#f1f5f9", border: "#cbd5e1", text: "#94a3b8" },
}

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 7h → 20h

function getWeekDates(refDate: Date): Date[] {
  const d = new Date(refDate)
  const day = d.getDay()
  // Lundi = début de semaine
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((day + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday)
    dd.setDate(monday.getDate() + i)
    return dd
  })
}

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0]
}

function fmtDayLabel(d: Date) {
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })
}

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

export default function AgendaPage() {
  const searchParams = useSearchParams()
  const bizParam = searchParams.get("biz") ? `?biz=${searchParams.get("biz")}` : ""

  const [ref, setRef] = useState(() => new Date())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  const weekDates = getWeekDates(ref)
  const weekStart = toDateStr(weekDates[0])
  const weekEnd   = toDateStr(weekDates[6])

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/bookings${bizParam}`)
    const data = await res.json()
    setBookings(data.bookings ?? [])
    setLoading(false)
  }, [bizParam])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  const weekBookings = bookings.filter(b => b.date >= weekStart && b.date <= weekEnd && b.status !== "CANCELLED")

  function prevWeek() { setRef(d => { const n = new Date(d); n.setDate(d.getDate() - 7); return n }) }
  function nextWeek() { setRef(d => { const n = new Date(d); n.setDate(d.getDate() + 7); return n }) }
  function goToday()  { setRef(new Date()) }

  const todayStr = toDateStr(new Date())
  const isCurrentWeek = weekDates.some(d => toDateStr(d) === todayStr)

  const SLOT_HEIGHT = 60 // px per hour
  const GRID_START  = 7  // 7h

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agenda</h1>
          <p className="text-slate-500 text-sm mt-0.5">Vue semaine — {weekDates[0].toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} au {weekDates[6].toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/api/bookings/export${bizParam}`} download>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Download className="w-3 h-3" /> iCal
            </Button>
          </a>
          <Button variant="outline" size="sm" onClick={goToday} className="text-xs">Aujourd&apos;hui</Button>
          <button onClick={prevWeek} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <button onClick={nextWeek} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 rounded-2xl bg-slate-100 animate-pulse" />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex-1 flex flex-col">
          {/* Day headers */}
          <div className="grid border-b border-slate-200" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
            <div className="border-r border-slate-100" />
            {weekDates.map((d, i) => {
              const ds = toDateStr(d)
              const isToday = ds === todayStr
              const dayBookings = weekBookings.filter(b => b.date === ds)
              return (
                <div key={i} className={`py-3 px-2 text-center border-r border-slate-100 last:border-0 ${isToday ? "bg-sky-50" : ""}`}>
                  <p className={`text-xs font-medium uppercase tracking-wide ${isToday ? "text-sky-600" : "text-slate-400"}`}>{DAY_LABELS[(d.getDay())]}</p>
                  <p className={`text-lg font-bold mt-0.5 ${isToday ? "text-sky-600" : "text-slate-900"}`}>{d.getDate()}</p>
                  {dayBookings.length > 0 && (
                    <p className="text-xs text-slate-400 mt-0.5">{dayBookings.length} RDV</p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Time grid */}
          <div className="flex-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 260px)" }}>
            <div className="relative grid" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
              {/* Hour labels */}
              <div className="relative border-r border-slate-100">
                {HOURS.map(h => (
                  <div key={h} style={{ height: SLOT_HEIGHT }} className="border-b border-slate-100 flex items-start justify-end pr-2 pt-1">
                    <span className="text-xs text-slate-400">{String(h).padStart(2, "0")}h</span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDates.map((d, colIdx) => {
                const ds = toDateStr(d)
                const isToday = ds === todayStr
                const dayBookings = weekBookings.filter(b => b.date === ds)
                return (
                  <div key={colIdx} className={`relative border-r border-slate-100 last:border-0 ${isToday ? "bg-sky-50/30" : ""}`} style={{ height: HOURS.length * SLOT_HEIGHT }}>
                    {/* Hour lines */}
                    {HOURS.map((_, hi) => (
                      <div key={hi} style={{ position: "absolute", top: hi * SLOT_HEIGHT, left: 0, right: 0, borderTop: "1px solid #f1f5f9" }} />
                    ))}

                    {/* Bookings */}
                    {dayBookings.map(booking => {
                      const slotMin = toMin(booking.timeSlot)
                      const duration = booking.service?.duration ?? 60
                      const top  = ((slotMin - GRID_START * 60) / 60) * SLOT_HEIGHT
                      const height = Math.max((duration / 60) * SLOT_HEIGHT - 2, 20)
                      const colors = STATUS_COLORS[booking.status]
                      const staffColor = booking.staff?.color ?? "#0ea5e9"
                      return (
                        <div key={booking.id} style={{
                          position: "absolute", top: top + 1, left: 2, right: 2, height,
                          background: colors.bg, border: `1px solid ${colors.border}`,
                          borderLeft: `3px solid ${staffColor}`,
                          borderRadius: 6, padding: "2px 6px", overflow: "hidden", cursor: "default",
                        }}>
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

          {weekBookings.length === 0 && !loading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <CalendarDays className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Aucun RDV cette semaine</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
