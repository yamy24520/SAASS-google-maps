"use client"

import { use, useEffect, useState } from "react"
import { CheckCircle2, ChevronLeft, Clock, Euro } from "lucide-react"

interface Service { id: string; name: string; description: string | null; duration: number; price: number }
interface BusinessInfo { businessId: string; businessName: string; logoDataUrl: string | null; pageTheme: string }

type Step = "service" | "datetime" | "form" | "done"

function Spinner() {
  return <div style={{ width: 20, height: 20, border: "2px solid rgba(0,0,0,0.1)", borderTopColor: "#0ea5e9", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto" }} />
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

export default function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)

  const [info, setInfo] = useState<BusinessInfo | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [step, setStep] = useState<Step>("service")
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string>("")

  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  // Load business info + services
  useEffect(() => {
    Promise.all([
      fetch(`/api/r/${slug}`).then(r => r.json()),
      fetch(`/api/book/${slug}`).then(r => r.json()),
    ]).then(([pageData, bookData]) => {
      if (pageData.error || !bookData.bookingEnabled) { setNotFound(true); setLoading(false); return }
      setInfo({ businessId: pageData.businessId, businessName: pageData.businessName, logoDataUrl: pageData.logoDataUrl, pageTheme: pageData.pageTheme })
      setServices(bookData.services ?? [])
      setLoading(false)
    }).catch(() => { setNotFound(true); setLoading(false) })
  }, [slug])

  // Load slots when date changes
  useEffect(() => {
    if (!selectedService || !selectedDate || !info) return
    setLoadingSlots(true)
    setSlots([])
    setSelectedSlot("")
    fetch(`/api/availability?businessId=${info.businessId}&serviceId=${selectedService.id}&date=${selectedDate}`)
      .then(r => r.json()).then(d => { setSlots(d.slots ?? []); setLoadingSlots(false) })
  }, [selectedService, selectedDate, info])

  async function submit() {
    if (!info || !selectedService || !selectedDate || !selectedSlot) return
    setSubmitting(true)
    setSubmitError("")
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId: info.businessId,
        serviceId: selectedService.id,
        clientName: form.name,
        clientEmail: form.email,
        clientPhone: form.phone || null,
        date: selectedDate,
        timeSlot: selectedSlot,
        notes: form.notes || null,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setStep("done")
    } else {
      setSubmitError(data.error ?? "Une erreur est survenue")
    }
    setSubmitting(false)
  }

  if (loading) return (
    <div style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <Spinner />
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
      <p style={{ color: "#94a3b8", fontSize: 14 }}>Page de réservation introuvable</p>
    </div>
  )

  const accent = "#0ea5e9"
  const dates = getDatesAhead(14)

  return (
    <div style={{ minHeight: "100svh", background: "#f8fafc", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box}`}</style>

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, maxWidth: 520, margin: "0 auto" }}>
        {info?.logoDataUrl ? (
          <img src={info.logoDataUrl} style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }} alt="" />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg,${accent},#38bdf8)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 18 }}>
            {info?.businessName.charAt(0)}
          </div>
        )}
        <div>
          <p style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", margin: 0 }}>{info?.businessName}</p>
          <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>Réservation en ligne</p>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "24px 16px 60px" }}>

        {/* Steps indicator */}
        {step !== "done" && (
          <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28 }}>
            {(["service", "datetime", "form"] as Step[]).map((s, i) => {
              const labels = ["Prestation", "Date & heure", "Coordonnées"]
              const stepIdx = ["service", "datetime", "form"].indexOf(step)
              const done = i < stepIdx
              const active = s === step
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : "none" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: done || active ? accent : "#e2e8f0", color: done || active ? "#fff" : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, transition: "all 0.2s" }}>
                      {done ? "✓" : i + 1}
                    </div>
                    <span style={{ fontSize: 10, color: active ? accent : "#94a3b8", fontWeight: active ? 600 : 400, whiteSpace: "nowrap" }}>{labels[i]}</span>
                  </div>
                  {i < 2 && <div style={{ flex: 1, height: 2, background: done ? accent : "#e2e8f0", margin: "0 6px", marginBottom: 18, transition: "background 0.2s" }} />}
                </div>
              )
            })}
          </div>
        )}

        {/* STEP 1 — Service */}
        {step === "service" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>Choisissez une prestation</p>
            {services.length === 0 && <p style={{ color: "#94a3b8", fontSize: 14, textAlign: "center", padding: "32px 0" }}>Aucune prestation disponible</p>}
            {services.map(svc => (
              <button key={svc.id} onClick={() => { setSelectedService(svc); setStep("datetime") }}
                style={{ background: "#fff", border: "2px solid #e2e8f0", borderRadius: 16, padding: "16px 18px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 14, transition: "border-color 0.15s", outline: "none" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = accent)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#e2e8f0")}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 15, color: "#0f172a", margin: "0 0 4px" }}>{svc.name}</p>
                  {svc.description && <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 6px" }}>{svc.description}</p>}
                  <span style={{ fontSize: 12, color: "#64748b", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Clock style={{ width: 12, height: 12 }} /> {svc.duration} min
                  </span>
                </div>
                <p style={{ fontWeight: 700, fontSize: 17, color: accent, margin: 0, whiteSpace: "nowrap" }}>{svc.price.toFixed(2)} €</p>
              </button>
            ))}
          </div>
        )}

        {/* STEP 2 — Date & Heure */}
        {step === "datetime" && selectedService && (
          <div>
            <button onClick={() => setStep("service")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 14, padding: "0 0 16px", fontWeight: 500 }}>
              <ChevronLeft style={{ width: 16, height: 16 }} /> Retour
            </button>

            <div style={{ background: "#fff", borderRadius: 16, padding: "14px 16px", marginBottom: 20, border: "1px solid #e2e8f0" }}>
              <p style={{ fontWeight: 600, fontSize: 14, color: "#0f172a", margin: "0 0 2px" }}>{selectedService.name}</p>
              <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>{selectedService.duration} min · {selectedService.price.toFixed(2)} €</p>
            </div>

            <p style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", margin: "0 0 12px" }}>Choisissez une date</p>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 24, scrollbarWidth: "none" }}>
              {dates.map(d => {
                const active = d === selectedDate
                return (
                  <button key={d} onClick={() => setSelectedDate(d)}
                    style={{ flexShrink: 0, padding: "10px 14px", borderRadius: 12, border: `2px solid ${active ? accent : "#e2e8f0"}`, background: active ? accent : "#fff", color: active ? "#fff" : "#0f172a", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", textAlign: "center", minWidth: 68 }}>
                    {fmtDate(d)}
                  </button>
                )
              })}
            </div>

            {selectedDate && (
              <>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", margin: "0 0 12px" }}>Choisissez un créneau</p>
                {loadingSlots ? (
                  <div style={{ padding: "24px 0" }}><Spinner /></div>
                ) : slots.length === 0 ? (
                  <p style={{ color: "#94a3b8", fontSize: 14, textAlign: "center", padding: "20px 0" }}>Aucun créneau disponible ce jour</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 24 }}>
                    {slots.map(slot => {
                      const active = slot === selectedSlot
                      return (
                        <button key={slot} onClick={() => setSelectedSlot(slot)}
                          style={{ padding: "10px 4px", borderRadius: 10, border: `2px solid ${active ? accent : "#e2e8f0"}`, background: active ? accent : "#fff", color: active ? "#fff" : "#0f172a", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
                          {slot}
                        </button>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {selectedSlot && (
              <button onClick={() => setStep("form")}
                style={{ width: "100%", padding: "14px", borderRadius: 14, background: accent, color: "#fff", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer" }}>
                Continuer →
              </button>
            )}
          </div>
        )}

        {/* STEP 3 — Form */}
        {step === "form" && selectedService && (
          <div>
            <button onClick={() => setStep("datetime")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 14, padding: "0 0 16px", fontWeight: 500 }}>
              <ChevronLeft style={{ width: 16, height: 16 }} /> Retour
            </button>

            {/* Recap */}
            <div style={{ background: `${accent}10`, border: `1px solid ${accent}30`, borderRadius: 14, padding: "14px 16px", marginBottom: 24 }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", margin: "0 0 4px" }}>{selectedService.name}</p>
              <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                {fmtDate(selectedDate)} à {selectedSlot} · {selectedService.duration} min · {selectedService.price.toFixed(2)} €
              </p>
            </div>

            <p style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", margin: "0 0 16px" }}>Vos coordonnées</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { key: "name", label: "Nom complet *", type: "text", placeholder: "Jean Dupont" },
                { key: "email", label: "Email *", type: "email", placeholder: "jean@exemple.fr" },
                { key: "phone", label: "Téléphone", type: "tel", placeholder: "06 12 34 56 78" },
                { key: "notes", label: "Note (optionnel)", type: "text", placeholder: "Cheveux courts, allergie..." },
              ].map(({ key, label, type, placeholder }) => (
                <div key={key}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: "#475569", display: "block", marginBottom: 6 }}>{label}</label>
                  <input type={type} value={form[key as keyof typeof form]} placeholder={placeholder}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, color: "#0f172a", outline: "none", transition: "border-color 0.15s" }}
                    onFocus={e => (e.target.style.borderColor = accent)}
                    onBlur={e => (e.target.style.borderColor = "#e2e8f0")} />
                </div>
              ))}
            </div>

            {submitError && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 12, textAlign: "center" }}>{submitError}</p>}

            <button onClick={submit} disabled={submitting || !form.name || !form.email}
              style={{ width: "100%", padding: "14px", borderRadius: 14, background: submitting || !form.name || !form.email ? "#94a3b8" : accent, color: "#fff", fontWeight: 700, fontSize: 15, border: "none", cursor: submitting ? "default" : "pointer", marginTop: 20, transition: "background 0.15s" }}>
              {submitting ? "Envoi en cours..." : "Confirmer la réservation"}
            </button>
          </div>
        )}

        {/* STEP 4 — Done */}
        {step === "done" && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <CheckCircle2 style={{ width: 36, height: 36, color: "#22c55e" }} />
            </div>
            <p style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>Réservation envoyée !</p>
            <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 8px" }}>
              {selectedService?.name} · {fmtDate(selectedDate)} à {selectedSlot}
            </p>
            <p style={{ fontSize: 13, color: "#94a3b8" }}>Vous recevrez une confirmation dès que {info?.businessName} aura validé votre RDV.</p>
            <button onClick={() => { setStep("service"); setSelectedService(null); setSelectedDate(""); setSelectedSlot(""); setForm({ name: "", email: "", phone: "", notes: "" }) }}
              style={{ marginTop: 32, padding: "12px 28px", borderRadius: 12, background: accent, color: "#fff", fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer" }}>
              Nouvelle réservation
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
