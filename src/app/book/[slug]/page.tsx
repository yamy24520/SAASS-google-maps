"use client"

import { use, useEffect, useState, useRef } from "react"
import { useSearchParams } from "next/navigation"
import {
  CheckCircle2, ChevronLeft, ChevronRight, Clock, CreditCard, MapPin,
  Star, Sparkles, Lock, Calendar, Users
} from "lucide-react"

interface Service { id: string; name: string; description: string | null; category: string | null; duration: number; price: number }
interface Staff   { id: string; name: string; color: string }
interface BusinessInfo {
  businessId: string; businessName: string; logoDataUrl: string | null
  pageTheme: string; pageStyle: string | null; pageTagline: string | null; pageAccentColor: string | null
  pageCoverDataUrl: string | null; pageDescription: string | null
  pageLegalText: string | null; pageLabels: Record<string, string> | null
  pageServiceOrder: string[] | null; pageShowHours: boolean
  bookingHours: Record<string, { open: string; close: string }> | null
  maxDaysAhead: number; bookingType: string; bookingMaxCovers: number | null
  paymentEnabled: boolean; depositType: string; depositValue: number; stripeReady: boolean
}

type Step = "service" | "staff" | "datetime" | "form" | "payment" | "done"

// ─── Theme System ──────────────────────────────────────────────────────────────
// pageStyle controls the visual style (dark/light/layout/effects)
// pageAccentColor (any hex) overrides the primary color

type StyleKey = "minimal" | "modern" | "future" | "luxury"

interface ThemeConfig {
  pageBg: string
  sidebarBg: string
  sidebarBorder: string
  cardBg: string
  cardBorder: string
  primary: string
  primaryHover: string
  primaryText: string
  primaryShadow: string
  textHeading: string
  textBody: string
  textMuted: string
  inputBorder: string
  inputFocusBorder: string
  inputBg: string
  stepDone: string
  stepActive: string
  stepFuture: string
  accentEmoji: string
  fontStyle: string
  badgeText: string
  badgeBg: string
  badgeTextColor: string
  // Style-specific
  isDark: boolean
  glowEffect: boolean
  fontFamily: string
}

// Legacy themeKey alias (kept for compat with old data)
type ThemeKey = StyleKey | "default" | "hello_kitty" | "barber" | "manga"

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "")
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `${r},${g},${b}`
}

function buildTheme(style: StyleKey, accent: string): ThemeConfig {
  const rgb = hexToRgb(accent)
  switch (style) {
    case "minimal":
      return {
        pageBg: "#ffffff", sidebarBg: "#fafafa", sidebarBorder: "#f0f0f0",
        cardBg: "#ffffff", cardBorder: "#ebebeb",
        primary: accent, primaryHover: accent, primaryText: "#ffffff",
        primaryShadow: `rgba(${rgb},0.18)`,
        textHeading: "#111111", textBody: "#444444", textMuted: "#aaaaaa",
        inputBorder: "#e0e0e0", inputFocusBorder: accent, inputBg: "#ffffff",
        stepDone: accent, stepActive: accent, stepFuture: "#ebebeb",
        accentEmoji: "", fontStyle: "Minimal", badgeText: "Minimal",
        badgeBg: `rgba(${rgb},0.08)`, badgeTextColor: accent,
        isDark: false, glowEffect: false, fontFamily: "'Inter','Helvetica Neue',sans-serif",
      }
    case "future":
      return {
        pageBg: "#04040f", sidebarBg: "#07071a", sidebarBorder: `rgba(${rgb},0.15)`,
        cardBg: "#0a0a20", cardBorder: `rgba(${rgb},0.12)`,
        primary: accent, primaryHover: accent, primaryText: "#ffffff",
        primaryShadow: `rgba(${rgb},0.5)`,
        textHeading: "#f0eaff", textBody: "#9080cc", textMuted: "#484068",
        inputBorder: `rgba(${rgb},0.2)`, inputFocusBorder: accent, inputBg: "#07071a",
        stepDone: accent, stepActive: accent, stepFuture: `rgba(${rgb},0.1)`,
        accentEmoji: "", fontStyle: "Future", badgeText: "Future",
        badgeBg: `rgba(${rgb},0.15)`, badgeTextColor: accent,
        isDark: true, glowEffect: true, fontFamily: "'SF Pro Display','Inter',sans-serif",
      }
    case "luxury":
      return {
        pageBg: "#0a0800", sidebarBg: "#100e00", sidebarBorder: `rgba(${rgb},0.2)`,
        cardBg: "#100e00", cardBorder: `rgba(${rgb},0.18)`,
        primary: accent, primaryHover: accent, primaryText: "#0a0800",
        primaryShadow: `rgba(${rgb},0.4)`,
        textHeading: "#f5e8c0", textBody: "#c0a870", textMuted: "#705840",
        inputBorder: `rgba(${rgb},0.2)`, inputFocusBorder: accent, inputBg: "#0a0800",
        stepDone: accent, stepActive: accent, stepFuture: `rgba(${rgb},0.1)`,
        accentEmoji: "", fontStyle: "Luxury", badgeText: "Luxury",
        badgeBg: `rgba(${rgb},0.12)`, badgeTextColor: accent,
        isDark: true, glowEffect: false, fontFamily: "'Didot','Garamond','Georgia',serif",
      }
    default: // modern
      return {
        pageBg: "#f5f5fa", sidebarBg: "#ffffff", sidebarBorder: "#eaeaf0",
        cardBg: "#ffffff", cardBorder: "#eaeaf0",
        primary: accent, primaryHover: accent, primaryText: "#ffffff",
        primaryShadow: `rgba(${rgb},0.25)`,
        textHeading: "#0f0f1a", textBody: "#3d3d5c", textMuted: "#9b9bb4",
        inputBorder: "#e0e0f0", inputFocusBorder: accent, inputBg: "#ffffff",
        stepDone: accent, stepActive: accent, stepFuture: "#e8e8f5",
        accentEmoji: "", fontStyle: "Modern", badgeText: "Modern",
        badgeBg: `rgba(${rgb},0.08)`, badgeTextColor: accent,
        isDark: false, glowEffect: false, fontFamily: "-apple-system,'SF Pro Display','Segoe UI',sans-serif",
      }
  }
}

