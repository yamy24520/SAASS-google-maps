"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Mail, ArrowRight, Loader2 } from "lucide-react"

function ClientPortalLoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const businessId = searchParams.get("biz") ?? ""
  const businessName = searchParams.get("name") ?? "l'établissement"

  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !businessId) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/client-portal/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), businessId }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? "Erreur"); return }
      router.push(`/my/verify?biz=${businessId}&email=${encodeURIComponent(email.trim())}&name=${encodeURIComponent(businessName)}`)
    } catch {
      setError("Erreur de connexion")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-br from-sky-400 to-cyan-500 px-6 py-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
              <Mail className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-white font-bold text-xl">Mes réservations</h1>
            <p className="text-white/80 text-sm mt-1">{businessName}</p>
          </div>

          <form onSubmit={submit} className="p-6 space-y-4">
            <div>
              <p className="text-slate-600 text-sm mb-4">
                Entrez l&apos;email utilisé lors de votre réservation. Vous recevrez un code à 6 chiffres.
              </p>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm transition-colors disabled:opacity-40"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>Recevoir mon code <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Le code expire dans 10 minutes.
        </p>
      </div>
    </div>
  )
}

export default function ClientPortalLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
      </div>
    }>
      <ClientPortalLoginForm />
    </Suspense>
  )
}
