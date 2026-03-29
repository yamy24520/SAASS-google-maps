"use client"

import { use, useEffect, useState } from "react"
import { CheckCircle2, ChevronLeft, Clock, CreditCard, MapPin, Users, Star, Sparkles } from "lucide-react"

interface Service { id: string; name: string; description: string | null; duration: number; price: number }
interface Staff   { id: string; name: string; color: string }
interface BusinessInfo {
  businessId: string; businessName: string; logoDataUrl: string | null
  pageTheme: string; maxDaysAhead: number; bookingType: string; bookingMaxCovers: number | null
  paymentEnabled: boolean; depositType: string; depositValue: number; stripeReady: boolean
}

type Step = "service" | "staff" | "datetime" | "form" | "payment" | "done"

function Spinner() {
  return (
    <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-sky-500 animate-spin mx-auto" />
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
        pageTheme: pageData.pageTheme,
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

  if (loading) return (
    <div className="min-h-svh bg-gradient-to-br from-sky-50 to-slate-100 flex items-center justify-center">
      <div className="text-center">
        <Spinner />
        <p className="text-sm text-slate-400 mt-4">Chargement…</p>
      </div>
    </div>
  )

  if (notFound) return (
    <div className="min-h-svh bg-gradient-to-br from-sky-50 to-slate-100 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-200 flex items-center justify-center mx-auto mb-4">
          <Star className="w-8 h-8 text-slate-400" />
        </div>
        <p className="font-semibold text-slate-700">Page introuvable</p>
        <p className="text-sm text-slate-400 mt-1">Cette page de réservation n&apos;existe pas ou a été désactivée.</p>
      </div>
    </div>
  )

  const isRestaurant = info?.bookingType === "restaurant"
  const hasStaff = staffs.length > 0
  const dates = getDatesAhead(info?.maxDaysAhead ?? 60)

  const paymentStep: Step[] = info?.paymentEnabled ? ["payment"] : []
  const STEPS: Step[] = isRestaurant
    ? ["datetime", "form", ...paymentStep]
    : hasStaff ? ["service", "staff", "datetime", "form", ...paymentStep] : ["service", "datetime", "form", ...paymentStep]
  const LABELS: Record<Step, string> = {
    service: "Prestation", staff: "Prestataire", datetime: "Date & heure",
    form: "Coordonnées", payment: "Paiement", done: "Confirmé"
  }

  const stepIdx = STEPS.indexOf(step)

  return (
    <div className="min-h-svh bg-gradient-to-br from-sky-50 via-white to-slate-100">

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          {info?.logoDataUrl ? (
            <img src={info.logoDataUrl} className="w-10 h-10 rounded-xl object-cover shadow-sm" alt="" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              {info?.businessName.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 text-base truncate">{info?.businessName}</p>
            <p className="text-xs text-slate-500">{isRestaurant ? "Réservation de table" : "Prise de rendez-vous"}</p>
          </div>
          <div className="flex items-center gap-1 bg-emerald-50 text-emerald-600 text-xs font-semibold px-2.5 py-1 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            En ligne
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">

        {/* Progress steps */}
        {step !== "done" && (
          <div className="flex items-center mb-8">
            {STEPS.map((s, i) => {
              const done = i < stepIdx
              const active = s === step
              return (
                <div key={s} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? 1 : "none" }}>
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                      done ? "bg-sky-500 text-white" : active ? "bg-sky-500 text-white ring-4 ring-sky-100" : "bg-slate-100 text-slate-400"
                    }`}>
                      {done ? "✓" : i + 1}
                    </div>
                    <span className={`text-[10px] font-medium whitespace-nowrap ${active ? "text-sky-500" : "text-slate-400"}`}>
                      {LABELS[s]}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1.5 mb-4 rounded-full transition-all duration-300 ${done ? "bg-sky-400" : "bg-slate-200"}`} />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── STEP: Service ── */}
        {step === "service" && !isRestaurant && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="mb-6">
              <h1 className="text-xl font-bold text-slate-900">Choisissez une prestation</h1>
              <p className="text-sm text-slate-500 mt-1">{services.length} prestation{services.length > 1 ? "s" : ""} disponible{services.length > 1 ? "s" : ""}</p>
            </div>
            {services.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Aucune prestation disponible</p>
              </div>
            )}
            {services.map(svc => (
              <button key={svc.id}
                onClick={() => { setSelectedService(svc); setStep(hasStaff ? "staff" : "datetime") }}
                className="w-full bg-white hover:bg-sky-50 border-2 border-slate-100 hover:border-sky-300 rounded-2xl p-4 text-left transition-all duration-150 group shadow-sm hover:shadow-md">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-base group-hover:text-sky-700 transition-colors">{svc.name}</p>
                    {svc.description && <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{svc.description}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
                        <Clock className="w-3 h-3" /> {svc.duration} min
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className="text-lg font-bold text-sky-500">{svc.price.toFixed(2)} €</span>
                    <div className="mt-1 w-7 h-7 rounded-full bg-sky-50 group-hover:bg-sky-500 flex items-center justify-center ml-auto transition-colors">
                      <ChevronLeft className="w-4 h-4 text-sky-400 group-hover:text-white rotate-180 transition-colors" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── STEP: Staff ── */}
        {step === "staff" && hasStaff && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
            <button onClick={() => setStep("service")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Retour
            </button>
            <div className="mb-6">
              <h1 className="text-xl font-bold text-slate-900">Choisissez un prestataire</h1>
              <p className="text-sm text-slate-500 mt-1">Avec qui souhaitez-vous prendre rendez-vous ?</p>
            </div>
            <div className="space-y-3">
              <button onClick={() => { setAnyStaff(true); setSelectedStaff(null); setStep("datetime") }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-150 text-left shadow-sm hover:shadow-md ${anyStaff ? "border-sky-400 bg-sky-50" : "border-slate-100 bg-white hover:border-sky-200"}`}>
                <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Premier disponible</p>
                  <p className="text-sm text-slate-500">Peu importe le prestataire</p>
                </div>
              </button>
              {staffs.map(s => (
                <button key={s.id}
                  onClick={() => { setSelectedStaff(s); setAnyStaff(false); setStep("datetime") }}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-150 text-left shadow-sm hover:shadow-md ${!anyStaff && selectedStaff?.id === s.id ? "border-sky-400 bg-sky-50" : "border-slate-100 bg-white hover:border-sky-200"}`}>
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0" style={{ background: s.color }}>
                    {s.name.charAt(0)}
                  </div>
                  <p className="font-semibold text-slate-900">{s.name}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP: Date & Heure ── */}
        {step === "datetime" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
            {!isRestaurant && (
              <button onClick={() => setStep(hasStaff ? "staff" : "service")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Retour
              </button>
            )}

            {/* Recap service */}
            {selectedService && (
              <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-4 py-3 mb-6 shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-sky-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">{selectedService.name}</p>
                  <p className="text-xs text-slate-500">{selectedService.duration} min · {selectedService.price.toFixed(2)} €{selectedStaff && !anyStaff ? ` · ${selectedStaff.name}` : ""}</p>
                </div>
              </div>
            )}

            {/* Restaurant: nombre de personnes */}
            {isRestaurant && (
              <div className="mb-6">
                <p className="text-base font-semibold text-slate-900 mb-3">Nombre de personnes</p>
                <div className="flex gap-2 flex-wrap">
                  {[1,2,3,4,5,6,7,8].map(n => (
                    <button key={n} onClick={() => setPartySize(n)}
                      className={`w-11 h-11 rounded-xl font-bold text-sm transition-all duration-150 border-2 ${partySize === n ? "bg-sky-500 border-sky-500 text-white shadow-md shadow-sky-200" : "bg-white border-slate-200 text-slate-700 hover:border-sky-300"}`}>
                      {n}
                    </button>
                  ))}
                  <div className="flex items-center">
                    <input type="number" min="1" value={partySize} onChange={e => setPartySize(Math.max(1, Number(e.target.value)))}
                      className="w-16 h-11 text-center border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-sky-400 transition-colors" />
                  </div>
                </div>
                {info?.bookingMaxCovers && <p className="text-xs text-slate-400 mt-2">Maximum {info.bookingMaxCovers} couverts par créneau</p>}
              </div>
            )}

            {/* Date picker */}
            <p className="text-base font-semibold text-slate-900 mb-3">Choisissez une date</p>
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none -mx-1 px-1">
              {dates.map(d => {
                const active = d === selectedDate
                const dateObj = new Date(d + "T12:00:00")
                const isToday = d === new Date().toISOString().split("T")[0]
                return (
                  <button key={d} onClick={() => setSelectedDate(d)}
                    className={`flex-shrink-0 flex flex-col items-center px-3 py-2.5 rounded-xl border-2 transition-all duration-150 min-w-[60px] ${
                      active ? "bg-sky-500 border-sky-500 text-white shadow-md shadow-sky-200" : "bg-white border-slate-100 text-slate-700 hover:border-sky-200"
                    }`}>
                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${active ? "text-sky-100" : "text-slate-400"}`}>
                      {isToday ? "Auj." : dateObj.toLocaleDateString("fr-FR", { weekday: "short" })}
                    </span>
                    <span className="text-lg font-bold leading-tight">{dateObj.getDate()}</span>
                    <span className={`text-[10px] ${active ? "text-sky-100" : "text-slate-400"}`}>
                      {dateObj.toLocaleDateString("fr-FR", { month: "short" })}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Time slots */}
            {selectedDate && (
              <div className="animate-in fade-in duration-200">
                <p className="text-base font-semibold text-slate-900 mb-3">
                  Créneaux disponibles
                  <span className="text-sm font-normal text-slate-400 ml-2">— {fmtDateLong(selectedDate)}</span>
                </p>
                {loadingSlots ? (
                  <div className="py-10"><Spinner /></div>
                ) : slots.length === 0 ? (
                  <div className="text-center py-10 bg-white rounded-2xl border border-slate-100">
                    <p className="text-slate-400 text-sm">Aucun créneau disponible ce jour</p>
                    <p className="text-slate-300 text-xs mt-1">Essayez une autre date</p>
                  </div>
                ) : (() => {
                  const grouped = groupSlots(slots)
                  const periods = [
                    { label: "Matin", emoji: "🌅", slots: grouped.morning },
                    { label: "Après-midi", emoji: "☀️", slots: grouped.afternoon },
                    { label: "Soir", emoji: "🌆", slots: grouped.evening },
                  ].filter(p => p.slots.length > 0)
                  return (
                    <div className="space-y-5 mb-6">
                      {periods.map(period => (
                        <div key={period.label}>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{period.emoji} {period.label}</p>
                          <div className="grid grid-cols-4 gap-2">
                            {period.slots.map(slot => (
                              <button key={slot} onClick={() => setSelectedSlot(slot)}
                                className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-150 ${
                                  slot === selectedSlot
                                    ? "bg-sky-500 border-sky-500 text-white shadow-md shadow-sky-200 scale-105"
                                    : "bg-white border-slate-100 text-slate-700 hover:border-sky-300 hover:text-sky-600"
                                }`}>
                                {slot}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            )}

            {selectedSlot && (
              <button onClick={() => setStep("form")}
                className="w-full py-4 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-base transition-all duration-150 shadow-lg shadow-sky-200 mt-2">
                Continuer →
              </button>
            )}
          </div>
        )}

        {/* ── STEP: Form ── */}
        {step === "form" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
            <button onClick={() => setStep("datetime")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Retour
            </button>

            {/* Récap */}
            <div className="bg-gradient-to-r from-sky-500 to-cyan-500 rounded-2xl p-4 mb-6 text-white shadow-lg shadow-sky-200">
              {isRestaurant ? (
                <>
                  <p className="font-bold text-base">Table pour {partySize} personne{partySize > 1 ? "s" : ""}</p>
                  <p className="text-sky-100 text-sm mt-0.5">{fmtDateLong(selectedDate)} à {selectedSlot}</p>
                </>
              ) : selectedService && (
                <>
                  <p className="font-bold text-base">{selectedService.name}</p>
                  <p className="text-sky-100 text-sm mt-0.5">
                    {fmtDateLong(selectedDate)} à {selectedSlot} · {selectedService.duration} min · {selectedService.price.toFixed(2)} €
                    {selectedStaff && !anyStaff ? ` · ${selectedStaff.name}` : ""}
                  </p>
                </>
              )}
            </div>

            <h2 className="text-xl font-bold text-slate-900 mb-5">Vos coordonnées</h2>

            <div className="space-y-4">
              {[
                { key: "name",  label: "Nom complet",  type: "text",  placeholder: "Jean Dupont",       required: true },
                { key: "email", label: "Adresse email", type: "email", placeholder: "jean@exemple.fr",  required: true },
                { key: "phone", label: "Téléphone",     type: "tel",   placeholder: "06 12 34 56 78",   required: false },
                { key: "notes", label: "Note",          type: "text",  placeholder: isRestaurant ? "Chaise bébé, allergie, occasion spéciale…" : "Cheveux courts, allergie, préférence…", required: false },
              ].map(({ key, label, type, placeholder, required }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {label} {required && <span className="text-sky-500">*</span>}
                  </label>
                  <input
                    type={type}
                    value={form[key as keyof typeof form]}
                    placeholder={placeholder}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 text-slate-900 text-sm outline-none focus:border-sky-400 transition-colors bg-white placeholder:text-slate-300"
                  />
                </div>
              ))}
            </div>

            {submitError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-600 text-sm">{submitError}</p>
              </div>
            )}

            <button onClick={submit} disabled={submitting || !form.name || !form.email}
              className={`w-full py-4 rounded-2xl font-bold text-base mt-6 transition-all duration-150 ${
                submitting || !form.name || !form.email
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-200"
              }`}>
              {submitting ? "Envoi en cours…" : "Confirmer la réservation"}
            </button>

            <p className="text-center text-xs text-slate-400 mt-3">
              Vous recevrez une confirmation par email
            </p>
          </div>
        )}

        {/* ── STEP: Payment ── */}
        {step === "payment" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
            <button onClick={() => setStep("form")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Retour
            </button>

            {/* Récap */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 mb-6 shadow-sm">
              {isRestaurant ? (
                <>
                  <p className="font-semibold text-slate-900">Table pour {partySize} personne{partySize > 1 ? "s" : ""}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{fmtDateLong(selectedDate)} à {selectedSlot}</p>
                </>
              ) : selectedService && (
                <>
                  <p className="font-semibold text-slate-900">{selectedService.name}</p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {fmtDateLong(selectedDate)} à {selectedSlot} · {selectedService.duration} min
                    {selectedStaff && !anyStaff ? ` · ${selectedStaff.name}` : ""}
                  </p>
                </>
              )}
            </div>

            <h2 className="text-xl font-bold text-slate-900 mb-2">Comment souhaitez-vous régler ?</h2>
            {selectedService && (
              <p className="text-sm text-slate-500 mb-6">
                {info?.depositType === "percent"
                  ? `Acompte de ${info.depositValue}% — ${((selectedService.price * (info?.depositValue ?? 100)) / 100).toFixed(2)} €`
                  : info?.depositType === "fixed"
                  ? `Acompte fixe de ${info?.depositValue?.toFixed(2)} €`
                  : `Paiement complet de ${selectedService.price.toFixed(2)} €`}
              </p>
            )}

            <div className="space-y-3">
              {/* Payer en ligne */}
              <button onClick={payOnline} disabled={payingOnline}
                className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all duration-150 ${
                  payingOnline ? "border-sky-300 bg-sky-50 opacity-70" : "border-sky-400 bg-white hover:bg-sky-50 shadow-sm hover:shadow-md"
                }`}>
                <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-6 h-6 text-sky-500" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-900">{payingOnline ? "Redirection en cours…" : "Payer en ligne"}</p>
                  <p className="text-sm text-slate-500">Carte bancaire · Paiement sécurisé Stripe</p>
                </div>
                {!payingOnline && selectedService && (
                  <span className="font-bold text-sky-500 text-base flex-shrink-0">
                    {info?.depositType === "percent"
                      ? `${((selectedService.price * (info?.depositValue ?? 100)) / 100).toFixed(2)} €`
                      : info?.depositType === "fixed"
                      ? `${(info?.depositValue ?? 0).toFixed(2)} €`
                      : `${selectedService.price.toFixed(2)} €`}
                  </span>
                )}
              </button>

              {/* Payer sur place */}
              <button onClick={() => setStep("done")} disabled={payingOnline}
                className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-100 bg-white text-left transition-all duration-150 ${
                  payingOnline ? "opacity-40 cursor-not-allowed" : "hover:border-slate-300 shadow-sm hover:shadow-md"
                }`}>
                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Payer sur place</p>
                  <p className="text-sm text-slate-500">Règlement lors du rendez-vous</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: Done ── */}
        {step === "done" && (
          <div className="text-center animate-in fade-in zoom-in-95 duration-300 py-8">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Réservation envoyée !</h1>
            <p className="text-slate-500 text-sm mb-6">
              {isRestaurant
                ? `Table pour ${partySize} · ${fmtDateLong(selectedDate)} à ${selectedSlot}`
                : `${selectedService?.name} · ${fmtDateLong(selectedDate)} à ${selectedSlot}`}
            </p>

            <div className="bg-white rounded-2xl border border-slate-100 p-4 text-left shadow-sm mb-8 space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                Un email de confirmation vous sera envoyé
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                {info?.businessName} confirmera votre RDV prochainement
              </div>
            </div>

            <button onClick={() => {
              setStep(isRestaurant ? "datetime" : "service")
              setSelectedService(null); setSelectedStaff(null); setAnyStaff(false)
              setSelectedDate(""); setSelectedSlot(""); setPartySize(2)
              setForm({ name: "", email: "", phone: "", notes: "" })
              setCreatedBookingId(null); setPayingOnline(false)
            }}
              className="px-8 py-3 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-semibold transition-colors shadow-lg shadow-sky-200">
              Nouvelle réservation
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
