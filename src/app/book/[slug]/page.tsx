"use client"

import { use, useEffect, useState } from "react"
import {
  CheckCircle2, ChevronLeft, ChevronRight, Clock, CreditCard, MapPin,
  Star, Sparkles, Lock, Calendar, Users
} from "lucide-react"

interface Service { id: string; name: string; description: string | null; duration: number; price: number }
interface Staff   { id: string; name: string; color: string }
interface BusinessInfo {
  businessId: string; businessName: string; logoDataUrl: string | null
  pageTheme: string; pageTagline: string | null; pageAccentColor: string | null
  maxDaysAhead: number; bookingType: string; bookingMaxCovers: number | null
  paymentEnabled: boolean; depositType: string; depositValue: number; stripeReady: boolean
}

type Step = "service" | "staff" | "datetime" | "form" | "payment" | "done"

// ─── Theme System ──────────────────────────────────────────────────────────────

type ThemeKey = "default" | "hello_kitty" | "barber" | "manga"

interface ThemeConfig {
  // Page
  pageBg: string
  // Sidebar (desktop left panel)
  sidebarBg: string
  sidebarBorder: string
  // Cards
  cardBg: string
  cardBorder: string
  // Primary (buttons, selected state, progress bar)
  primary: string
  primaryHover: string
  primaryText: string
  primaryShadow: string
  // Text
  textHeading: string
  textBody: string
  textMuted: string
  // Inputs
  inputBorder: string
  inputFocusBorder: string
  inputBg: string
  // Step indicator (sidebar)
  stepDone: string
  stepActive: string
  stepFuture: string
  // Decorative
  accentEmoji: string
  fontStyle: string
  badgeText: string
  badgeBg: string
  badgeTextColor: string
}

const THEMES: Record<ThemeKey, ThemeConfig> = {
  default: {
    pageBg: "#f8fafc",
    sidebarBg: "#ffffff",
    sidebarBorder: "#f1f5f9",
    cardBg: "#ffffff",
    cardBorder: "#f1f5f9",
    primary: "#0ea5e9",
    primaryHover: "#0284c7",
    primaryText: "#ffffff",
    primaryShadow: "rgba(14,165,233,0.25)",
    textHeading: "#0f172a",
    textBody: "#334155",
    textMuted: "#94a3b8",
    inputBorder: "#e2e8f0",
    inputFocusBorder: "#0ea5e9",
    inputBg: "#ffffff",
    stepDone: "#0ea5e9",
    stepActive: "#0ea5e9",
    stepFuture: "#e2e8f0",
    accentEmoji: "✨",
    fontStyle: "Moderne",
    badgeText: "Standard",
    badgeBg: "#f0f9ff",
    badgeTextColor: "#0369a1",
  },
  hello_kitty: {
    pageBg: "#fce4ec",
    sidebarBg: "#fce4ec",
    sidebarBorder: "#f48fb1",
    cardBg: "#fff0f6",
    cardBorder: "#f48fb1",
    primary: "#e91e8c",
    primaryHover: "#c2185b",
    primaryText: "#ffffff",
    primaryShadow: "rgba(233,30,140,0.35)",
    textHeading: "#880e4f",
    textBody: "#ad1457",
    textMuted: "#f48fb1",
    inputBorder: "#f48fb1",
    inputFocusBorder: "#e91e8c",
    inputBg: "#fce4ec",
    stepDone: "#e91e8c",
    stepActive: "#e91e8c",
    stepFuture: "#f8bbd0",
    accentEmoji: "🎀",
    fontStyle: "Kawaii",
    badgeText: "Hello Kitty",
    badgeBg: "#f8bbd0",
    badgeTextColor: "#880e4f",
  },
  barber: {
    pageBg: "#0f172a",
    sidebarBg: "#1e293b",
    sidebarBorder: "#334155",
    cardBg: "#1e293b",
    cardBorder: "#334155",
    primary: "#f59e0b",
    primaryHover: "#d97706",
    primaryText: "#0f172a",
    primaryShadow: "rgba(245,158,11,0.30)",
    textHeading: "#f8fafc",
    textBody: "#cbd5e1",
    textMuted: "#64748b",
    inputBorder: "#334155",
    inputFocusBorder: "#f59e0b",
    inputBg: "#0f172a",
    stepDone: "#f59e0b",
    stepActive: "#f59e0b",
    stepFuture: "#334155",
    accentEmoji: "✂️",
    fontStyle: "Élégant",
    badgeText: "Barber Shop",
    badgeBg: "#1e293b",
    badgeTextColor: "#f59e0b",
  },
  manga: {
    pageBg: "#ffffff",
    sidebarBg: "#fafafa",
    sidebarBorder: "#e5e7eb",
    cardBg: "#ffffff",
    cardBorder: "#111827",
    primary: "#dc2626",
    primaryHover: "#b91c1c",
    primaryText: "#ffffff",
    primaryShadow: "rgba(220,38,38,0.25)",
    textHeading: "#111827",
    textBody: "#1f2937",
    textMuted: "#6b7280",
    inputBorder: "#111827",
    inputFocusBorder: "#dc2626",
    inputBg: "#ffffff",
    stepDone: "#dc2626",
    stepActive: "#dc2626",
    stepFuture: "#e5e7eb",
    accentEmoji: "⚡",
    fontStyle: "Manga",
    badgeText: "Manga",
    badgeBg: "#fef2f2",
    badgeTextColor: "#dc2626",
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Spinner({ color }: { color?: string }) {
  return (
    <div
      className="w-8 h-8 rounded-full border-2 animate-spin mx-auto"
      style={{ borderColor: color ? `${color}33` : "#e2e8f0", borderTopColor: color ?? "#0ea5e9" }}
    />
  )
}

function getDatesAhead(n: number): string[] {
  const dates: string[] = []
  const today = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    dates.push(d.toISOString().split("T")[0])
  }
  return dates
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })
}

function fmtDateLong(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
}

function groupSlots(slots: string[]) {
  const morning   = slots.filter(s => parseInt(s) < 12)
  const afternoon = slots.filter(s => parseInt(s) >= 12 && parseInt(s) < 17)
  const evening   = slots.filter(s => parseInt(s) >= 17)
  return { morning, afternoon, evening }
}

