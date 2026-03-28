"use client"

import { useEffect, useState } from "react"
import { use } from "react"
import { CheckCircle2, Mail, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function CollectPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = use(params)
  const [business, setBusiness] = useState<{ businessName: string; offerText: string } | null>(null)
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/collect/${businessId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) setBusiness(d)
        else setNotFound(true)
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [businessId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes("@")) { setError("Adresse email invalide"); return }
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch(`/api/collect/${businessId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (res.ok) setDone(true)
      else setError("Une erreur est survenue, réessayez.")
    } catch {
      setError("Erreur réseau")
    }
    setSubmitting(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-cyan-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-cyan-50 flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-slate-500">Cette offre n&apos;est plus disponible.</p>
      </div>
    </div>
  )

  if (done) return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-cyan-50 flex items-center justify-center p-6">
      <div className="max-w-sm w-full bg-white rounded-3xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">C&apos;est envoyé !</h2>
        <p className="text-slate-500 text-sm">Vérifiez votre boîte mail, votre offre vous attend.</p>
        <div className="mt-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
          <p className="text-sm font-semibold text-emerald-800">🎁 {business?.offerText}</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-cyan-50 flex items-center justify-center p-6">
      <div className="max-w-sm w-full">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div style={{ background: "linear-gradient(135deg, #0ea5e9, #06b6d4)" }} className="p-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-1">{business?.businessName}</h1>
            <div className="flex justify-center gap-0.5 mt-2">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-yellow-300 fill-yellow-300" />)}
            </div>
          </div>
          <div className="p-8">
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-2xl p-5 text-center mb-6">
              <div className="text-3xl mb-2">🎁</div>
              <p className="text-sm text-emerald-700 font-medium mb-1">Offre exclusive</p>
              <p className="text-lg font-bold text-emerald-900">{business?.offerText}</p>
              <p className="text-xs text-emerald-600 mt-2">Recevez-la directement par email</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Envoi..." : "Recevoir mon offre →"}
              </Button>
            </form>
            <p className="text-xs text-slate-400 text-center mt-3">
              Votre email est utilisé uniquement pour vous envoyer cette offre.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