// Map old pageTheme keys to style + default accent
const LEGACY_THEME_MAP: Record<string, { style: StyleKey; accent: string }> = {
  default:    { style: "modern",  accent: "#6366f1" },
  dark:       { style: "modern",  accent: "#6366f1" },
  light:      { style: "minimal", accent: "#6366f1" },
  hello_kitty:{ style: "modern",  accent: "#f0238c" },
  barber:     { style: "luxury",  accent: "#e8a020" },
  manga:      { style: "minimal", accent: "#e81818" },
  future:     { style: "future",  accent: "#7c50ff" },
  luxury:     { style: "luxury",  accent: "#c8a03c" },
  ocean:      { style: "modern",  accent: "#38bdf8" },
  forest:     { style: "modern",  accent: "#4ade80" },
  warm:       { style: "modern",  accent: "#fbbf24" },
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
  const searchParams = useSearchParams()
  const preselectedServiceId = searchParams.get("service")
  const preselectedStaffId = searchParams.get("staff")
  const preselectionApplied = useRef(false)

  const [info, setInfo] = useState<BusinessInfo | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [staffs, setStaffs] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Live preview overrides — reçus via postMessage depuis /personnalisation
  const [preview, setPreview] = useState<Partial<BusinessInfo> | null>(null)
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type !== "REPUTIX_PREVIEW") return
      setPreview(e.data.overrides ?? null)
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [])

  const [step, setStep] = useState<Step>("service")
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [anyStaff, setAnyStaff] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string>("")
  const [partySize, setPartySize] = useState(2)
  const [openCats, setOpenCats] = useState<Set<string>>(new Set())

  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" })
  const [smsOptIn, setSmsOptIn] = useState(false)
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
        pageStyle: pageData.pageStyle ?? null,
        pageTagline: pageData.pageTagline ?? null,
        pageAccentColor: pageData.pageAccentColor ?? null,
        pageCoverDataUrl: pageData.pageCoverDataUrl ?? null,
        pageDescription: pageData.pageDescription ?? null,
        pageLegalText: pageData.pageLegalText ?? null,
        pageLabels: pageData.pageLabels ?? null,
        pageServiceOrder: pageData.pageServiceOrder ?? null,
        pageShowHours: pageData.pageShowHours ?? false,
        bookingHours: pageData.bookingHours ?? null,
        maxDaysAhead,
        bookingType: bookData.bookingType ?? "appointment",
        bookingMaxCovers: bookData.bookingMaxCovers ?? null,
        paymentEnabled: !!(bSettings.paymentEnabled) && !!(bookData.stripeAccountStatus === "active"),
        depositType: (bSettings.depositType as string) ?? "full",
        depositValue: (bSettings.depositValue as number) ?? 100,
        stripeReady: bookData.stripeAccountStatus === "active",
      })
      const svcs: Service[] = bookData.services ?? []
      const stfs: Staff[] = bookData.staffs ?? []
      setServices(svcs)
      setStaffs(stfs)
      if (bookData.bookingType === "restaurant") setStep("datetime")

      // Pre-select service + staff from query params (rebooking)
      if (!preselectionApplied.current && (preselectedServiceId || preselectedStaffId)) {
        preselectionApplied.current = true
        const hasStaff = stfs.length > 0
        if (preselectedServiceId) {
          const svc = svcs.find(s => s.id === preselectedServiceId)
          if (svc) {
            setSelectedService(svc)
            if (preselectedStaffId) {
              const stf = stfs.find(s => s.id === preselectedStaffId)
              if (stf) { setSelectedStaff(stf); setStep("datetime") }
              else { setAnyStaff(true); setStep("datetime") }
            } else {
              setStep(hasStaff ? "staff" : "datetime")
            }
          }
        }
      }

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
        smsOptIn: form.phone ? smsOptIn : false,
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

  // ── Theme resolution (preview overrides have priority) ───────────────────────

  const displayTheme       = preview?.pageTheme        ?? info?.pageTheme        ?? "default"
  const displayStyleRaw    = (preview as { pageStyle?: string } | null)?.pageStyle ?? info?.pageStyle ?? null
  const displayAccent      = preview?.pageAccentColor  ?? info?.pageAccentColor  ?? null
  const displayTagline     = preview?.pageTagline      ?? info?.pageTagline      ?? null
  const displayLogo        = preview?.logoDataUrl      ?? info?.logoDataUrl      ?? null
  const displayName        = preview?.businessName     ?? info?.businessName     ?? ""
  const displayCover       = preview?.pageCoverDataUrl ?? info?.pageCoverDataUrl ?? null
  const displayDescription = preview?.pageDescription  ?? info?.pageDescription  ?? null
  const displayLegal       = preview?.pageLegalText    ?? info?.pageLegalText    ?? null
  const displayLabels      = preview?.pageLabels       ?? info?.pageLabels       ?? null
  const displayShowHours   = preview?.pageShowHours    ?? info?.pageShowHours    ?? false
  const displayServiceOrder = preview?.pageServiceOrder ?? info?.pageServiceOrder ?? null

  // Resolve style: pageStyle takes priority, fallback to legacy pageTheme mapping
  const legacyMap = LEGACY_THEME_MAP[displayTheme] ?? LEGACY_THEME_MAP.default
  const resolvedStyle = (displayStyleRaw as StyleKey | null) ?? legacyMap.style
  const resolvedAccent = displayAccent ?? legacyMap.accent
  const T: ThemeConfig = buildTheme(resolvedStyle, resolvedAccent)
  const themeKey = displayTheme as ThemeKey // kept for serviceAccents compat

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
    service: displayLabels?.service ?? "Prestation",
    staff: displayLabels?.staff ?? "Avec qui ?",
    datetime: displayLabels?.datetime ?? "Date & heure",
    form: displayLabels?.form ?? "Coordonnées",
    payment: "Paiement", done: "Confirmé"
  }

  const stepIdx = STEPS.indexOf(step)

  // Ordered services (custom order if set)
  const orderedServices = displayServiceOrder && displayServiceOrder.length > 0
    ? [...services].sort((a, b) => {
        const ia = displayServiceOrder.indexOf(a.id)
        const ib = displayServiceOrder.indexOf(b.id)
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
      })
    : services

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

  const globalCss = `
    @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
    @keyframes glow-pulse { 0%,100%{box-shadow:0 0 20px rgba(${hexToRgb(resolvedAccent)},0.3)} 50%{box-shadow:0 0 40px rgba(${hexToRgb(resolvedAccent)},0.6)} }
    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
    .shimmer-btn {
      background: linear-gradient(90deg, ${resolvedAccent} 0%, ${resolvedAccent}cc 40%, ${resolvedAccent}ff 50%, ${resolvedAccent}cc 60%, ${resolvedAccent} 100%);
      background-size: 200% auto;
      animation: shimmer 2.5s linear infinite;
    }
    ${resolvedStyle === "future" ? `
      .future-glow { animation: glow-pulse 3s ease-in-out infinite; }
      .future-card { transition: border-color 0.3s, box-shadow 0.3s; }
      .future-card:hover { border-color: rgba(${hexToRgb(resolvedAccent)},0.4) !important; box-shadow: 0 0 20px rgba(${hexToRgb(resolvedAccent)},0.15); }
    ` : ""}
  `

  return (
    <div style={{ background: T.pageBg, minHeight: "100svh", fontFamily: T.fontFamily }}>
      <style>{globalCss}</style>

      {/* ══ Mobile hero banner (< lg) ════════════════════════════════════════════ */}
      {displayCover ? (
        <div className="lg:hidden relative w-full overflow-hidden" style={{ aspectRatio: "21/9", maxHeight: 200, minHeight: 100 }}>
          <img src={displayCover} className="w-full h-full object-cover" alt="" />
          {/* gradient overlay */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.55) 100%)" }} />
          {/* identity overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 flex items-end gap-3">
            {displayLogo && (
              <img src={displayLogo} className="w-10 h-10 rounded-xl object-cover shadow-lg flex-shrink-0 border border-white/20" alt="" />
            )}
            <div className="min-w-0">
              <p className="font-bold text-sm text-white truncate leading-tight drop-shadow">{displayName}</p>
              {displayTagline && <p className="text-xs text-white/75 truncate leading-tight">{displayTagline}</p>}
            </div>
          </div>
        </div>
      ) : null}

      {/* ══ Mobile sticky header (< lg) ══════════════════════════════════════════ */}
      <div
        className="lg:hidden sticky top-0 z-20 backdrop-blur-md border-b"
        style={{ background: `${T.sidebarBg}e6`, borderColor: T.sidebarBorder }}
      >
        <div className="px-4 py-3 flex items-center gap-3">
          {displayLogo && (
            <img src={displayLogo} className="w-8 h-8 rounded-xl object-cover shadow-sm flex-shrink-0" alt="" />
          )}
          <p className="font-bold text-sm flex-1 truncate" style={{ color: T.textHeading }}>{displayName}</p>
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
          {/* Cover image — 21:9, adapts to sidebar width, clamped between 80px and 180px */}
          {displayCover && (
            <div className="mb-6 -mx-8 -mt-8 overflow-hidden" style={{ aspectRatio: "21/9", maxHeight: 180, minHeight: 80 }}>
              <img src={displayCover} className="w-full h-full object-cover" alt="" />
            </div>
          )}

          {/* Business identity */}
          <div className="mb-8">
            {displayLogo ? (
              <img src={displayLogo} className="w-16 h-16 rounded-2xl object-cover shadow-md mb-4" alt="" />
            ) : null}
            <h1 className="text-2xl font-bold leading-tight" style={{ color: T.textHeading }}>{displayName}</h1>
            {displayTagline && (
              <p className="text-sm mt-1 leading-snug" style={{ color: T.textMuted }}>{displayTagline}</p>
            )}
            {displayDescription && (
              <p className="text-sm mt-2 leading-relaxed" style={{ color: T.textBody }}>{displayDescription}</p>
            )}
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-600">En ligne</span>
            </div>
          </div>

          {/* Opening hours */}
          {displayShowHours && info?.bookingHours && (
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: T.textMuted }}>Horaires</p>
              <div className="space-y-1">
                {(["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"] as const).map(day => {
                  const h = (info.bookingHours as Record<string, { open: string; close: string }> | null)?.[day]
                  return (
                    <div key={day} className="flex justify-between text-xs" style={{ color: T.textBody }}>
                      <span className="capitalize">{day}</span>
                      <span>{h ? `${h.open} – ${h.close}` : "Fermé"}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

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
          <div className="mt-auto pt-8 space-y-3">
            {displayLegal && (
              <p className="text-xs leading-relaxed" style={{ color: T.textMuted }}>{displayLegal}</p>
            )}
            <div className="flex items-center gap-1.5 text-xs" style={{ color: T.textMuted }}>
              <Lock className="w-3 h-3" />
              Réservation sécurisée
            </div>
          </div>
        </aside>

        {/* ── Right content ─────────────────────────────────────────────────────── */}
        <main className="flex-1 px-4 lg:px-12 pt-8 pb-32 lg:pb-16">

          {/* Mobile-only: description, hours (cover is now in hero above, tagline in overlay) */}
          {stepIdx === 0 && (displayDescription || displayShowHours) && (
            <div className="lg:hidden mb-6 space-y-3">
              {displayDescription && (
                <p className="text-sm leading-relaxed" style={{ color: T.textBody }}>{displayDescription}</p>
              )}
              {displayShowHours && info?.bookingHours && (
                <div className="rounded-xl p-3" style={{ background: `${T.primary}08`, border: `1px solid ${T.primary}15` }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: T.textMuted }}>Horaires</p>
                  <div className="space-y-0.5">
                    {(["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"] as const).map(day => {
                      const h = (info.bookingHours as Record<string, { open: string; close: string }> | null)?.[day]
                      return (
                        <div key={day} className="flex justify-between text-xs" style={{ color: T.textBody }}>
                          <span className="capitalize">{day}</span>
                          <span>{h ? `${h.open} – ${h.close}` : "Ferme"}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP: Service ────────────────────────────────────────────────────── */}
          {step === "service" && !isRestaurant && (() => {
            // Group services by category
            const categories: { name: string | null; services: typeof orderedServices }[] = []
            const catMap = new Map<string | null, typeof orderedServices>()
            for (const svc of orderedServices) {
              const key = svc.category || null
              if (!catMap.has(key)) catMap.set(key, [])
              catMap.get(key)!.push(svc)
            }
            catMap.forEach((svcs, key) => categories.push({ name: key, services: svcs }))
            const hasCategories = categories.some(c => c.name !== null)
            // If only 1 category (or none), show flat — no dropdown
            const singleCategory = categories.length <= 1
            const allOpen = !hasCategories || singleCategory

            function toggleCat(catName: string) {
              setOpenCats(prev => {
                const next = new Set(prev)
                if (next.has(catName)) next.delete(catName)
                else next.add(catName)
                return next
              })
            }

            function ServiceCard({ svc }: { svc: Service }) {
              return (
                <button
                  key={svc.id}
                  onClick={() => { setSelectedService(svc); setStep(hasStaff ? "staff" : "datetime") }}
                  className={`w-full rounded-xl text-left transition-all duration-150 group${T.glowEffect ? " future-card" : ""}`}
                  style={{ background: T.cardBg, borderBottom: `1px solid ${T.cardBorder}` }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${T.primary}08` }}
                  onMouseLeave={e => { e.currentTarget.style.background = T.cardBg }}
                >
                  <div className="px-4 py-3.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[15px]" style={{ color: T.textHeading }}>{svc.name}</p>
                      {svc.description && (
                        <p className="text-xs mt-0.5 line-clamp-1" style={{ color: T.textMuted }}>{svc.description}</p>
                      )}
                      <span className="text-xs mt-1 inline-block" style={{ color: T.textMuted }}>{svc.duration} min</span>
                    </div>
                    <span className="text-[15px] font-bold flex-shrink-0" style={{ color: T.textHeading }}>{svc.price.toFixed(0)}&nbsp;&euro;</span>
                    <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-30 group-hover:opacity-70 transition-opacity" style={{ color: T.textMuted }} />
                  </div>
                </button>
              )
            }

            return (
              <div key="service" className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold leading-tight" style={{ color: T.textHeading }}>{displayLabels?.service ?? "Quelle prestation ?"}</h2>
                  <p className="mt-2" style={{ color: T.textBody }}>
                    {orderedServices.length} prestation{orderedServices.length > 1 ? "s" : ""} disponible{orderedServices.length > 1 ? "s" : ""}
                  </p>
                </div>

                {orderedServices.length === 0 && (
                  <div className="text-center py-16" style={{ color: T.textMuted }}>
                    <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Aucune prestation disponible</p>
                  </div>
                )}

                <div className="space-y-4">
                  {categories.map((cat, ci) => {
                    const catKey = cat.name ?? "__uncategorized"
                    const isOpen = allOpen || openCats.has(catKey)

                    if (singleCategory) {
                      // Single or no category — flat list, optional label
                      return (
                        <div key="flat">
                          {cat.name && (
                            <p className="text-xs font-semibold uppercase tracking-wider mb-3 px-1" style={{ color: T.textMuted }}>{cat.name}</p>
                          )}
                          <div className="space-y-2.5">
                            {cat.services.map((svc, idx) => <ServiceCard key={svc.id} svc={svc} />)}
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div key={catKey}>
                        <button
                          onClick={() => toggleCat(catKey)}
                          className="w-full flex items-center gap-2 px-1 py-2.5 text-left"
                        >
                          <ChevronRight
                            className="w-3.5 h-3.5 transition-transform duration-200 flex-shrink-0"
                            style={{ color: T.textMuted, transform: isOpen ? "rotate(90deg)" : "rotate(0)" }}
                          />
                          <p className="text-xs font-semibold uppercase tracking-wider flex-1" style={{ color: T.textMuted }}>{cat.name ?? "Autres"}</p>
                          <span className="text-xs" style={{ color: T.textMuted }}>{cat.services.length}</span>
                        </button>
                        {isOpen && (
                          <div className="rounded-xl overflow-hidden mb-2" style={{ border: `1px solid ${T.cardBorder}` }}>
                            {cat.services.map((svc) => <ServiceCard key={svc.id} svc={svc} />)}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* Lien portail client — discret, sous les services */}
          {step === "service" && !isRestaurant && info && (
            <div className="text-center mt-4">
              <a
                href={`/my?biz=${info.businessId}&name=${encodeURIComponent(info.businessName)}`}
                className="text-xs underline underline-offset-2"
                style={{ color: T.textMuted }}
              >
                Voir mes réservations existantes
              </a>
            </div>
          )}

          {/* ── STEP: Staff ──────────────────────────────────────────────────────── */}
          {step === "staff" && hasStaff && (
            <div key="staff" className="animate-in fade-in slide-in-from-right-4 duration-300">
              <BackBtn onClick={() => setStep("service")} />
              <div className="mb-8">
                <h2 className="text-3xl font-bold leading-tight" style={{ color: T.textHeading }}>{displayLabels?.staff ?? "Avec qui ?"}</h2>
                <p className="mt-2" style={{ color: T.textBody }}>{displayLabels?.staffSub ?? "Choisissez votre prestataire"}</p>
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

                <div className="rounded-2xl overflow-hidden" style={{ background: T.cardBg, border: `1.5px solid ${T.cardBorder}` }}>
                  {/* Month header */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <button onClick={prevMonth}
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                      style={{ color: T.textBody }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${T.primary}12`; e.currentTarget.style.color = T.primary }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textBody }}>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <p className="font-bold text-sm capitalize tracking-wide" style={{ color: T.textHeading }}>{calMonthLabel}</p>
                    <button onClick={nextMonth}
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                      style={{ color: T.textBody }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${T.primary}12`; e.currentTarget.style.color = T.primary }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textBody }}>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Day headers */}
                  <div className="grid grid-cols-7 px-3 pb-1">
                    {["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"].map((d, i) => (
                      <div key={i} className="text-center text-[11px] font-semibold uppercase tracking-wide py-1.5" style={{ color: T.textMuted }}>{d}</div>
                    ))}
                  </div>

                  {/* Day grid */}
                  <div className="grid grid-cols-7 px-3 pb-4 gap-y-0.5">
                    {calDays.map((dayStr) => {
                      const dayNum = parseInt(dayStr.split("-")[2])
                      const dayMonthNum = parseInt(dayStr.split("-")[1]) - 1
                      const inCurrentMonth = dayMonthNum === calMonth.getMonth()
                      const isToday = dayStr === todayStr
                      const isSelected = dayStr === selectedDate
                      const disabled = isDayDisabled(dayStr)

                      let dayStyle: React.CSSProperties = {}

                      if (isSelected) {
                        dayStyle = { background: T.primary, color: T.primaryText, fontWeight: 700, borderRadius: 12, boxShadow: `0 2px 8px ${T.primaryShadow}` }
                      } else if (isToday && !disabled) {
                        dayStyle = { background: `${T.primary}15`, color: T.primary, fontWeight: 700, borderRadius: 12 }
                      } else if (disabled) {
                        dayStyle = { color: `${T.textMuted}50`, cursor: "default", textDecoration: "line-through", textDecorationColor: `${T.textMuted}30` }
                      } else if (inCurrentMonth) {
                        dayStyle = { color: T.textBody, fontWeight: 500 }
                      } else {
                        dayStyle = { color: `${T.textMuted}60` }
                      }

                      return (
                        <button
                          key={dayStr}
                          disabled={disabled}
                          onClick={() => setSelectedDate(dayStr)}
                          className="h-10 w-full rounded-xl text-sm transition-all duration-100"
                          style={dayStyle}
                          onMouseEnter={e => {
                            if (!isSelected && !disabled) { e.currentTarget.style.background = `${T.primary}12`; e.currentTarget.style.color = T.primary }
                          }}
                          onMouseLeave={e => {
                            if (!isSelected && !disabled) {
                              e.currentTarget.style.background = isToday ? `${T.primary}15` : "transparent"
                              e.currentTarget.style.color = isToday ? T.primary : (inCurrentMonth ? T.textBody : `${T.textMuted}60`)
                            }
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
                      { label: "Matin", slots: grouped.morning },
                      { label: "Apres-midi", slots: grouped.afternoon },
                      { label: "Soir", slots: grouped.evening },
                    ].filter(p => p.slots.length > 0)
                    return (
                      <div className="space-y-5 mb-6">
                        {periods.map(period => (
                          <div key={period.label}>
                            <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: T.textMuted }}>
                              {period.label}
                            </p>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                              {period.slots.map(slot => (
                                <button
                                  key={slot}
                                  onClick={() => setSelectedSlot(slot)}
                                  className="py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-150"
                                  style={
                                    slot === selectedSlot
                                      ? { background: T.primary, color: T.primaryText, boxShadow: `0 2px 8px ${T.primaryShadow}` }
                                      : { background: `${T.cardBorder}40`, color: T.textBody }
                                  }
                                  onMouseEnter={e => {
                                    if (slot !== selectedSlot) {
                                      e.currentTarget.style.background = `${T.primary}20`
                                      e.currentTarget.style.color = T.primary
                                    }
                                  }}
                                  onMouseLeave={e => {
                                    if (slot !== selectedSlot) {
                                      e.currentTarget.style.background = `${T.cardBorder}40`
                                      e.currentTarget.style.color = T.textBody
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
                      className={`w-full py-4 rounded-2xl font-bold text-base transition-all duration-150 mt-2${T.glowEffect ? " future-glow shimmer-btn" : ""}`}
                      style={{ background: T.glowEffect ? undefined : T.primary, color: T.primaryText, boxShadow: `0 8px 24px ${T.primaryShadow}` }}
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

              <h2 className="text-2xl font-bold mb-1" style={{ color: T.textHeading }}>Vos coordonnees</h2>
              <p className="text-sm mb-6" style={{ color: T.textMuted }}>Pour confirmer votre reservation</p>

              {/* Compact recap */}
              <div className="rounded-2xl p-4 mb-6" style={{ background: `${T.primary}08`, border: `1.5px solid ${T.primary}20` }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${T.primary}15` }}>
                    <Calendar className="w-5 h-5" style={{ color: T.primary }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    {isRestaurant ? (
                      <>
                        <p className="font-semibold text-sm" style={{ color: T.textHeading }}>Table pour {partySize}</p>
                        <p className="text-xs capitalize" style={{ color: T.textMuted }}>{fmtDateLong(selectedDate)} - {selectedSlot}</p>
                      </>
                    ) : selectedService && (
                      <>
                        <p className="font-semibold text-sm truncate" style={{ color: T.textHeading }}>{selectedService.name}</p>
                        <p className="text-xs capitalize" style={{ color: T.textMuted }}>
                          {fmtDate(selectedDate)} - {selectedSlot} - {selectedService.duration} min
                          {selectedStaff && !anyStaff ? ` - ${selectedStaff.name}` : ""}
                        </p>
                      </>
                    )}
                  </div>
                  {selectedService && (
                    <span className="text-sm font-bold flex-shrink-0" style={{ color: T.primary }}>{selectedService.price.toFixed(0)} &euro;</span>
                  )}
                </div>
              </div>

              <div className="space-y-4 max-w-md">
                {[
                  { key: "name",  label: "Nom complet",   type: "text",  placeholder: "Jean Dupont",      required: true },
                  { key: "email", label: "Email",          type: "email", placeholder: "jean@exemple.fr",  required: true },
                  { key: "phone", label: "Telephone",      type: "tel",   placeholder: "06 12 34 56 78",   required: false },
                  { key: "notes", label: "Note (optionnel)", type: "text",  placeholder: isRestaurant ? "Chaise bebe, allergie..." : "Preference, allergie...", required: false },
                ].map(({ key, label, type, placeholder, required }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: T.textMuted }}>
                      {label} {required && <span style={{ color: T.primary }}>*</span>}
                    </label>
                    <input
                      type={type}
                      value={form[key as keyof typeof form]}
                      placeholder={placeholder}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                      style={{
                        background: T.inputBg,
                        border: `1.5px solid ${T.inputBorder}`,
                        color: T.textHeading,
                        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.primaryShadow}` }}
                      onBlur={e => { e.currentTarget.style.borderColor = T.inputBorder; e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)" }}
                    />
                  </div>
                ))}

                {/* SMS opt-in — visible uniquement si téléphone renseigné */}
                {form.phone && (
                  <label className="flex items-start gap-3 cursor-pointer pt-1">
                    <input type="checkbox" checked={smsOptIn} onChange={e => setSmsOptIn(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded accent-current flex-shrink-0"
                      style={{ accentColor: T.primary }} />
                    <span className="text-xs leading-relaxed" style={{ color: T.textMuted }}>
                      Je souhaite recevoir un rappel par SMS 24h avant mon rendez-vous
                    </span>
                  </label>
                )}

                <p className="text-xs flex items-center gap-1.5 pt-1" style={{ color: T.textMuted }}>
                  <Lock className="w-3 h-3" />
                  Vos donnees restent confidentielles
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
                className={`mt-8 hidden lg:block px-10 py-4 rounded-2xl font-bold text-base transition-all duration-150${(!submitting && form.name && form.email && T.glowEffect) ? " shimmer-btn future-glow" : ""}`}
                style={
                  submitting || !form.name || !form.email
                    ? { background: T.stepFuture, color: T.textMuted, cursor: "not-allowed" }
                    : { background: T.glowEffect ? undefined : T.primary, color: T.primaryText, boxShadow: `0 8px 24px ${T.primaryShadow}` }
                }
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
                {info && (
                  <a
                    href={`/my?biz=${info.businessId}&name=${encodeURIComponent(info.businessName)}`}
                    className="w-full py-3 rounded-2xl font-semibold text-sm text-center transition-all duration-150 border"
                    style={{ color: T.textMuted, borderColor: T.cardBorder, background: T.cardBg }}
                  >
                    Gérer mes réservations →
                  </a>
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ══ Mobile floating recap + CTA bar ═══════════════════════════════════ */}
      {step !== "done" && step !== "service" && (
        <div
          className="lg:hidden fixed bottom-0 left-0 right-0 z-20"
          style={{ background: `${T.sidebarBg}f2`, backdropFilter: "blur(16px)", borderTop: `1px solid ${T.sidebarBorder}` }}
        >
          {/* Mini recap */}
          {(selectedService || isRestaurant) && (
            <div className="px-4 pt-3 pb-1 flex items-center gap-2 text-xs" style={{ color: T.textMuted }}>
              {selectedService && <span className="font-semibold truncate" style={{ color: T.textHeading }}>{selectedService.name}</span>}
              {selectedStaff && !anyStaff && <><span>·</span><span>{selectedStaff.name}</span></>}
              {selectedDate && <><span>·</span><span className="capitalize">{fmtDate(selectedDate)}</span></>}
              {selectedSlot && <><span>·</span><span>{selectedSlot}</span></>}
              {isRestaurant && <span className="font-semibold" style={{ color: T.textHeading }}>{partySize} pers.</span>}
              <span className="ml-auto flex-shrink-0 font-bold text-sm" style={{ color: T.primary }}>
                {selectedService ? `${selectedService.price.toFixed(0)}\u00A0\u20AC` : ""}
              </span>
            </div>
          )}

          {/* CTA button */}
          <div className="px-4 pb-4 pt-2">
            {step === "form" ? (
              <button
                onClick={submit}
                disabled={submitting || !form.name || !form.email}
                className="w-full py-3.5 rounded-2xl font-bold text-[15px] transition-all"
                style={
                  submitting || !form.name || !form.email
                    ? { background: T.stepFuture, color: T.textMuted, cursor: "not-allowed" }
                    : { background: T.primary, color: T.primaryText, boxShadow: `0 4px 16px ${T.primaryShadow}` }
                }
              >
                {submitting ? "Envoi en cours..." : "Confirmer la reservation"}
              </button>
            ) : step === "datetime" && selectedSlot ? (
              <button
                onClick={() => setStep("form")}
                className="w-full py-3.5 rounded-2xl font-bold text-[15px] transition-all"
                style={{ background: T.primary, color: T.primaryText, boxShadow: `0 4px 16px ${T.primaryShadow}` }}
              >
                Continuer
              </button>
            ) : null}
          </div>
        </div>
      )}

    </div>
  )
}