function getCalendarDays(month: Date): string[] {
  const year = month.getFullYear()
  const m = month.getMonth()
  const firstDay = new Date(year, m, 1)
  // Monday = 0 offset
  let startOffset = firstDay.getDay() - 1
  if (startOffset < 0) startOffset = 6
  const days: string[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(year, m, 1 - startOffset + i)
    days.push(d.toISOString().split("T")[0])
  }
  return days
}

const SERVICE_ACCENTS_DEFAULT = [
  "bg-sky-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500"
]
const SERVICE_ACCENTS_BARBER = [
  "bg-amber-500", "bg-amber-400", "bg-yellow-500", "bg-amber-600", "bg-yellow-400"
]
const SERVICE_ACCENTS_MANGA = [
  "bg-red-600", "bg-red-500", "bg-rose-600", "bg-red-700", "bg-rose-500"
]

// ─── Animated SVG Checkmark ────────────────────────────────────────────────────

function AnimatedCheckmark() {
  return (
    <>
      <style>{`
        @keyframes drawCircle {
          from { stroke-dashoffset: 283; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes drawCheck {
          from { stroke-dashoffset: 80; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes confettiFly {
          0%   { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translateY(-120px) rotate(720deg) scale(0); opacity: 0; }
        }
        .draw-circle {
          stroke-dasharray: 283;
          stroke-dashoffset: 283;
          animation: drawCircle 0.7s cubic-bezier(0.65,0,0.35,1) 0.1s forwards;
        }
        .draw-check {
          stroke-dasharray: 80;
          stroke-dashoffset: 80;
          animation: drawCheck 0.4s cubic-bezier(0.65,0,0.35,1) 0.75s forwards;
        }
        .confetti-piece {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 2px;
          animation: confettiFly 1.2s ease-out forwards;
        }
      `}</style>
      {/* Confetti */}
      <div className="relative flex items-center justify-center">
        {[
          { color: "#38bdf8", top: "50%", left: "50%", delay: "0.8s",  angle: "-60deg" },
          { color: "#a78bfa", top: "50%", left: "50%", delay: "0.9s",  angle: "-30deg" },
          { color: "#34d399", top: "50%", left: "50%", delay: "0.85s", angle: "0deg"   },
          { color: "#fbbf24", top: "50%", left: "50%", delay: "0.95s", angle: "30deg"  },
          { color: "#f472b6", top: "50%", left: "50%", delay: "1.0s",  angle: "60deg"  },
          { color: "#38bdf8", top: "50%", left: "50%", delay: "1.05s", angle: "90deg"  },
          { color: "#a78bfa", top: "50%", left: "50%", delay: "0.88s", angle: "-90deg" },
          { color: "#34d399", top: "50%", left: "50%", delay: "0.92s", angle: "120deg" },
          { color: "#fbbf24", top: "50%", left: "50%", delay: "1.1s",  angle: "-120deg"},
          { color: "#f472b6", top: "50%", left: "50%", delay: "0.83s", angle: "150deg" },
          { color: "#38bdf8", top: "50%", left: "50%", delay: "1.15s", angle: "-150deg"},
          { color: "#a78bfa", top: "50%", left: "50%", delay: "1.0s",  angle: "180deg" },
        ].map((c, i) => (
          <span
            key={i}
            className="confetti-piece"
            style={{
              backgroundColor: c.color,
              animationDelay: c.delay,
              transform: `rotate(${c.angle}) translateY(0)`,
              transformOrigin: "center bottom",
              top: "50%",
              left: `${42 + i * 1.5}%`,
              marginLeft: "-5px",
              marginTop: "-5px",
            }}
          />
        ))}
        <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="48" cy="48" r="44" stroke="#d1fae5" strokeWidth="6" fill="#ecfdf5" />
          <circle
            cx="48" cy="48" r="44"
            stroke="#10b981"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            className="draw-circle"
            style={{ transformOrigin: "48px 48px", transform: "rotate(-90deg)" }}
          />
          <path
            d="M28 48 L42 62 L68 36"
            stroke="#10b981"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            className="draw-check"
          />
        </svg>
      </div>
    </>
  )
}

// ─── Booking Recap Card (left sidebar) ────────────────────────────────────────

