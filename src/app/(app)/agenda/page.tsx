"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight, X, Copy, Check, RefreshCw, Smartphone, CheckCircle2, XCircle, Clock, User, Scissors, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
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
  partySize: number | null
  paymentStatus: string
  depositAmount: number | null
  service: { name: string; duration: number; price: number } | null
  staff: { id: string; name: string; color: string } | null
}

interface Staff { id: string; name: string; color: string }
interface StaffAbsence { id: string; staffId: string; startDate: string; endDate: string; reason: string | null; type: string }

const STATUS_COLORS = {
  PENDING:   { bg: "#fef9c3", border: "#fbbf24", text: "#92400e" },
  CONFIRMED: { bg: "#dcfce7", border: "#4ade80", text: "#166534" },
  CANCELLED: { bg: "#f1f5f9", border: "#cbd5e1", text: "#94a3b8" },
}
const ABSENCE_COLORS: Record<string, string> = {
  VACATION: "#dbeafe",
  SICK: "#fce7f3",
  OTHER: "#f1f5f9",
}
const ABSENCE_LABELS: Record<string, string> = { VACATION: "Congés", SICK: "Maladie", OTHER: "Absent" }

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 7h → 20h
const SLOT_HEIGHT = 52

function getWeekDates(refDate: Date): Date[] {
  const d = new Date(refDate)
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((day + 6) % 7))
  // Lun → Sam (6 jours)
  return Array.from({ length: 6 }, (_, i) => {
    const dd = new Date(monday); dd.setDate(monday.getDate() + i); return dd
  })
}

function toDateStr(d: Date) {
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, "0")
  const da = String(d.getDate()).padStart(2, "0")
  return `${y}-${mo}-${da}`
}
function toMin(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m }

function isAbsent(absences: StaffAbsence[], staffId: string, dateStr: string) {
  return absences.some(a => a.staffId === staffId && dateStr >= a.startDate && dateStr <= a.endDate)
}

/** Group bookings by overlap: A and B overlap if their time ranges intersect */
function groupOverlapping(bookings: Booking[]): Booking[][] {
  const sorted = [...bookings].sort((a, b) => toMin(a.timeSlot) - toMin(b.timeSlot))
  const groups: Booking[][] = []

  for (const booking of sorted) {
    const aStart = toMin(booking.timeSlot)
    const aDur = booking.service?.duration ?? 60
    const aEnd = aStart + aDur

    let placed = false
    for (const group of groups) {
      // Check if booking overlaps with any booking already in this group
      const overlaps = group.some(b => {
        const bStart = toMin(b.timeSlot)
        const bDur = b.service?.duration ?? 60
        const bEnd = bStart + bDur
        return aStart < bEnd && bStart < aEnd
      })
      if (overlaps) {
        group.push(booking)
        placed = true
        break
      }
    }
    if (!placed) groups.push([booking])
  }
  return groups
}

