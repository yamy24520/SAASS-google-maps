"use client"

import { use, useEffect, useState } from "react"
import { CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react"

interface BookingInfo {
  clientName: string
  businessName: string
  serviceName: string
  date: string
  timeSlot: string
  status: string
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })
}

export default function CancelPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [booking, setBooking] = useState<BookingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch(`/api/cancel/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setNotFound(true); setLoading(false); return }
        setBooking(d)
        if (d.status === "CANCELLED") setCancelled(true)
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [token])

  async function handleCancel() {
    setCancelling(true)
    const res = await fetch(`/api/cancel/${token}`, { method: "DELETE" })
    const data = await res.json()
    if (res.ok) {
      setCancelled(true)
    } else {
      setError(data.error ?? "Une erreur est survenue")
    }
    setCancelling(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, border: "3px solid #e2e8f0", borderTopColor: "#0ea5e9", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (notFound) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "-apple-system, sans-serif" }}>
        <div style={{ maxWidth: 440, width: "100%", background: "white", borderRadius: 20, padding: 40, textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 28 }}>❓</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e293b", margin: "0 0 8px" }}>Lien invalide</h2>
          <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>Ce lien d&apos;annulation est invalide ou a déjà été utilisé.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "-apple-system, sans-serif" }}>
      <div style={{ maxWidth: 440, width: "100%", background: "white", borderRadius: 20, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #0ea5e9, #06b6d4)", padding: "28px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "white" }}>Reputix</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 4 }}>{booking?.businessName}</div>
        </div>

        <div style={{ padding: 32 }}>
          {cancelled ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 26 }}>✅</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e293b", margin: "0 0 8px" }}>Réservation annulée</h2>
              <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>Votre réservation a bien été annulée. Vous recevrez une confirmation par email.</p>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e293b", margin: "0 0 6px" }}>Annuler ma réservation</h2>
              <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 24px" }}>
                Bonjour <strong>{booking?.clientName}</strong>, êtes-vous sûr(e) de vouloir annuler ce rendez-vous ?
              </p>

              {/* Booking summary */}
              <div style={{ background: "#f8fafc", borderRadius: 12, padding: "16px 20px", marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: "#64748b", fontSize: 13 }}>Prestation</span>
                  <span style={{ fontWeight: 600, color: "#1e293b", fontSize: 14 }}>{booking?.serviceName}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: "#64748b", fontSize: 13 }}>Date</span>
                  <span style={{ fontWeight: 600, color: "#1e293b", fontSize: 14 }}>{booking ? fmtDate(booking.date) : ""}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b", fontSize: 13 }}>Heure</span>
                  <span style={{ fontWeight: 600, color: "#1e293b", fontSize: 14 }}>{booking?.timeSlot}</span>
                </div>
              </div>

              {error && (
                <div style={{ background: "#fee2e2", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
                  <p style={{ color: "#dc2626", fontSize: 13, margin: 0 }}>{error}</p>
                </div>
              )}

              <button
                onClick={handleCancel}
                disabled={cancelling}
                style={{
                  width: "100%", padding: "14px 24px", borderRadius: 10, border: "none", cursor: cancelling ? "not-allowed" : "pointer",
                  background: cancelling ? "#e2e8f0" : "#ef4444", color: "white", fontSize: 15, fontWeight: 600,
                  marginBottom: 12, transition: "background 0.2s",
                }}
              >
                {cancelling ? "Annulation en cours..." : "Confirmer l'annulation"}
              </button>

              <p style={{ color: "#94a3b8", fontSize: 12, textAlign: "center", margin: 0 }}>
                Cette action est irréversible. L&apos;établissement sera notifié.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