function RecapCard({
  selectedService, selectedStaff, anyStaff, selectedDate, selectedSlot, partySize, isRestaurant, T,
}: {
  selectedService: Service | null
  selectedStaff: Staff | null
  anyStaff: boolean
  selectedDate: string
  selectedSlot: string
  partySize: number
  isRestaurant: boolean
  T: ThemeConfig
}) {
  const hasAny = isRestaurant ? (selectedDate || selectedSlot) : (selectedService || selectedDate || selectedSlot)
  if (!hasAny) return null

  return (
    <div
      className="rounded-2xl shadow-sm p-4 mt-6 space-y-3 animate-in fade-in duration-300"
      style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: T.textMuted }}>Récapitulatif</p>
      {!isRestaurant && selectedService && (
        <div className="flex items-start gap-2 animate-in fade-in duration-200">
          <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: T.primary }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: T.textHeading }}>{selectedService.name}</p>
            <p className="text-xs" style={{ color: T.textMuted }}>{selectedService.duration} min · {selectedService.price.toFixed(2)} €</p>
          </div>
        </div>
      )}
      {isRestaurant && (
        <div className="flex items-center gap-2 animate-in fade-in duration-200">
          <Users className="w-4 h-4 flex-shrink-0" style={{ color: T.primary }} />
          <p className="text-sm font-semibold" style={{ color: T.textHeading }}>{partySize} personne{partySize > 1 ? "s" : ""}</p>
        </div>
      )}
      {!isRestaurant && (selectedService && selectedStaff && !anyStaff) && (
        <div className="flex items-center gap-2 animate-in fade-in duration-200">
          <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: selectedStaff.color }} />
          <p className="text-sm" style={{ color: T.textBody }}>{selectedStaff.name}</p>
        </div>
      )}
      {selectedDate && (
        <div className="flex items-center gap-2 animate-in fade-in duration-200">
          <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: T.primary }} />
          <p className="text-sm" style={{ color: T.textBody }}>{fmtDate(selectedDate)}</p>
        </div>
      )}
      {selectedSlot && (
        <div className="flex items-center gap-2 animate-in fade-in duration-200">
          <Clock className="w-4 h-4 flex-shrink-0" style={{ color: T.primary }} />
          <p className="text-sm font-semibold" style={{ color: T.textHeading }}>{selectedSlot}</p>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)

  const [info, setInfo] = useState<BusinessInfo | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [staffs, setStaffs] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [step, setStep] = useState<Step>("service")
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [anyStaff, setAnyStaff] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string>("")
  const [partySize, setPartySize] = useState(2)

  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null)
  const [payingOnline, setPayingOnline] = useState(false)

  // Calendar navigation
  const [calMonth, setCalMonth] = useState<Date>(() => new Date())

  useEffect(() => {
    Promise.all([
      fetch(`/api/r/${slug}`).then(r => r.json()),
      fetch(`/api/book/${slug}`).then(r => r.json()),
    ]).then(([pageData, bookData]) => {
      if (pageData.error || !bookData.bookingEnabled) { setNotFound(true); setLoading(false); return }
      const maxDaysAhead = (bookData.bookingSettings as { maxDaysAhead?: number } | null)?.maxDaysAhead ?? 60
      const bSettings = (bookData.bookingSettings ?? {}) as Record<string, unknown>
      setInfo({
        businessId: pageData.businessId,
        businessName: pageData.businessName,
        logoDataUrl: pageData.logoDataUrl,
        pageTheme: pageData.pageTheme ?? "default",
        pageTagline: pageData.pageTagline ?? null,
        pageAccentColor: pageData.pageAccentColor ?? null,
        maxDaysAhead,
        bookingType: bookData.bookingType ?? "appointment",
        bookingMaxCovers: bookData.bookingMaxCovers ?? null,
        paymentEnabled: !!(bSettings.paymentEnabled) && !!(bookData.stripeAccountStatus === "active"),
        depositType: (bSettings.depositType as string) ?? "full",
        depositValue: (bSettings.depositValue as number) ?? 100,
        stripeReady: bookData.stripeAccountStatus === "active",
      })
      setServices(bookData.services ?? [])
      setStaffs(bookData.staffs ?? [])
      if (bookData.bookingType === "restaurant") setStep("datetime")
      setLoading(false)
    }).catch(() => { setNotFound(true); setLoading(false) })
  }, [slug])

  useEffect(() => {
    if (!info || !selectedDate) return
    if (info.bookingType === "appointment" && !selectedService) return
    setLoadingSlots(true)
    setSlots([])
    setSelectedSlot("")
    const staffId = (anyStaff || !selectedStaff) ? "" : selectedStaff?.id ?? ""
    const svcParam = selectedService ? `&serviceId=${selectedService.id}` : ""
    const staffParam = staffId ? `&staffId=${staffId}` : ""
    fetch(`/api/availability?businessId=${info.businessId}&date=${selectedDate}${svcParam}${staffParam}`)
      .then(r => r.json()).then(d => { setSlots(d.slots ?? []); setLoadingSlots(false) })
  }, [selectedService, selectedStaff, anyStaff, selectedDate, info])

  async function submit() {
    if (!info || !selectedDate || !selectedSlot) return
    if (info.bookingType === "appointment" && !selectedService) return
    setSubmitting(true)
    setSubmitError("")
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId: info.businessId,
        serviceId: selectedService?.id ?? null,
        staffId: anyStaff ? null : (selectedStaff?.id ?? null),
        clientName: form.name,
        clientEmail: form.email,
        clientPhone: form.phone || null,
        date: selectedDate,
        timeSlot: selectedSlot,
        notes: form.notes || null,
        partySize: info.bookingType === "restaurant" ? partySize : null,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      if (info?.paymentEnabled && data.booking?.id) {
        setCreatedBookingId(data.booking.id)
        setStep("payment")
      } else {
        setStep("done")
      }
    } else {
      setSubmitError(data.error ?? "Une erreur est survenue")
    }
    setSubmitting(false)
  }

  async function payOnline() {
    if (!createdBookingId) return
    setPayingOnline(true)
    const checkoutRes = await fetch("/api/bookings/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: createdBookingId }),
    })
    const checkoutData = await checkoutRes.json()
    if (checkoutData.url) {
      window.location.href = checkoutData.url
    } else {
      setPayingOnline(false)
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-svh bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <Spinner />
        <p className="text-sm text-slate-400 mt-4">Chargement…</p>
      </div>
    </div>
  )

  if (notFound) return (
    <div className="min-h-svh bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-200 flex items-center justify-center mx-auto mb-4">
          <Star className="w-8 h-8 text-slate-400" />
        </div>
        <p className="font-semibold text-slate-700">Page introuvable</p>
        <p className="text-sm text-slate-400 mt-1">Cette page de réservation n&apos;existe pas ou a été désactivée.</p>
      </div>
    </div>
  )

  // ── Theme resolution ──────────────────────────────────────────────────────────

  const themeKey = (info?.pageTheme ?? "default") as ThemeKey
  const baseTheme = THEMES[themeKey] ?? THEMES.default
  // Apply custom accent color override from settings
  const effectivePrimary = info?.pageAccentColor ?? baseTheme.primary
  const T: ThemeConfig = {
    ...baseTheme,
    primary: effectivePrimary,
    primaryHover: effectivePrimary,
    inputFocusBorder: effectivePrimary,
    stepDone: effectivePrimary,
    stepActive: effectivePrimary,
  }

  // ── Derived state ─────────────────────────────────────────────────────────────

  const isRestaurant = info?.bookingType === "restaurant"
  const hasStaff = staffs.length > 0
  const dates = getDatesAhead(info?.maxDaysAhead ?? 60)
  const maxDate = dates[dates.length - 1] ?? ""
  const todayStr = new Date().toISOString().split("T")[0]

  const paymentStep: Step[] = info?.paymentEnabled ? ["payment"] : []
  const STEPS: Step[] = isRestaurant
    ? ["datetime", "form", ...paymentStep]
    : hasStaff
      ? ["service", "staff", "datetime", "form", ...paymentStep]
      : ["service", "datetime", "form", ...paymentStep]
  const LABELS: Record<Step, string> = {
    service: "Prestation", staff: "Avec qui ?", datetime: "Date & heure",
    form: "Coordonnées", payment: "Paiement", done: "Confirmé"
  }

  const stepIdx = STEPS.indexOf(step)

  // Calendar data
  const calDays = getCalendarDays(calMonth)
  const calMonthLabel = calMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })

  function prevMonth() {
    setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  }
  function nextMonth() {
    setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))
  }

  function isDayDisabled(dayStr: string) {
    if (dayStr < todayStr) return true
    if (dayStr > maxDate) return true
    return false
  }

  // Service accent strips — decorative, vary by theme
  const serviceAccents = themeKey === "barber"
    ? SERVICE_ACCENTS_BARBER
    : themeKey === "manga"
      ? SERVICE_ACCENTS_MANGA
      : SERVICE_ACCENTS_DEFAULT

  // ── Vertical step progress (sidebar) ─────────────────────────────────────────

  function SidebarSteps() {
    return (
      <div className="flex flex-col gap-0">
        {STEPS.map((s, i) => {
          const done = i < stepIdx
          const active = s === step
          const isLast = i === STEPS.length - 1
          return (
            <div key={s} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all duration-300"
                  style={
                    done
                      ? { background: T.stepDone, color: T.primaryText }
                      : active
                        ? { background: T.sidebarBg, border: `2px solid ${T.stepActive}`, color: T.stepActive, boxShadow: `0 0 0 4px ${T.primaryShadow}` }
                        : { background: T.stepFuture, color: T.textMuted }
                  }
                >
                  {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                {!isLast && (
                  <div
                    className="w-0.5 h-8 mt-1 rounded-full transition-colors duration-300"
                    style={{ background: done ? T.stepDone : T.stepFuture }}
                  />
                )}
              </div>
              <div className="pt-0.5 pb-8">
                <p
                  className="text-sm font-medium transition-colors duration-200"
                  style={{ color: active ? T.primary : done ? T.textBody : T.textMuted }}
                >
                  {LABELS[s]}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Mobile progress bar ───────────────────────────────────────────────────────

  const progressPct = STEPS.length > 1 ? Math.round((stepIdx / (STEPS.length - 1)) * 100) : 0

  // ── Reusable Back Button ──────────────────────────────────────────────────────

  function BackBtn({ onClick }: { onClick: () => void }) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 text-sm mb-6 transition-colors group"
        style={{ color: T.textMuted }}
        onMouseEnter={e => (e.currentTarget.style.color = T.textBody)}
        onMouseLeave={e => (e.currentTarget.style.color = T.textMuted)}
      >
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Retour
      </button>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ background: T.pageBg, minHeight: "100svh" }}>

      {/* ══ Mobile sticky header (< lg) ══════════════════════════════════════════ */}
      <div
        className="lg:hidden sticky top-0 z-20 backdrop-blur-md border-b"
        style={{ background: `${T.sidebarBg}e6`, borderColor: T.sidebarBorder }}
      >
        <div className="px-4 py-3 flex items-center gap-3">
          {info?.logoDataUrl ? (
            <img src={info.logoDataUrl} className="w-8 h-8 rounded-xl object-cover shadow-sm flex-shrink-0" alt="" />
          ) : (
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
              style={{ background: T.primary, color: T.primaryText }}
            >
              {info?.businessName.charAt(0)}
            </div>
          )}
          <p className="font-bold text-sm flex-1 truncate" style={{ color: T.textHeading }}>{info?.businessName}</p>
          {step !== "done" && (
            <span className="text-xs font-medium flex-shrink-0" style={{ color: T.textMuted }}>
              {stepIdx + 1} / {STEPS.length}
            </span>
          )}
        </div>
        {step !== "done" && (
          <div className="h-0.5" style={{ background: T.stepFuture }}>
            <div
              className="h-full transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%`, background: T.primary }}
            />
          </div>
        )}
      </div>

      {/* ══ Two-column layout (lg+) ═══════════════════════════════════════════════ */}
      <div className="max-w-5xl mx-auto flex min-h-svh">

        {/* ── Left sidebar (desktop only) ───────────────────────────────────────── */}
        <aside
          className="hidden lg:flex flex-col w-80 shrink-0 sticky top-0 h-svh overflow-y-auto p-8 border-r"
          style={{ background: T.sidebarBg, borderColor: T.sidebarBorder }}
        >
          {/* Business identity */}
          <div className="mb-8">
            {/* Accent emoji only — no badge text */}
            {T.accentEmoji && (
              <div className="mb-4 text-2xl">{T.accentEmoji}</div>
            )}
            {info?.logoDataUrl ? (
              <img src={info.logoDataUrl} className="w-16 h-16 rounded-2xl object-cover shadow-md mb-4" alt="" />
            ) : (
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-md mb-4"
                style={{ background: T.primary, color: T.primaryText }}
              >
                {info?.businessName.charAt(0)}
              </div>
            )}
            <h1 className="text-2xl font-bold leading-tight" style={{ color: T.textHeading }}>{info?.businessName}</h1>
            {info?.pageTagline && (
              <p className="text-sm mt-1 leading-snug" style={{ color: T.textMuted }}>{info.pageTagline}</p>
            )}
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-600">En ligne</span>
            </div>
          </div>

          {/* Step progress */}
          {step !== "done" && <SidebarSteps />}

          {/* Live recap card */}
          {step !== "done" && (
            <RecapCard
              selectedService={selectedService}
              selectedStaff={selectedStaff}
              anyStaff={anyStaff}
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
              partySize={partySize}
              isRestaurant={isRestaurant}
              T={T}
            />
          )}

          {/* Footer */}
          <div className="mt-auto pt-8 flex items-center gap-1.5 text-xs" style={{ color: T.textMuted }}>
            <Lock className="w-3 h-3" />
            Réservation sécurisée
          </div>
        </aside>

        {/* ── Right content ─────────────────────────────────────────────────────── */}
        <main className="flex-1 px-4 lg:px-12 pt-8 pb-32 lg:pb-16">

          {/* ── STEP: Service ────────────────────────────────────────────────────── */}
          {step === "service" && !isRestaurant && (
            <div key="service" className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-8">
                <h2 className="text-3xl font-bold leading-tight" style={{ color: T.textHeading }}>Quelle prestation ?</h2>
                <p className="mt-2" style={{ color: T.textBody }}>
                  {services.length} prestation{services.length > 1 ? "s" : ""} disponible{services.length > 1 ? "s" : ""}
                </p>
              </div>

              {services.length === 0 && (
                <div className="text-center py-16" style={{ color: T.textMuted }}>
                  <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Aucune prestation disponible</p>
                </div>
              )}

              <div className="space-y-3">
                {services.map((svc, idx) => (
                  <button
                    key={svc.id}
                    onClick={() => { setSelectedService(svc); setStep(hasStaff ? "staff" : "datetime") }}
                    className="w-full hover:shadow-md rounded-2xl overflow-hidden text-left transition-all duration-200 group hover:scale-[1.01] shadow-sm"
                    style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = T.primary)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = T.cardBorder)}
                  >
                    <div className="flex items-stretch">
                      {/* Color accent strip */}
                      <div className={`w-1 flex-shrink-0 ${serviceAccents[idx % serviceAccents.length]}`} />
                      <div className="flex-1 p-4 flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-base" style={{ color: T.textHeading }}>{svc.name}</p>
                          {svc.description && (
                            <p className="text-sm mt-1 line-clamp-2" style={{ color: T.textBody }}>{svc.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-3">
                            <span
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border"
                              style={{ color: T.textMuted, background: T.pageBg, borderColor: T.cardBorder }}
                            >
                              <Clock className="w-3 h-3" /> {svc.duration} min
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 flex flex-col items-end gap-2">
                          <span className="text-lg font-bold" style={{ color: T.textHeading }}>{svc.price.toFixed(2)} €</span>
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-200"
                            style={{ background: T.stepFuture }}
                          >
                            <ChevronRight className="w-4 h-4" style={{ color: T.textMuted }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP: Staff ──────────────────────────────────────────────────────── */}
          {step === "staff" && hasStaff && (
            <div key="staff" className="animate-in fade-in slide-in-from-right-4 duration-300">
              <BackBtn onClick={() => setStep("service")} />
              <div className="mb-8">
                <h2 className="text-3xl font-bold leading-tight" style={{ color: T.textHeading }}>Avec qui ?</h2>
                <p className="mt-2" style={{ color: T.textBody }}>Choisissez votre prestataire</p>
              </div>
              <div className="space-y-3">
                {/* "Peu importe" option */}
                <button
                  onClick={() => { setAnyStaff(true); setSelectedStaff(null); setStep("datetime") }}
                  className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-200 text-left group hover:scale-[1.01]"
                  style={
                    anyStaff
                      ? { borderColor: T.primary, background: `${T.primary}18`, boxShadow: `0 4px 12px ${T.primaryShadow}` }
                      : { borderColor: T.cardBorder, background: T.cardBg }
                  }
                  onMouseEnter={e => { if (!anyStaff) e.currentTarget.style.borderColor = T.primary }}
                  onMouseLeave={e => { if (!anyStaff) e.currentTarget.style.borderColor = T.cardBorder }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{ background: T.stepFuture }}
                  >
                    <Sparkles className="w-5 h-5" style={{ color: T.textMuted }} />
                  </div>
                  <div>
                    <p className="font-bold" style={{ color: T.textHeading }}>Peu importe</p>
                    <p className="text-sm" style={{ color: T.textBody }}>Premier prestataire disponible</p>
                  </div>
                </button>

                {staffs.map(s => {
                  const isSelected = !anyStaff && selectedStaff?.id === s.id
                  return (
                    <button
                      key={s.id}
                      onClick={() => { setSelectedStaff(s); setAnyStaff(false); setStep("datetime") }}
                      className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-200 text-left hover:scale-[1.01]"
                      style={
                        isSelected
                          ? { borderColor: T.primary, background: `${T.primary}18`, boxShadow: `0 4px 12px ${T.primaryShadow}` }
                          : { borderColor: T.cardBorder, background: T.cardBg }
                      }
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = T.primary }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = T.cardBorder }}
                    >
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                        style={{ background: s.color }}
                      >
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold" style={{ color: T.textHeading }}>{s.name}</p>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Disponible
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── STEP: DateTime ───────────────────────────────────────────────────── */}
          {step === "datetime" && (
            <div key="datetime" className="animate-in fade-in slide-in-from-right-4 duration-300">
              {!isRestaurant && (
                <BackBtn onClick={() => setStep(hasStaff ? "staff" : "service")} />
              )}

              {/* Service recap pill */}
              {selectedService && (
                <div
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-6 shadow-sm"
                  style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${T.primary}18` }}
                  >
                    <Sparkles className="w-4 h-4" style={{ color: T.primary }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: T.textHeading }}>{selectedService.name}</p>
                    <p className="text-xs" style={{ color: T.textBody }}>
                      {selectedService.duration} min · {selectedService.price.toFixed(2)} €
                      {selectedStaff && !anyStaff ? ` · ${selectedStaff.name}` : ""}
                    </p>
                  </div>
                </div>
              )}

              {/* Restaurant: party size */}
              {isRestaurant && (
                <div className="mb-8">
                  <p className="text-2xl font-bold mb-1" style={{ color: T.textHeading }}>Pour combien de personnes ?</p>
                  <p className="text-sm mb-5" style={{ color: T.textBody }}>Sélectionnez le nombre de couverts</p>
                  <div className="flex gap-2 flex-wrap">
                    {[1,2,3,4,5,6,7,8].map(n => (
                      <button
                        key={n}
                        onClick={() => setPartySize(n)}
                        className="w-12 h-12 rounded-xl font-bold text-sm transition-all duration-150 border-2"
                        style={
                          partySize === n
                            ? { background: T.primary, borderColor: T.primary, color: T.primaryText, boxShadow: `0 4px 8px ${T.primaryShadow}` }
                            : { background: T.cardBg, borderColor: T.cardBorder, color: T.textBody }
                        }
                      >
                        {n}
                      </button>
                    ))}
                    <div className="flex items-center">
                      <input
                        type="number" min="1" value={partySize}
                        onChange={e => setPartySize(Math.max(1, Number(e.target.value)))}
                        className="w-16 h-12 text-center border-2 rounded-xl text-sm font-bold outline-none transition-colors"
                        style={{ background: T.inputBg, borderColor: T.inputBorder, color: T.textHeading }}
                        onFocus={e => (e.currentTarget.style.borderColor = T.inputFocusBorder)}
                        onBlur={e => (e.currentTarget.style.borderColor = T.inputBorder)}
                      />
                    </div>
                  </div>
                  {info?.bookingMaxCovers && (
                    <p className="text-xs mt-3" style={{ color: T.textMuted }}>Maximum {info.bookingMaxCovers} couverts par créneau</p>
                  )}
                </div>
              )}

              {/* Calendar */}
              <div className="mb-8">
                <p className="text-2xl font-bold mb-5" style={{ color: T.textHeading }}>Choisissez une date</p>

                <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }}>
                  {/* Month header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: T.cardBorder }}>
                    <button
                      onClick={prevMonth}
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                      style={{ color: T.textBody }}
                      onMouseEnter={e => (e.currentTarget.style.background = T.stepFuture)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <p className="font-semibold capitalize" style={{ color: T.textHeading }}>{calMonthLabel}</p>
                    <button
                      onClick={nextMonth}
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                      style={{ color: T.textBody }}
                      onMouseEnter={e => (e.currentTarget.style.background = T.stepFuture)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Day headers */}
                  <div className="grid grid-cols-7 px-3 pt-3 pb-1">
                    {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                      <div key={i} className="text-center text-xs font-semibold py-1" style={{ color: T.textMuted }}>{d}</div>
                    ))}
                  </div>

                  {/* Day grid */}
                  <div className="grid grid-cols-7 px-3 pb-4 gap-y-1">
                    {calDays.map((dayStr) => {
                      const dayNum = parseInt(dayStr.split("-")[2])
                      const dayMonthNum = parseInt(dayStr.split("-")[1]) - 1
                      const inCurrentMonth = dayMonthNum === calMonth.getMonth()
                      const isToday = dayStr === todayStr
                      const isSelected = dayStr === selectedDate
                      const disabled = isDayDisabled(dayStr)

                      let dayStyle: React.CSSProperties = {}
                      let dayClassName = "h-9 w-full rounded-xl text-sm font-medium transition-all duration-150"

                      if (isSelected) {
                        dayStyle = { background: T.primary, color: T.primaryText, boxShadow: `0 4px 8px ${T.primaryShadow}` }
                      } else if (isToday) {
                        dayStyle = { boxShadow: `0 0 0 2px ${T.primary}`, color: T.textHeading }
                      } else if (disabled) {
                        dayStyle = { color: T.stepFuture, cursor: "default" }
                      } else if (inCurrentMonth) {
                        dayStyle = { color: T.textBody }
                      } else {
                        dayStyle = { color: T.textMuted }
                      }

                      return (
                        <button
                          key={dayStr}
                          disabled={disabled}
                          onClick={() => setSelectedDate(dayStr)}
                          className={dayClassName}
                          style={dayStyle}
                          onMouseEnter={e => {
                            if (!isSelected && !disabled) e.currentTarget.style.background = `${T.primary}18`
                          }}
                          onMouseLeave={e => {
                            if (!isSelected) e.currentTarget.style.background = "transparent"
                          }}
                        >
                          {dayNum}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Time slots */}
              {selectedDate && (
                <div className="animate-in fade-in duration-200">
                  <p className="text-xl font-bold mb-1" style={{ color: T.textHeading }}>Créneaux disponibles</p>
                  <p className="text-sm mb-5 capitalize" style={{ color: T.textMuted }}>{fmtDateLong(selectedDate)}</p>

                  {loadingSlots ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-6">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: T.stepFuture }} />
                      ))}
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="text-center py-10 rounded-2xl" style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }}>
                      <p className="text-sm" style={{ color: T.textMuted }}>Aucun créneau disponible ce jour</p>
                      <p className="text-xs mt-1" style={{ color: T.stepFuture }}>Essayez une autre date</p>
                    </div>
                  ) : (() => {
                    const grouped = groupSlots(slots)
                    const periods = [
                      { label: "Matin", emoji: "🌅", slots: grouped.morning },
                      { label: "Après-midi", emoji: "☀️", slots: grouped.afternoon },
                      { label: "Soir", emoji: "🌆", slots: grouped.evening },
                    ].filter(p => p.slots.length > 0)
                    return (
                      <div className="space-y-6 mb-6">
                        {periods.map(period => (
                          <div key={period.label}>
                            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: T.textMuted }}>
                              {period.emoji} {period.label}
                            </p>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                              {period.slots.map(slot => (
                                <button
                                  key={slot}
                                  onClick={() => setSelectedSlot(slot)}
                                  className="py-3 px-4 rounded-xl text-sm font-semibold border-2 transition-all duration-150"
                                  style={
                                    slot === selectedSlot
                                      ? { background: T.primary, borderColor: T.primary, color: T.primaryText, boxShadow: `0 4px 12px ${T.primaryShadow}` }
                                      : { background: T.cardBg, borderColor: T.cardBorder, color: T.textBody }
                                  }
                                  onMouseEnter={e => {
                                    if (slot !== selectedSlot) {
                                      e.currentTarget.style.borderColor = T.primary
                                      e.currentTarget.style.color = T.primary
                                      e.currentTarget.style.background = `${T.primary}18`
                                    }
                                  }}
                                  onMouseLeave={e => {
                                    if (slot !== selectedSlot) {
                                      e.currentTarget.style.borderColor = T.cardBorder
                                      e.currentTarget.style.color = T.textBody
                                      e.currentTarget.style.background = T.cardBg
                                    }
                                  }}
                                >
                                  {slot}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}

                  {selectedSlot && (
                    <button
                      onClick={() => setStep("form")}
                      className="w-full py-4 rounded-2xl font-bold text-base transition-all duration-150 mt-2"
                      style={{ background: T.primary, color: T.primaryText, boxShadow: `0 8px 24px ${T.primaryShadow}` }}
                      onMouseEnter={e => (e.currentTarget.style.background = T.primaryHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = T.primary)}
                    >
                      Continuer →
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── STEP: Form ───────────────────────────────────────────────────────── */}
          {step === "form" && (
            <div key="form" className="animate-in fade-in slide-in-from-right-4 duration-300">
              <BackBtn onClick={() => setStep("datetime")} />

              <h2 className="text-3xl font-bold mb-2" style={{ color: T.textHeading }}>Vos infos</h2>
              <p className="mb-8" style={{ color: T.textBody }}>Dernière étape — presque terminé !</p>

              {/* Booking summary */}
              <div
                className="rounded-2xl p-5 mb-8 shadow-lg"
                style={{ background: `linear-gradient(135deg, ${T.primary}, ${T.primaryHover})`, boxShadow: `0 8px 24px ${T.primaryShadow}` }}
              >
                {isRestaurant ? (
                  <>
                    <p className="font-bold text-lg" style={{ color: T.primaryText }}>Table pour {partySize} personne{partySize > 1 ? "s" : ""}</p>
                    <p className="text-sm mt-1" style={{ color: `${T.primaryText}cc` }}>{fmtDateLong(selectedDate)} à {selectedSlot}</p>
                  </>
                ) : selectedService && (
                  <>
                    <p className="font-bold text-lg" style={{ color: T.primaryText }}>{selectedService.name}</p>
                    <p className="text-sm mt-1" style={{ color: `${T.primaryText}cc` }}>
                      {fmtDateLong(selectedDate)} à {selectedSlot}
                      {" · "}{selectedService.duration} min
                      {" · "}<span className="font-semibold">{selectedService.price.toFixed(2)} €</span>
                      {selectedStaff && !anyStaff ? ` · ${selectedStaff.name}` : ""}
                    </p>
                  </>
                )}
              </div>

              <div className="space-y-5 max-w-md">
                {[
                  { key: "name",  label: "Nom complet",   type: "text",  placeholder: "Jean Dupont",      required: true },
                  { key: "email", label: "Adresse email",  type: "email", placeholder: "jean@exemple.fr", required: true },
                  { key: "phone", label: "Téléphone",      type: "tel",   placeholder: "06 12 34 56 78",  required: false },
                  { key: "notes", label: "Message / note", type: "text",  placeholder: isRestaurant ? "Chaise bébé, allergie, occasion spéciale…" : "Cheveux courts, allergie, préférence…", required: false },
                ].map(({ key, label, type, placeholder, required }) => (
                  <div key={key}>
                    <label className="block text-sm font-semibold mb-2" style={{ color: T.textBody }}>
                      {label} {required && <span style={{ color: T.primary }}>*</span>}
                    </label>
                    <input
                      type={type}
                      value={form[key as keyof typeof form]}
                      placeholder={placeholder}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none transition-colors"
                      style={{
                        background: T.inputBg,
                        borderColor: T.inputBorder,
                        color: T.textHeading,
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = T.inputFocusBorder)}
                      onBlur={e => (e.currentTarget.style.borderColor = T.inputBorder)}
                    />
                  </div>
                ))}

                <p className="text-xs flex items-center gap-1.5" style={{ color: T.textMuted }}>
                  <Lock className="w-3 h-3" />
                  Vos données ne sont partagées qu&apos;avec l&apos;établissement
                </p>
              </div>

              {submitError && (
                <div className="mt-5 p-4 bg-red-50 border border-red-200 rounded-xl max-w-md">
                  <p className="text-red-600 text-sm">{submitError}</p>
                </div>
              )}

              {/* Desktop submit button */}
              <button
                onClick={submit}
                disabled={submitting || !form.name || !form.email}
                className="mt-8 hidden lg:block px-10 py-4 rounded-2xl font-bold text-base transition-all duration-150"
                style={
                  submitting || !form.name || !form.email
                    ? { background: T.stepFuture, color: T.textMuted, cursor: "not-allowed" }
                    : { background: T.primary, color: T.primaryText, boxShadow: `0 8px 24px ${T.primaryShadow}` }
                }
                onMouseEnter={e => {
                  if (!submitting && form.name && form.email) e.currentTarget.style.background = T.primaryHover
                }}
                onMouseLeave={e => {
                  if (!submitting && form.name && form.email) e.currentTarget.style.background = T.primary
                }}
              >
                {submitting ? "Envoi en cours…" : "Confirmer la réservation"}
              </button>

              <p className="hidden lg:block text-xs mt-3" style={{ color: T.textMuted }}>
                Vous recevrez une confirmation par email
              </p>
            </div>
          )}

          {/* ── STEP: Payment ────────────────────────────────────────────────────── */}
          {step === "payment" && (
            <div key="payment" className="animate-in fade-in slide-in-from-right-4 duration-300">
              <BackBtn onClick={() => setStep("form")} />

              <h2 className="text-3xl font-bold mb-2" style={{ color: T.textHeading }}>Paiement</h2>
              <p className="mb-8" style={{ color: T.textBody }}>Choisissez votre mode de règlement</p>

              <div
                className="rounded-2xl p-4 mb-6 shadow-sm max-w-md"
                style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }}
              >
                {isRestaurant ? (
                  <>
                    <p className="font-semibold" style={{ color: T.textHeading }}>Table pour {partySize} personne{partySize > 1 ? "s" : ""}</p>
                    <p className="text-sm mt-0.5" style={{ color: T.textBody }}>{fmtDateLong(selectedDate)} à {selectedSlot}</p>
                  </>
                ) : selectedService && (
                  <>
                    <p className="font-semibold" style={{ color: T.textHeading }}>{selectedService.name}</p>
                    <p className="text-sm mt-0.5" style={{ color: T.textBody }}>
                      {fmtDateLong(selectedDate)} à {selectedSlot} · {selectedService.duration} min
                      {selectedStaff && !anyStaff ? ` · ${selectedStaff.name}` : ""}
                    </p>
                  </>
                )}
              </div>

              {selectedService && (
                <p className="text-sm mb-6 max-w-md" style={{ color: T.textBody }}>
                  {info?.depositType === "percent"
                    ? `Acompte de ${info.depositValue}% — ${((selectedService.price * (info?.depositValue ?? 100)) / 100).toFixed(2)} €`
                    : info?.depositType === "fixed"
                    ? `Acompte fixe de ${(info?.depositValue ?? 0).toFixed(2)} €`
                    : `Paiement complet de ${selectedService.price.toFixed(2)} €`}
                </p>
              )}

              <div className="space-y-3 max-w-md">
                <button
                  onClick={payOnline}
                  disabled={payingOnline}
                  className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all duration-150"
                  style={
                    payingOnline
                      ? { borderColor: T.primary, background: `${T.primary}18`, opacity: 0.7 }
                      : { borderColor: T.primary, background: T.cardBg }
                  }
                  onMouseEnter={e => { if (!payingOnline) e.currentTarget.style.background = `${T.primary}18` }}
                  onMouseLeave={e => { if (!payingOnline) e.currentTarget.style.background = T.cardBg }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${T.primary}18` }}
                  >
                    <CreditCard className="w-6 h-6" style={{ color: T.primary }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold" style={{ color: T.textHeading }}>{payingOnline ? "Redirection en cours…" : "Payer en ligne"}</p>
                    <p className="text-sm" style={{ color: T.textBody }}>Carte bancaire · Paiement sécurisé Stripe</p>
                  </div>
                  {!payingOnline && selectedService && (
                    <span className="font-bold text-base flex-shrink-0" style={{ color: T.primary }}>
                      {info?.depositType === "percent"
                        ? `${((selectedService.price * (info?.depositValue ?? 100)) / 100).toFixed(2)} €`
                        : info?.depositType === "fixed"
                        ? `${(info?.depositValue ?? 0).toFixed(2)} €`
                        : `${selectedService.price.toFixed(2)} €`}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setStep("done")}
                  disabled={payingOnline}
                  className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all duration-150"
                  style={
                    payingOnline
                      ? { borderColor: T.cardBorder, background: T.cardBg, opacity: 0.4, cursor: "not-allowed" }
                      : { borderColor: T.cardBorder, background: T.cardBg }
                  }
                  onMouseEnter={e => { if (!payingOnline) e.currentTarget.style.borderColor = T.textMuted }}
                  onMouseLeave={e => { if (!payingOnline) e.currentTarget.style.borderColor = T.cardBorder }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: T.stepFuture }}
                  >
                    <MapPin className="w-6 h-6" style={{ color: T.textMuted }} />
                  </div>
                  <div>
                    <p className="font-bold" style={{ color: T.textHeading }}>Payer sur place</p>
                    <p className="text-sm" style={{ color: T.textBody }}>Règlement lors du rendez-vous</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: Done ───────────────────────────────────────────────────────── */}
          {step === "done" && (
            <div key="done" className="animate-in fade-in zoom-in-95 duration-300 py-8 max-w-md mx-auto lg:mx-0">
              <div className="text-center mb-8">
                <div className="flex justify-center mb-6 relative">
                  <AnimatedCheckmark />
                </div>
                <h1 className="text-3xl font-bold mb-2" style={{ color: T.textHeading }}>C&apos;est réservé ! 🎉</h1>
                <p style={{ color: T.textBody }}>
                  {isRestaurant
                    ? `Table pour ${partySize} · ${fmtDateLong(selectedDate)} à ${selectedSlot}`
                    : `${selectedService?.name} · ${fmtDateLong(selectedDate)} à ${selectedSlot}`}
                </p>
              </div>

              {/* Summary card */}
              <div
                className="rounded-2xl shadow-sm p-5 mb-6 space-y-3"
                style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }}
              >
                {!isRestaurant && selectedService && (
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4 flex-shrink-0" style={{ color: T.primary }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: T.textHeading }}>{selectedService.name}</p>
                      <p className="text-xs" style={{ color: T.textBody }}>{selectedService.duration} min · {selectedService.price.toFixed(2)} €</p>
                    </div>
                  </div>
                )}
                {isRestaurant && (
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 flex-shrink-0" style={{ color: T.primary }} />
                    <p className="text-sm font-semibold" style={{ color: T.textHeading }}>{partySize} personne{partySize > 1 ? "s" : ""}</p>
                  </div>
                )}
                {selectedStaff && !anyStaff && (
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: selectedStaff.color }} />
                    <p className="text-sm" style={{ color: T.textBody }}>{selectedStaff.name}</p>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: T.primary }} />
                  <p className="text-sm capitalize" style={{ color: T.textBody }}>{fmtDateLong(selectedDate)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 flex-shrink-0" style={{ color: T.primary }} />
                  <p className="text-sm font-semibold" style={{ color: T.textHeading }}>{selectedSlot}</p>
                </div>
                <div className="pt-2 border-t space-y-2" style={{ borderColor: T.cardBorder }}>
                  <div className="flex items-center gap-2 text-sm" style={{ color: T.textBody }}>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    Un email de confirmation vous sera envoyé
                  </div>
                  <div className="flex items-center gap-2 text-sm" style={{ color: T.textBody }}>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {info?.businessName} confirmera votre RDV prochainement
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setStep(isRestaurant ? "datetime" : "service")
                    setSelectedService(null); setSelectedStaff(null); setAnyStaff(false)
                    setSelectedDate(""); setSelectedSlot(""); setPartySize(2)
                    setForm({ name: "", email: "", phone: "", notes: "" })
                    setCreatedBookingId(null); setPayingOnline(false)
                  }}
                  className="w-full py-4 rounded-2xl font-bold text-base transition-all duration-150"
                  style={{ background: T.primary, color: T.primaryText, boxShadow: `0 8px 24px ${T.primaryShadow}` }}
                  onMouseEnter={e => (e.currentTarget.style.background = T.primaryHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = T.primary)}
                >
                  Nouvelle réservation
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ══ Mobile sticky bottom bar ═════════════════════════════════════════════ */}
      {step === "form" && (
        <div
          className="lg:hidden fixed bottom-0 left-0 right-0 border-t p-4 shadow-lg z-20"
          style={{ background: T.sidebarBg, borderColor: T.sidebarBorder }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={submit}
              disabled={submitting || !form.name || !form.email}
              className="flex-1 py-4 rounded-2xl font-bold text-base transition-all duration-150"
              style={
                submitting || !form.name || !form.email
                  ? { background: T.stepFuture, color: T.textMuted, cursor: "not-allowed" }
                  : { background: T.primary, color: T.primaryText, boxShadow: `0 8px 24px ${T.primaryShadow}` }
              }
            >
              {submitting ? "Envoi en cours…" : "Confirmer"}
            </button>
            {selectedService && (
              <span className="text-base font-bold flex-shrink-0" style={{ color: T.textHeading }}>
                {selectedService.price.toFixed(2)} €
              </span>
            )}
          </div>
        </div>
      )}

      {step === "datetime" && selectedSlot && (
        <div
          className="lg:hidden fixed bottom-0 left-0 right-0 border-t p-4 shadow-lg z-20"
          style={{ background: T.sidebarBg, borderColor: T.sidebarBorder }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep("form")}
              className="flex-1 py-4 rounded-2xl font-bold text-base transition-all duration-150"
              style={{ background: T.primary, color: T.primaryText, boxShadow: `0 8px 24px ${T.primaryShadow}` }}
              onMouseEnter={e => (e.currentTarget.style.background = T.primaryHover)}
              onMouseLeave={e => (e.currentTarget.style.background = T.primary)}
            >
              Continuer →
            </button>
            {selectedService && (
              <span className="text-base font-bold flex-shrink-0" style={{ color: T.textHeading }}>
                {selectedService.price.toFixed(2)} €
              </span>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
