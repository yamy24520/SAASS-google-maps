"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, CalendarDays, Clock, User } from "lucide-react"
import Link from "next/link"

interface Booking {
  clientName: string; date: string; timeSlot: string
  business: { name: string }
  service: { name: string; duration: number } | null
}

export default function BookingSuccessPage() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get("booking")
  const [booking, setBooking] = useState<Booking | null>(null)

  useEffect(() => {
    if (!bookingId) return
    fetch(`/api/bookings/public/${bookingId}`)
      .then(r => r.json())
      .then(d => { if (d.booking) setBooking(d.booking) })
  }, [bookingId])

  const dateLabel = booking
    ? new Date(booking.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : ""

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-10 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Réservation confirmée !</h1>
          <p className="text-emerald-100 mt-2 text-sm">Votre paiement a bien été reçu</p>
        </div>

        <div className="p-8">
          {booking ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-slate-700">
                <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-sm">{booking.clientName} · <span className="text-slate-500">{booking.business.name}</span></span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <CalendarDays className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-sm capitalize">{dateLabel}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-sm">{booking.timeSlot}{booking.service ? ` · ${booking.service.duration} min` : ""}</span>
              </div>
              {booking.service && (
                <div className="flex items-center gap-3 text-slate-700">
                  <span className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{booking.service.name}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-slate-400 text-sm animate-pulse">Chargement…</div>
          )}

          <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-700 text-center">
            Un email de confirmation vous a été envoyé.
          </div>
        </div>
      </div>
    </div>
  )
}
