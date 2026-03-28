"use client"

import { use, useEffect, useState } from "react"
import { CheckCircle2, Gift, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

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
  const [confirmed, setConfirmed] = useState(false)
  const [spinAngle, setSpinAngle] = useState(0)
  const [error, setError] = useState("")

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

  async function handleClaim() {
    if (info?.offerType === "SPIN_WHEEL") {
      setSpinning(true)
      const rotations = 5 + Math.random() * 5
      setSpinAngle(rotations * 360 + Math.random() * 360)
      await new Promise((r) => setTimeout(r, 3500))
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
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-cyan-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error || info?.error) return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-cyan-50 flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-slate-500">{error || info?.error}</p>
      </div>
    </div>
  )

  const isSpinWheel = info?.offerType === "SPIN_WHEEL"
  const prizes: { label: string; emoji: string; probability: number }[] = info?.spinPrizes ?? []
  const segmentAngle = prizes.length > 0 ? 360 / prizes.length : 60
  const colors = ["#0ea5e9", "#06b6d4", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#ec4899", "#14b8a6"]

  // Prize reveal screen
  if (prize) return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-cyan-50 flex items-center justify-center p-6">
      <div className="max-w-sm w-full bg-white rounded-3xl shadow-xl overflow-hidden">
        <div style={{ background: "linear-gradient(135deg, #0ea5e9, #06b6d4)" }} className="p-8 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h1 className="text-xl font-bold text-white">{info?.businessName}</h1>
        </div>
        <div className="p-8 text-center">
          <p className="text-slate-500 mb-3">Félicitations ! Vous avez gagné :</p>
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-300 rounded-2xl p-6 mb-6">
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

  // Confirmation step
  if (!confirmed) return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-cyan-50 flex items-center justify-center p-6">
      <div className="max-w-sm w-full bg-white rounded-3xl shadow-xl overflow-hidden">
        <div style={{ background: "linear-gradient(135deg, #0ea5e9, #06b6d4)" }} className="p-8 text-center">
          <h1 className="text-xl font-bold text-white mb-1">{info?.businessName}</h1>
          <p className="text-sky-100 text-sm">Réclamez votre récompense</p>
        </div>
        <div className="p-8 text-center">
          <div className="text-4xl mb-4">{isSpinWheel ? "🎰" : "🎁"}</div>
          <p className="text-slate-600 mb-2">Avez-vous bien laissé votre avis Google ?</p>
          <p className="text-xs text-slate-400 mb-6">Merci pour votre honnêteté — c&apos;est grâce à vous qu&apos;on s&apos;améliore !</p>
          <Button onClick={() => setConfirmed(true)} className="w-full gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4" />
            Oui, j&apos;ai laissé mon avis
          </Button>
          <a
            href={`https://search.google.com/local/writereview?placeid=${info?.placeId ?? ""}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs text-sky-500 hover:underline"
          >
            Pas encore ? Laisser mon avis d&apos;abord →
          </a>
        </div>
      </div>
    </div>
  )

  // Spin wheel or fixed offer claim
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-cyan-50 flex items-center justify-center p-6">
      <div className="max-w-sm w-full bg-white rounded-3xl shadow-xl overflow-hidden">
        <div style={{ background: "linear-gradient(135deg, #0ea5e9, #06b6d4)" }} className="p-6 text-center">
          <h1 className="text-xl font-bold text-white">{info?.businessName}</h1>
        </div>
        <div className="p-8 text-center">
          {isSpinWheel && prizes.length > 0 ? (
            <>
              <p className="text-slate-600 font-semibold mb-4">Tournez la roulette !</p>
              {/* Wheel */}
              <div className="relative mx-auto mb-6" style={{ width: 240, height: 240 }}>
                {/* Pointer */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10" style={{ width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderBottom: "20px solid #1e293b" }} />
                <svg
                  width="240"
                  height="240"
                  viewBox="0 0 240 240"
                  style={{
                    transform: `rotate(${spinAngle}deg)`,
                    transition: spinning ? "transform 3.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
                  }}
                >
                  {prizes.map((prize, i) => {
                    const startAngle = (i * segmentAngle - 90) * (Math.PI / 180)
                    const endAngle = ((i + 1) * segmentAngle - 90) * (Math.PI / 180)
                    const x1 = 120 + 110 * Math.cos(startAngle)
                    const y1 = 120 + 110 * Math.sin(startAngle)
                    const x2 = 120 + 110 * Math.cos(endAngle)
                    const y2 = 120 + 110 * Math.sin(endAngle)
                    const midAngle = ((i + 0.5) * segmentAngle - 90) * (Math.PI / 180)
                    const tx = 120 + 70 * Math.cos(midAngle)
                    const ty = 120 + 70 * Math.sin(midAngle)
                    return (
                      <g key={i}>
                        <path
                          d={`M120,120 L${x1},${y1} A110,110 0 0,1 ${x2},${y2} Z`}
                          fill={colors[i % colors.length]}
                          stroke="white"
                          strokeWidth="2"
                        />
                        <text
                          x={tx}
                          y={ty}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="11"
                          fontWeight="bold"
                          fill="white"
                          transform={`rotate(${(i + 0.5) * segmentAngle}, ${tx}, ${ty})`}
                        >
                          {prize.emoji}
                        </text>
                      </g>
                    )
                  })}
                  <circle cx="120" cy="120" r="15" fill="white" stroke="#e2e8f0" strokeWidth="2" />
                </svg>
              </div>
              {/* Prize list */}
              <div className="flex flex-wrap gap-1.5 justify-center mb-4">
                {prizes.map((p, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-full text-white font-medium" style={{ background: colors[i % colors.length] }}>
                    {p.emoji} {p.label}
                  </span>
                ))}
              </div>
              <Button onClick={handleClaim} disabled={spinning} size="lg" className="w-full gap-2">
                {spinning ? (
                  <><RotateCcw className="w-4 h-4 animate-spin" /> Ça tourne...</>
                ) : (
                  <><span className="text-lg">🎰</span> Tourner la roulette</>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="text-4xl mb-4">
                <Gift className="w-10 h-10 mx-auto text-sky-500" />
              </div>
              <p className="text-slate-600 mb-2">Votre récompense :</p>
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 mb-6">
                <p className="text-lg font-bold text-emerald-900">{info?.offerText}</p>
              </div>
              <Button onClick={handleClaim} disabled={spinning} size="lg" className="w-full">
                {spinning ? "..." : "Révéler mon offre →"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
