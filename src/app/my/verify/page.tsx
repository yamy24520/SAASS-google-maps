"use client"

import { useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { KeyRound, ArrowLeft, Loader2, RefreshCw } from "lucide-react"

export default function ClientPortalVerifyPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const businessId = searchParams.get("biz") ?? ""
  const email = searchParams.get("email") ?? ""
  const businessName = searchParams.get("name") ?? "l'établissement"

  const [digits, setDigits] = useState(["", "", "", "", "", ""])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState("")
  const [resent, setResent] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const code = digits.join("")

  function handleDigit(i: number, val: string) {
    const d = val.replace(/\D/g, "").slice(-1)
    const next = [...digits]
    next[i] = d
    setDigits(next)
    if (d && i < 5) inputRefs.current[i + 1]?.focus()
    // Auto-submit when complete
    if (next.every(x => x) && next.join("").length === 6) {
      verify(next.join(""))
    }
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (pasted.length === 6) {
      setDigits(pasted.split(""))
      verify(pasted)
    }
  }

  async function verify(c: string) {
    if (loading) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/client-portal/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, businessId, code: c }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? "Code invalide"); setDigits(["", "", "", "", "", ""]); inputRefs.current[0]?.focus(); return }
      router.replace(`/my/${json.token}`)
    } catch {
      setError("Erreur de connexion")
    } finally {
      setLoading(false)
    }
  }

  async function resend() {
    setResending(true)
    setResent(false)
    setError("")
    try {
      await fetch("/api/client-portal/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, businessId }),
      })
      setResent(true)
      setDigits(["", "", "", "", "", ""])
      inputRefs.current[0]?.focus()
    } catch { /* ignore */ } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-br from-sky-400 to-cyan-500 px-6 py-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-white font-bold text-xl">Code de vérification</h1>
            <p className="text-white/80 text-sm mt-1">{businessName}</p>
          </div>

          <div className="p-6 space-y-5">
            <p className="text-slate-500 text-sm text-center">
              Code envoyé à <strong className="text-slate-700">{email}</strong>
            </p>

            {/* 6-digit input */}
            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleDigit(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className={`w-11 h-14 text-center text-2xl font-bold rounded-xl border-2 focus:outline-none transition-colors ${
                    d
                      ? "border-sky-400 bg-sky-50 text-sky-700"
                      : "border-slate-200 text-slate-800 focus:border-sky-400"
                  }`}
                />
              ))}
            </div>

            {loading && (
              <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Vérification…
              </div>
            )}

            {error && (
              <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg text-center">{error}</p>
            )}

            {resent && (
              <p className="text-emerald-600 text-sm bg-emerald-50 px-3 py-2 rounded-lg text-center">Nouveau code envoyé !</p>
            )}

            <button
              onClick={resend}
              disabled={resending}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-40"
            >
              {resending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Renvoyer le code
            </button>

            <button
              onClick={() => router.back()}
              className="w-full flex items-center justify-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Changer d&apos;email
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Le code expire dans 10 minutes.
        </p>
      </div>
    </div>
  )
}
