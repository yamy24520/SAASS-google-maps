"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Zap, AlertTriangle, ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const impactColors = {
  high: "text-red-600 bg-red-50 border-red-100",
  medium: "text-amber-600 bg-amber-50 border-amber-100",
  low: "text-slate-500 bg-slate-50 border-slate-100",
}

const impactLabels = {
  high: "Impact élevé",
  medium: "Impact moyen",
  low: "Impact faible",
}

export default function SeoLocalPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/seo-local")
      if (!res.ok) throw new Error(`Erreur ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-slate-200 rounded-xl" />
      <div className="h-40 bg-slate-200 rounded-2xl" />
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-slate-200 rounded-2xl" />)}
      </div>
    </div>
  )

  if (error) return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">SEO Local</h1>
        <p className="text-slate-500 mt-1">Optimisez votre visibilité sur Google Maps</p>
      </div>
      <Card className="border-red-100">
        <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4 text-center">
          <AlertTriangle className="w-10 h-10 text-red-400" />
          <div>
            <p className="font-semibold text-slate-800">Impossible de charger l&apos;analyse</p>
            <p className="text-sm text-slate-500 mt-1">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Réessayer
          </Button>
        </CardContent>
      </Card>
    </div>
  )

  const score = data?.score ?? 0
  const checklist = data?.checklist ?? []
  const done = checklist.filter((c: any) => c.done).length
  const total = checklist.length

  const scoreBg = score >= 80 ? "from-emerald-500 to-teal-500" : score >= 50 ? "from-amber-500 to-orange-500" : "from-red-500 to-rose-500"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">SEO Local</h1>
          <p className="text-slate-500 mt-1">Optimisez votre visibilité sur Google Maps</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </Button>
      </div>

      {/* Score */}
      <Card className="overflow-hidden">
        <div className={`bg-gradient-to-r ${scoreBg} p-6`}>
          <div className="flex items-center justify-between text-white">
            <div>
              <p className="text-white/80 text-sm font-medium mb-1">Score SEO Local</p>
              <div className="flex items-end gap-2">
                <span className="text-6xl font-bold">{score}</span>
                <span className="text-2xl text-white/70 mb-2">/100</span>
              </div>
              <p className="text-white/80 text-sm mt-1">
                {done}/{total} critères validés
              </p>
            </div>
            <div className="w-24 h-24 rounded-full border-4 border-white/30 flex items-center justify-center">
              <Zap className="w-10 h-10 text-white" />
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-4 bg-white/20 rounded-full h-2">
            <div
              className="bg-white rounded-full h-2 transition-all duration-700"
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Checklist by impact */}
      {(["high", "medium", "low"] as const).map((impact) => {
        const items = checklist.filter((c: any) => c.impact === impact)
        if (items.length === 0) return null
        return (
          <Card key={impact}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${impactColors[impact]}`}>
                  {impactLabels[impact]}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((item: any) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 p-4 rounded-2xl border transition-all ${
                    item.done
                      ? "bg-emerald-50 border-emerald-100"
                      : "bg-white border-slate-100 hover:border-sky-200"
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {item.done ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : impact === "high" ? (
                      <XCircle className="w-5 h-5 text-red-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${item.done ? "text-emerald-800 line-through opacity-60" : "text-slate-900"}`}>
                      {item.label}
                    </p>
                    {!item.done && item.tip && (
                      <p className="text-xs text-slate-500 mt-1">{item.tip}</p>
                    )}
                  </div>
                  {!item.done && item.actionUrl && (
                    <a
                      href={item.actionUrl}
                      target={item.actionUrl.startsWith("http") ? "_blank" : undefined}
                      rel={item.actionUrl.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-500 text-white text-xs font-semibold hover:bg-sky-600 transition-colors"
                    >
                      {item.actionUrl.startsWith("http") && <ExternalLink className="w-3 h-3" />}
                      {item.actionLabel ?? "Corriger"}
                    </a>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
