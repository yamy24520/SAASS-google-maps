"use client"

import { useSearchParams } from "next/navigation"
import { XCircle } from "lucide-react"
import Link from "next/link"

export default function BookingCancelPage() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get("booking")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-slate-400 to-slate-500 px-8 py-10 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Paiement annulé</h1>
          <p className="text-slate-200 mt-2 text-sm">Votre réservation n&apos;a pas été confirmée</p>
        </div>

        <div className="p-8 text-center space-y-4">
          <p className="text-slate-600 text-sm">
            Aucun montant n&apos;a été débité. Vous pouvez réessayer en reprenant votre réservation.
          </p>
          <button
            onClick={() => window.history.back()}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Retour à la réservation
          </button>
        </div>
      </div>
    </div>
  )
}