export default function AgendaPage() {
  const searchParams = useSearchParams()
  const bizParam = searchParams.get("biz") ? `?biz=${searchParams.get("biz")}` : ""
  const bizParamLink = searchParams.get("biz") ? `?biz=${searchParams.get("biz")}` : ""

  const [ref, setRef] = useState(() => new Date())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [staffs, setStaffs] = useState<Staff[]>([])
  const [absences, setAbsences] = useState<StaffAbsence[]>([])
  const [calendarToken, setCalendarToken] = useState<string | null>(null)
  const [staffTokens, setStaffTokens] = useState<{ id: string; name: string; color: string; token: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"week" | "day">(() =>
    typeof window !== "undefined" && window.innerWidth < 1024 ? "day" : "week"
  )
  const [filterStaffId, setFilterStaffId] = useState<string | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showSync, setShowSync] = useState(false)
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const weekDates = getWeekDates(ref)
  const weekStart = toDateStr(weekDates[0])
  const weekEnd   = toDateStr(weekDates[5])
  const todayStr  = toDateStr(new Date())
  const dayStr    = toDateStr(ref)

  const APP_URL = typeof window !== "undefined" ? window.location.origin : "https://reputix.net"
  const calendarUrl = calendarToken ? `${APP_URL}/api/calendar/${calendarToken}` : null

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [bRes, sRes, aRes, tRes] = await Promise.all([
      fetch(`/api/bookings${bizParam}`),
      fetch(`/api/staff${bizParam}`),
      fetch(`/api/staff/absences${bizParam}`),
      fetch(`/api/calendar/token${bizParam}`),
    ])
    const [bData, sData, aData, tData] = await Promise.all([bRes.json(), sRes.json(), aRes.json(), tRes.json()])
    setBookings(bData.bookings ?? [])
    setStaffs(sData.staffs ?? [])
    setAbsences(aData.absences ?? [])
    setCalendarToken(tData.token ?? null)
    setStaffTokens(tData.staffTokens ?? [])
    setLoading(false)
  }, [bizParam])

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    function onResize() {
      setView(v => {
        const mobile = window.innerWidth < 1024
        if (mobile && v === "week") return "day"
        return v
      })
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  function prevPeriod() {
    setRef(d => { const n = new Date(d); n.setDate(d.getDate() - (view === "week" ? 7 : 1)); return n })
  }
  function nextPeriod() {
    setRef(d => { const n = new Date(d); n.setDate(d.getDate() + (view === "week" ? 7 : 1)); return n })
  }

  const filterBookings = (list: Booking[]) =>
    filterStaffId ? list.filter(b => b.staff?.id === filterStaffId) : list

  const displayBookings = filterBookings(
    view === "week"
      ? bookings.filter(b => b.date >= weekStart && b.date <= weekEnd && b.status !== "CANCELLED")
      : bookings.filter(b => b.date === dayStr && b.status !== "CANCELLED")
  )

  async function updateStatus(bookingId: string, status: "CONFIRMED" | "CANCELLED") {
    setUpdatingStatus(true)
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b))
      setSelectedBooking(prev => prev?.id === bookingId ? { ...prev, status } : prev)
      toast({ title: status === "CONFIRMED" ? "RDV confirmé" : "RDV annulé", variant: "success" })
    }
    setUpdatingStatus(false)
  }

  async function copyCalendarUrl() {
    if (!calendarUrl) return
    await navigator.clipboard.writeText(calendarUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function regenerateToken() {
    setRegenerating(true)
    const res = await fetch(`/api/calendar/token${bizParam}`, { method: "POST" })
    const data = await res.json()
    setCalendarToken(data.token)
    setRegenerating(false)
    toast({ title: "Lien régénéré — l'ancien lien ne fonctionne plus", variant: "success" })
  }

  // ─── BOOKING DETAIL PANEL ────────────────────────────────────────────────────
  const BookingPanel = () => {
    if (!selectedBooking) return null
    const b = selectedBooking
    const colors = STATUS_COLORS[b.status]
    const duration = b.service?.duration ?? 60
    const dateLabel = new Date(b.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })

    return (
      <div className="fixed inset-0 z-50" onClick={() => setSelectedBooking(null)}>
        <div className="absolute inset-0 bg-slate-900/30" />
        <div
          className="absolute top-0 right-0 bottom-0 w-96 bg-white shadow-2xl flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold border"
                style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}>
                {b.status === "PENDING" ? "En attente" : b.status === "CONFIRMED" ? "Confirmé" : "Annulé"}
              </span>
              {b.paymentStatus === "PAID" && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  💳 Payé{b.depositAmount ? ` ${b.depositAmount.toFixed(2)}€` : ""}
                </span>
              )}
            </div>
            <button onClick={() => setSelectedBooking(null)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400">
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <p className="text-xl font-bold text-slate-900">{b.clientName}</p>
              <p className="text-sm text-slate-500 mt-0.5">{b.clientEmail}</p>
              {b.clientPhone && <p className="text-sm text-slate-500">{b.clientPhone}</p>}
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-900 capitalize">{dateLabel}</p>
                  <p className="text-xs text-slate-500">{b.timeSlot} · {duration} min</p>
                </div>
              </div>
              {b.service && (
                <div className="flex items-center gap-2.5">
                  <Scissors className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{b.service.name}</p>
                    <p className="text-xs text-slate-500">{b.service.price.toFixed(2)} €</p>
                  </div>
                </div>
              )}
              {b.staff && (
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full shrink-0" style={{ background: b.staff.color }} />
                  <p className="text-sm text-slate-900">{b.staff.name}</p>
                </div>
              )}
              {b.partySize && (
                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <p className="text-sm text-slate-900">{b.partySize} personne{b.partySize > 1 ? "s" : ""}</p>
                </div>
              )}
            </div>

            {b.notes && (
              <div className="bg-amber-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-800 mb-1">Note client</p>
                <p className="text-sm text-amber-700">{b.notes}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          {b.status !== "CANCELLED" && (
            <div className="flex gap-2.5 px-5 py-4 border-t border-slate-100">
              {b.status === "PENDING" && (
                <button onClick={() => updateStatus(b.id, "CONFIRMED")} disabled={updatingStatus}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors disabled:opacity-60">
                  <CheckCircle2 className="w-4 h-4" /> Confirmer
                </button>
              )}
              <button onClick={() => updateStatus(b.id, "CANCELLED")} disabled={updatingStatus}
                className={`${b.status === "PENDING" ? "" : "flex-1"} flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-red-50 text-red-500 font-semibold text-sm border border-red-200 transition-colors disabled:opacity-60`}>
                <XCircle className="w-4 h-4" /> Annuler
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── SYNC PHONE PANEL ────────────────────────────────────────────────────────
  const SyncPanel = () => {
    const [copiedKey, setCopiedKey] = useState<string | null>(null)

    async function copyUrl(url: string, key: string) {
      await navigator.clipboard.writeText(url)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    }

    function CalendarRow({ label, url, colorDot, rowKey }: { label: string; url: string; colorDot?: string; rowKey: string }) {
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {colorDot && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: colorDot }} />}
            <span className="text-xs text-slate-600 font-medium truncate">{label}</span>
          </div>
          <button
            onClick={() => copyUrl(url, rowKey)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${
              copiedKey === rowKey ? "bg-emerald-500 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            {copiedKey === rowKey ? <><Check className="w-3 h-3" /> Copié</> : <><Copy className="w-3 h-3" /> Copier</>}
          </button>
        </div>
      )
    }

    return (
      <div className="fixed inset-0 z-50" onClick={() => setShowSync(false)}>
        <div className="absolute inset-0 bg-slate-900/30" />
        <div className="absolute top-0 right-0 bottom-0 w-[420px] bg-white shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-5 h-5 text-sky-500" />
              <p className="font-bold text-base text-slate-900">Sync calendrier téléphone</p>
            </div>
            <button onClick={() => setShowSync(false)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400">
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
            <p className="text-sm text-slate-500">
              Chaque prestataire peut syncer <strong>uniquement ses propres RDV</strong> sur son téléphone. Le lien général contient tous les RDV.
            </p>

            {/* Lien général */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Lien général</p>
              <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                {calendarUrl && (
                  <CalendarRow label="Tous les RDV" url={calendarUrl} rowKey="general" />
                )}
              </div>
            </div>

            {/* Liens par prestataire */}
            {staffTokens.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Par prestataire</p>
                <div className="bg-slate-50 rounded-xl p-3 space-y-2.5">
                  {staffTokens.map(s => (
                    <CalendarRow
                      key={s.id}
                      label={s.name}
                      url={`${APP_URL}/api/calendar/${s.token}`}
                      colorDot={s.color}
                      rowKey={s.id}
                    />
                  ))}
                </div>
                <p className="text-xs text-slate-400">Partagez uniquement le lien personnel de chaque employé — il ne verra que ses RDV.</p>
              </div>
            )}

            {/* Instructions */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Comment syncer</p>
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
                <p className="text-sm font-bold text-sky-800 mb-2">📱 iPhone / iPad (Apple Calendar)</p>
                <ol className="text-xs text-sky-900 space-y-1 pl-4 list-decimal leading-relaxed">
                  <li>Copiez le lien souhaité</li>
                  <li>Ouvrez <strong>Réglages → Calendrier → Comptes</strong></li>
                  <li>Appuyez sur <strong>Ajouter un compte → Autre</strong></li>
                  <li>Appuyez sur <strong>Ajouter un calendrier avec abonnement</strong></li>
                  <li>Collez le lien et appuyez sur <strong>Suivant</strong></li>
                </ol>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-sm font-bold text-emerald-800 mb-2">📅 Google Calendar (Android)</p>
                <ol className="text-xs text-emerald-900 space-y-1 pl-4 list-decimal leading-relaxed">
                  <li>Copiez le lien souhaité</li>
                  <li>Sur ordinateur, ouvrez <strong>calendar.google.com</strong></li>
                  <li>Cliquez sur <strong>+ → Depuis une URL</strong></li>
                  <li>Collez le lien et cliquez <strong>Ajouter un calendrier</strong></li>
                </ol>
              </div>

              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                <p className="text-sm font-bold text-violet-800 mb-2">🖥 Outlook / Windows</p>
                <ol className="text-xs text-violet-900 space-y-1 pl-4 list-decimal leading-relaxed">
                  <li>Copiez le lien souhaité</li>
                  <li>Dans Outlook, allez dans <strong>Calendrier</strong></li>
                  <li>Cliquez <strong>Ajouter un calendrier → Depuis Internet</strong></li>
                  <li>Collez le lien et confirmez</li>
                </ol>
              </div>
            </div>

            {/* Régénérer lien général */}
            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-400 mb-3">Régénérer le lien général révoque l&apos;accès à l&apos;ancien. Les liens individuels des prestataires ne sont pas affectés.</p>
              <button onClick={regenerateToken} disabled={regenerating}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-red-200 bg-white text-red-500 text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-60">
                <RefreshCw className="w-3.5 h-3.5" /> {regenerating ? "Régénération..." : "Régénérer le lien général"}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── VUE SEMAINE ──────────────────────────────────────────────────────────────
  const WeekView = () => (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col" style={{ maxHeight: "calc(100vh - 200px)" }}>
      {/* Headers jours */}
      <div className="grid border-b border-slate-200 flex-shrink-0" style={{ gridTemplateColumns: `48px repeat(6, 1fr)` }}>
        <div className="border-r border-slate-100" />
        {weekDates.map((d, i) => {
          const ds = toDateStr(d)
          const isToday = ds === todayStr
          const count = displayBookings.filter(b => b.date === ds).length
          return (
            <button key={i} onClick={() => { setRef(d); setView("day") }}
              className={`py-2.5 px-1 text-center border-r border-slate-100 last:border-0 hover:bg-slate-50 transition-colors ${isToday ? "bg-sky-50" : ""}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide ${isToday ? "text-sky-600" : "text-slate-400"}`}>{DAY_LABELS[d.getDay()]}</p>
              <p className={`text-base font-bold mt-0.5 ${isToday ? "text-sky-600" : "text-slate-800"}`}>{d.getDate()}</p>
              {count > 0 && <p className="text-xs text-slate-400 mt-0.5">{count} RDV</p>}
            </button>
          )
        })}
      </div>

      {/* Grid */}
      <div className="overflow-y-auto flex-1">
        <div className="relative grid" style={{ gridTemplateColumns: `48px repeat(6, 1fr)` }}>
          {/* Heures */}
          <div className="relative border-r border-slate-100">
            {HOURS.map(h => (
              <div key={h} style={{ height: SLOT_HEIGHT }} className="border-b border-slate-100 flex items-start justify-end pr-2 pt-1">
                <span className="text-xs text-slate-400">{String(h).padStart(2, "0")}h</span>
              </div>
            ))}
          </div>

          {/* Colonnes jours */}
          {weekDates.map((d, colIdx) => {
            const ds = toDateStr(d)
            const isToday = ds === todayStr
            const dayBookings = displayBookings.filter(b => b.date === ds)
            const dayAbsences = filterStaffId
              ? absences.filter(a => a.staffId === filterStaffId && ds >= a.startDate && ds <= a.endDate)
              : absences.filter(a => ds >= a.startDate && ds <= a.endDate)

            // Group overlapping bookings for side-by-side display
            const overlapGroups = groupOverlapping(dayBookings)
            // Build a map: bookingId -> { groupSize, indexInGroup }
            const overlapMap = new Map<string, { total: number; idx: number }>()
            for (const group of overlapGroups) {
              group.forEach((b, idx) => overlapMap.set(b.id, { total: group.length, idx }))
            }

            return (
              <div key={colIdx} className={`relative border-r border-slate-100 last:border-0 ${isToday ? "bg-sky-50/20" : ""}`} style={{ height: HOURS.length * SLOT_HEIGHT }}>
                {HOURS.map((_, hi) => (
                  <div key={hi} style={{ position: "absolute", top: hi * SLOT_HEIGHT, left: 0, right: 0, borderTop: "1px solid #f8fafc" }} />
                ))}

                {/* Ligne maintenant */}
                {isToday && (() => {
                  const now = new Date()
                  const top = ((now.getHours() * 60 + now.getMinutes() - 7 * 60) / 60) * SLOT_HEIGHT
                  return top >= 0 ? (
                    <div style={{ position: "absolute", top, left: 0, right: 0, height: 2, background: "#ef4444", zIndex: 5 }}>
                      <div style={{ position: "absolute", left: -3, top: -3, width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
                    </div>
                  ) : null
                })()}

                {/* Blocs absence */}
                {dayAbsences.map((ab, ai) => {
                  const staffForAbsence = staffs.find(s => s.id === ab.staffId)
                  return (
                    <div key={ai} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: ABSENCE_COLORS[ab.type] ?? "#f1f5f9", opacity: 0.6, zIndex: 1, display: "flex", alignItems: "flex-start", padding: "4px 4px" }}>
                      <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {staffForAbsence ? `${staffForAbsence.name} — ` : ""}{ABSENCE_LABELS[ab.type]}
                      </span>
                    </div>
                  )
                })}

                {/* RDVs — avec gestion des overlaps */}
                {dayBookings.map(booking => {
                  const slotMin = toMin(booking.timeSlot)
                  const duration = booking.service?.duration ?? 60
                  const top    = ((slotMin - 7 * 60) / 60) * SLOT_HEIGHT
                  const height = Math.max((duration / 60) * SLOT_HEIGHT - 2, 18)
                  const colors = STATUS_COLORS[booking.status]
                  const overlap = overlapMap.get(booking.id) ?? { total: 1, idx: 0 }
                  const widthPct = 100 / overlap.total
                  const leftPct  = widthPct * overlap.idx

                  return (
                    <button key={booking.id} onClick={() => setSelectedBooking(booking)}
                      style={{
                        position: "absolute",
                        top: top + 1,
                        left: `calc(${leftPct}% + 2px)`,
                        width: `calc(${widthPct}% - 4px)`,
                        height,
                        background: colors.bg,
                        border: `1px solid ${colors.border}`,
                        borderLeft: `3px solid ${booking.staff?.color ?? "#0ea5e9"}`,
                        borderRadius: 5,
                        padding: "2px 5px",
                        overflow: "hidden",
                        zIndex: 2,
                        cursor: "pointer",
                        textAlign: "left",
                      }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: colors.text, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {booking.timeSlot} {booking.clientName}
                      </p>
                      {height > 26 && (
                        <p style={{ fontSize: 9, color: colors.text, opacity: 0.75, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {booking.service?.name ?? (booking.partySize ? `${booking.partySize} pers.` : "RDV")}
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  // ─── VUE JOURNALIÈRE — Colonnes par prestataire ──────────────────────────────
  const DayView = () => {
    const visibleStaffs = filterStaffId ? staffs.filter(s => s.id === filterStaffId) : staffs

    // End-time helper
    function endTime(timeSlot: string, duration: number) {
      const m = toMin(timeSlot) + duration
      return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
    }

    // Bookings without a staff assignment
    const unassigned = displayBookings
      .filter(b => !b.staff)
      .sort((a, b) => toMin(a.timeSlot) - toMin(b.timeSlot))

    // Columns: one per staff + optionally unassigned
    const columns: Array<{ key: string; label: string; color: string; bookings: Booking[]; absent: boolean }> = [
      ...visibleStaffs.map(s => ({
        key: s.id,
        label: s.name,
        color: s.color,
        bookings: displayBookings
          .filter(b => b.staff?.id === s.id)
          .sort((a, b) => toMin(a.timeSlot) - toMin(b.timeSlot)),
        absent: isAbsent(absences, s.id, dayStr),
      })),
      ...(unassigned.length > 0 && !filterStaffId
        ? [{ key: "__none__", label: "Non assigné", color: "#94a3b8", bookings: unassigned, absent: false }]
        : []),
    ]

    // Fallback — no staff configured, show plain list
    const noStaff = staffs.length === 0

    return (
      <div
        className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col"
        style={{ maxHeight: "calc(100vh - 200px)" }}
      >
        {/* Date header */}
        <div className="px-5 py-4 border-b border-slate-100 flex-shrink-0 flex items-center justify-between">
          <h2 className="font-bold text-lg text-slate-900 capitalize">
            {ref.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </h2>
          <span className="text-xs text-slate-400 font-medium">{displayBookings.length} RDV</span>
        </div>

        {noStaff ? (
          /* ── Pas de staff : liste simple ── */
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {displayBookings.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">Aucun RDV ce jour</div>
            ) : (
              displayBookings
                .sort((a, b) => toMin(a.timeSlot) - toMin(b.timeSlot))
                .map(booking => {
                  const dur = booking.service?.duration ?? 60
                  const colors = STATUS_COLORS[booking.status]
                  return (
                    <button key={booking.id} onClick={() => setSelectedBooking(booking)}
                      className="w-full text-left rounded-xl p-3.5 transition-all hover:brightness-95"
                      style={{ background: colors.bg, border: `1px solid ${colors.border}` }}>
                      <p className="font-bold text-sm" style={{ color: colors.text }}>
                        {booking.timeSlot} - {endTime(booking.timeSlot, dur)}
                      </p>
                      <p className="text-sm mt-0.5" style={{ color: colors.text, opacity: 0.85 }}>{booking.clientName}</p>
                      {booking.service && (
                        <p className="text-xs mt-0.5" style={{ color: colors.text, opacity: 0.6 }}>{booking.service.name}</p>
                      )}
                    </button>
                  )
                })
            )}
          </div>
        ) : (
          /* ── Colonnes par prestataire ── */
          <div className="flex overflow-x-auto overflow-y-auto flex-1 divide-x divide-slate-100">
            {columns.map(col => (
              <div key={col.key} className="flex flex-col min-w-[260px] w-full">
                {/* Staff header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/60 flex-shrink-0">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0 select-none"
                    style={{ background: col.color }}
                  >
                    {col.label.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{col.label}</p>
                    {col.absent ? (
                      <p className="text-xs text-rose-500 font-medium">Absent aujourd&apos;hui</p>
                    ) : (
                      <p className="text-xs text-slate-400">{col.bookings.length} RDV</p>
                    )}
                  </div>
                </div>

                {/* Booking cards */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {col.absent ? (
                    <div className="py-10 text-center">
                      <p className="text-sm text-slate-400">Absent</p>
                    </div>
                  ) : col.bookings.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-sm text-slate-300">Aucun RDV</p>
                    </div>
                  ) : (
                    col.bookings.map(booking => {
                      const dur = booking.service?.duration ?? 60
                      const colors = STATUS_COLORS[booking.status]
                      return (
                        <button
                          key={booking.id}
                          onClick={() => setSelectedBooking(booking)}
                          className="w-full text-left rounded-xl p-3.5 transition-all hover:shadow-sm hover:brightness-95 active:scale-[0.98]"
                          style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
                        >
                          <p className="font-bold text-sm" style={{ color: colors.text }}>
                            {booking.timeSlot} - {endTime(booking.timeSlot, dur)}
                          </p>
                          <p className="text-sm mt-0.5 font-medium" style={{ color: colors.text, opacity: 0.85 }}>
                            {booking.clientName}
                          </p>
                          {booking.service && (
                            <p className="text-xs mt-1" style={{ color: colors.text, opacity: 0.6 }}>
                              {booking.service.name}
                            </p>
                          )}
                          {booking.partySize && (
                            <p className="text-xs mt-1" style={{ color: colors.text, opacity: 0.6 }}>
                              {booking.partySize} personne{booking.partySize > 1 ? "s" : ""}
                            </p>
                          )}
                          {booking.paymentStatus === "PAID" && (
                            <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
                              💳 Payé
                            </span>
                          )}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FAB */}
        <a
          href={`/bookings${bizParamLink}`}
          className="absolute bottom-5 right-5 w-12 h-12 rounded-full bg-sky-500 hover:bg-sky-600 text-white shadow-lg flex items-center justify-center transition-colors z-10"
          title="Nouveau RDV"
        >
          <Plus className="w-5 h-5" />
        </a>
      </div>
    )
  }

  const periodLabel = view === "week"
    ? `${weekDates[0].toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} – ${weekDates[5].toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`
    : ref.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agenda</h1>
          <p className="text-slate-500 text-sm mt-0.5 capitalize">{periodLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowSync(true)} className="gap-1.5 text-xs">
            <Smartphone className="w-3 h-3" /> Sync téléphone
          </Button>
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

      {/* Staff filter pills */}
      {staffs.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterStaffId(null)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${filterStaffId === null ? "bg-sky-500 text-white border-sky-500" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}>
            Tous
          </button>
          {staffs.map(s => (
            <button key={s.id} onClick={() => setFilterStaffId(filterStaffId === s.id ? null : s.id)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all"
              style={{
                borderColor: filterStaffId === s.id ? s.color : "#e2e8f0",
                background: filterStaffId === s.id ? s.color : "#fff",
                color: filterStaffId === s.id ? "#fff" : "#64748b",
              }}>
              <span className="w-2 h-2 rounded-full" style={{ background: filterStaffId === s.id ? "#fff" : s.color }} />
              {s.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse" style={{ minHeight: 400 }}>
          <div className="grid border-b border-slate-200" style={{ gridTemplateColumns: "48px repeat(6, 1fr)" }}>
            <div className="border-r border-slate-100 h-14" />
            {[...Array(6)].map((_, i) => (
              <div key={i} className="border-r border-slate-100 last:border-0 h-14 flex flex-col items-center justify-center gap-1.5">
                <div className="h-2.5 w-6 bg-slate-200 rounded" />
                <div className="h-5 w-7 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-100 rounded-xl" style={{ marginLeft: `${(i % 3) * 16}%`, width: `${40 + (i % 2) * 20}%` }} />
            ))}
          </div>
        </div>
      ) : view === "week" ? <WeekView /> : <DayView />}

      {selectedBooking && <BookingPanel />}
      {showSync && <SyncPanel />}
    </div>
  )
}
