"use client"

import { use, useEffect, useRef, useState } from "react"
import { ExternalLink, Gift, RotateCcw, Star } from "lucide-react"
import { Button } from "@/components/ui/button"

const SEGMENT_COLORS = [
  "#6366f1", "#0ea5e9", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6",
  "#f97316", "#84cc16",
]

const COUNTDOWN_SECONDS = 60

export default function ClaimPage({
  params,
}: {
  params: Promise<{ businessId: string; token: string }>
}) {
  const { businessId, token } = use(params)
  const [info, setInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [spinning, setSpinning] = useState(false)
  const [prize, setPrize] = useState<string | null>(null)
  const [spinAngle, setSpinAngle] = useState(0)
  const [error, setError] = useState("")

  // Anti-cheat
  const [reviewOpened, setReviewOpened] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [canClaim, setCanClaim] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch(`/api/collect/${businessId}/claim/${token}`)
      .then((r) => r.json())
      .then((d) => {
        setInfo(d)
        if (d.alreadyClaimed) setPrize(d.prizeWon)
        setLoading(false)
      })
      .catch(() => { setError("Lien invalide"); setLoading(false) })
  }, [businessId, token])

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  function handleOpenReview() {
    window.open(
      `https://search.google.com/local/writereview?placeid=${info?.placeId ?? ""}`,
      "_blank",
      "noopener,noreferrer"
    )
    if (!reviewOpened) {
      setReviewOpened(true)
      setCountdown(COUNTDOWN_SECONDS)
      intervalRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(intervalRef.current!)
            setCanClaim(true)
            return 0
          }
          return c - 1
        })
      }, 1000)
    }
  }

  async function handleClaim() {
    if (info?.offerType === "SPIN_WHEEL") {
      setSpinning(true)
      const rotations = 5 + Math.random() * 5
      setSpinAngle((prev) => prev + rotations * 360 + Math.random() * 360)
      await new Promise((r) => setTimeout(r, 4200))
    } else {
      setSpinning(true)
      await new Promise((r) => setTimeout(r, 800))
    }

    const res = await fetch(`/api/collect/${businessId}/claim/${token}`, { method: "POST" })
    const data = await res.json()
    setPrize(data.prizeWon)
    setSpinning(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-sky-50 to-cyan-100 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error || info?.error) return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-sky-50 to-cyan-100 flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-slate-500">{error || info?.error}</p>
      </div>
    </div>
  )

  const isSpinWheel = info?.offerType === "SPIN_WHEEL"
  const prizes: { label: string; emoji: string; probability: number }[] = info?.spinPrizes ?? []
  const n = prizes.length
  const segmentAngle = n > 0 ? 360 / n : 60

  // ── Prize reveal ─────────────────────────────────────────────────
  if (prize) return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-sky-50 to-cyan-100 flex items-center justify-center p-6 overflow-hidden">
      <style>{`
        @keyframes confetti {
          0%   { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        .cc { position: fixed; top: 0; animation: confetti linear forwards; }
      `}</style>
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={i}
          className="cc"
          style={{
            left: `${(i / 24) * 100 + (Math.random() * 4 - 2)}%`,
            width: `${7 + Math.floor(Math.random() * 8)}px`,
            height: `${7 + Math.floor(Math.random() * 8)}px`,
            background: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
            borderRadius: i % 3 === 0 ? "50%" : "2px",
            animationDuration: `${1.8 + (i % 5) * 0.4}s`,
            animationDelay: `${(i % 4) * 0.12}s`,
          }}
        />
      ))}
      <div className="max-w-sm w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div style={{ background: "linear-gradient(135deg, #6366f1, #0ea5e9)" }} className="p-8 text-center">
          <div className="text-6xl mb-3">🎉</div>
          <h1 className="text-xl font-bold text-white">{info?.businessName}</h1>
          <p className="text-indigo-200 text-sm mt-1">Merci pour votre avis !</p>
        </div>
        <div className="p-8 text-center">
          <p className="text-slate-500 mb-4">Félicitations ! Vous avez gagné :</p>
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-300 rounded-2xl p-6 mb-6">
            <div className="text-3xl mb-2">🎁</div>
            <p className="text-2xl font-bold text-emerald-900">{prize}</p>
          </div>
          <p className="text-xs text-slate-400">Présentez cet écran lors de votre prochaine visite.</p>
          {info?.alreadyClaimed && (
            <p className="text-xs text-amber-500 mt-2">Vous avez déjà réclamé cette récompense.</p>
          )}
        </div>
      </div>
    </div>
  )

  // ── Step 1 : leave a review first ────────────────────────────────
  if (!canClaim) return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-sky-50 to-cyan-100 flex items-center justify-center p-6">
      <div className="max-w-sm w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div style={{ background: "linear-gradient(135deg, #6366f1, #0ea5e9)" }} className="p-8 text-center">
          <h1 className="text-xl font-bold text-white mb-1">{info?.businessName}</h1>
          <p className="text-indigo-200 text-sm">Réclamez votre récompense</p>
        </div>
        <div className="p-8 text-center">
          {!reviewOpened ? (
            <>
              <div className="text-5xl mb-4">{isSpinWheel ? "🎰" : "🎁"}</div>
              <h2 className="text-lg font-semibold text-slate-800 mb-2">Une dernière étape !</h2>
              <p className="text-sm text-slate-500 mb-6">
                Laissez votre avis Google pour débloquer votre{" "}
                {isSpinWheel ? "tour de roulette" : "récompense"}.
              </p>
              <button
                onClick={handleOpenReview}
                className="w-full flex items-center justify-center gap-2 text-base font-semibold text-white py-3 px-5 rounded-xl mb-3"
                style={{ background: "linear-gradient(135deg, #6366f1, #0ea5e9)" }}
              >
                <Star className="w-5 h-5" />
                Laisser mon avis Google
                <ExternalLink className="w-4 h-4" />
              </button>
              <p className="text-xs text-slate-400">Votre avis nous aide beaucoup — merci !</p>
            </>
          ) : (
            <>
              <div className="text-5xl mb-4">⏳</div>
              <h2 className="text-lg font-semibold text-slate-800 mb-2">Prenez votre temps !</h2>
              <p className="text-sm text-slate-500 mb-5">
                Écrivez votre avis Google. Votre récompense se débloque dans :
              </p>
              {/* Countdown circle */}
              <div className="relative w-28 h-28 mx-auto mb-5">
                <svg width="112" height="112" viewBox="0 0 112 112" className="rotate-[-90deg]">
                  <circle cx="56" cy="56" r="48" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                  <circle
                    cx="56" cy="56" r="48"
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 48}`}
                    strokeDashoffset={`${2 * Math.PI * 48 * (countdown / COUNTDOWN_SECONDS)}`}
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-indigo-600">{countdown}</span>
                </div>
              </div>
              <button
                onClick={handleOpenReview}
                className="text-xs text-sky-500 hover:underline flex items-center gap-1 mx-auto"
              >
                <ExternalLink className="w-3 h-3" /> Rouvrir la page Google
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )

  // ── Step 2 : spin wheel or fixed offer ───────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-sky-50 to-cyan-100 flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div style={{ background: "linear-gradient(135deg, #6366f1, #0ea5e9)" }} className="p-6 text-center">
          <h1 className="text-xl font-bold text-white">{info?.businessName}</h1>
          <p className="text-indigo-200 text-sm mt-1">Merci pour votre avis ! 🌟</p>
        </div>

        <div className="p-6 text-center">
          {isSpinWheel && prizes.length > 0 ? (
            <>
              <p className="text-slate-700 font-semibold mb-4 text-lg">Tournez la roulette !</p>

              {/* Wheel with gradient border ring */}
              <div
                className="relative mx-auto mb-4"
                style={{
                  width: 304,
                  height: 304,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #6366f1, #0ea5e9, #10b981, #f59e0b, #ef4444, #8b5cf6)",
                  padding: "5px",
                }}
              >
                <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "white", position: "relative" }}>
                  {/* Pointer */}
                  <div
                    style={{
                      position: "absolute",
                      top: "-6px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      zIndex: 20,
                      width: 0, height: 0,
                      borderLeft: "13px solid transparent",
                      borderRight: "13px solid transparent",
                      borderBottom: "26px solid #1e293b",
                      filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.35))",
                    }}
                  />
                  {/* SVG wheel */}
                  <svg
                    width="294"
                    height="294"
                    viewBox="0 0 294 294"
                    style={{
                      display: "block",
                      transform: `rotate(${spinAngle}deg)`,
                      transition: spinning
                        ? "transform 4.2s cubic-bezier(0.17, 0.67, 0.08, 0.99)"
                        : "none",
                    }}
                  >
                    {prizes.map((p, i) => {
                      const R = 141, cx = 147, cy = 147
                      const start = (i * segmentAngle - 90) * (Math.PI / 180)
                      const end = ((i + 1) * segmentAngle - 90) * (Math.PI / 180)
                      const x1 = cx + R * Math.cos(start)
                      const y1 = cy + R * Math.sin(start)
                      const x2 = cx + R * Math.cos(end)
                      const y2 = cy + R * Math.sin(end)
                      const mid = ((i + 0.5) * segmentAngle - 90) * (Math.PI / 180)
                      const tx = cx + R * 0.63 * Math.cos(mid)
                      const ty = cy + R * 0.63 * Math.sin(mid)
                      const shortLabel = p.label.length > 9 ? p.label.slice(0, 8) + "…" : p.label
                      return (
                        <g key={i}>
                          <path
                            d={`M${cx},${cy} L${x1},${y1} A${R},${R} 0 0,1 ${x2},${y2} Z`}
                            fill={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
                            stroke="white"
                            strokeWidth="3"
                          />
                          <g transform={`rotate(${(i + 0.5) * segmentAngle}, ${tx}, ${ty})`}>
                            <text x={tx} y={ty - 8} textAnchor="middle" dominantBaseline="middle" fontSize="18" fill="white">
                              {p.emoji}
                            </text>
                            <text x={tx} y={ty + 10} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="bold" fill="white" style={{ opacity: 0.95 }}>
                              {shortLabel}
                            </text>
                          </g>
                        </g>
                      )
                    })}
                    <circle cx={147} cy={147} r="22" fill="white" stroke="#e2e8f0" strokeWidth="3" />
                    <text x={147} y={147} textAnchor="middle" dominantBaseline="middle" fontSize="20">🎰</text>
                  </svg>
                </div>
              </div>

              {/* Prize legend pills */}
              <div className="flex flex-wrap gap-1.5 justify-center mb-5">
                {prizes.map((p, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-full text-white font-medium"
                    style={{ background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}
                  >
                    {p.emoji} {p.label}
                  </span>
                ))}
              </div>

              <button
                onClick={handleClaim}
                disabled={spinning}
                className="w-full flex items-center justify-center gap-2 text-base font-semibold text-white py-3.5 px-5 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #6366f1, #0ea5e9)" }}
              >
                {spinning ? (
                  <><RotateCcw className="w-4 h-4 animate-spin" /> Ça tourne...</>
                ) : (
                  <><span className="text-lg">🎰</span> Tourner la roulette !</>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="text-5xl mb-4">🎁</div>
              <p className="text-slate-600 mb-3">Votre récompense :</p>
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-2xl p-5 mb-6">
                <p className="text-xl font-bold text-emerald-900">{info?.offerText}</p>
              </div>
              <button
                onClick={handleClaim}
                disabled={spinning}
                className="w-full flex items-center justify-center gap-2 text-base font-semibold text-white py-3.5 px-5 rounded-xl disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #6366f1, #0ea5e9)" }}
              >
                <Gift className="w-4 h-4" />
                {spinning ? "..." : "Révéler mon offre"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
