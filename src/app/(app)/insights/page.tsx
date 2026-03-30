"use client"

import { useState } from "react"
import { Sparkles, ThumbsUp, ThumbsDown, Lightbulb, BarChart3, RefreshCw, Star } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Analysis {
  summary: string
  sentiment: { positive: number; neutral: number; negative: number }
  themes: { theme: string; count: number; sentiment: string; emoji: string }[]
  topCompliments: string[]
  topComplaints: string[]
  recommendations: string[]
}

export default function InsightsPage() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [reviewCount, setReviewCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  async function handleAnalyze() {
    if (loading || cooldown > 0) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/insights")
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de l'analyse")
      } else {
        setAnalysis(data.analysis)
        setReviewCount(data.reviewCount)
        // Cooldown 30s pour éviter le spam API Claude
        setCooldown(30)
        const interval = setInterval(() => {
          setCooldown(prev => {
            if (prev <= 1) { clearInterval(interval); return 0 }
            return prev - 1
          })
        }, 1000)
      }
    } catch {
      setError("Erreur réseau")
    }
    setLoading(false)
  }

  const total = analysis ? analysis.sentiment.positive + analysis.sentiment.neutral + analysis.sentiment.negative : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Insights IA</h1>
          <p className="text-slate-500 mt-1">Analyse sémantique de vos avis par Claude AI</p>
        </div>
        <Button onClick={handleAnalyze} disabled={loading || cooldown > 0} className="gap-2">
          {loading
            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Analyse en cours...</>
            : cooldown > 0
            ? <><RefreshCw className="w-4 h-4" /> Relancer ({cooldown}s)</>
            : <><Sparkles className="w-4 h-4" /> {analysis ? "Relancer l'analyse" : "Analyser mes avis"}</>
          }
        </Button>
      </div>

      {!analysis && !loading && (
        <Card className="border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-50">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Analyse sémantique de vos avis</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
              Claude AI analyse vos avis clients pour détecter les thèmes récurrents, les points forts, les axes d&apos;amélioration et vous propose des recommandations concrètes.
            </p>
            {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
            <Button onClick={handleAnalyze} disabled={loading || cooldown > 0} size="lg" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Lancer l&apos;analyse
            </Button>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-12 h-12 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Claude analyse vos avis...</p>
            <p className="text-sm text-slate-400 mt-1">Cela prend environ 5 secondes</p>
          </CardContent>
        </Card>
      )}

      {error && !loading && analysis === null && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-red-700">⚠️ {error}</p>
            {error.includes("Liez") || error.includes("avis") ? (
              <p className="text-xs text-red-500 mt-1">Liez d&apos;abord votre fiche Google dans la page <strong>Réputation</strong>.</p>
            ) : null}
          </CardContent>
        </Card>
      )}

      {analysis && !loading && (
        <>
          {/* Summary + badge */}
          <Card className="border-sky-200 bg-gradient-to-r from-sky-50 to-cyan-50">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-sky-900">Résumé IA</p>
                    <Badge variant="info" className="text-xs">{reviewCount} avis analysés</Badge>
                    {reviewCount <= 5 && (
                      <span className="text-xs text-slate-400">(limité à 5 sans connexion GBP)</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{analysis.summary}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sentiment bar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="w-4 h-4 text-sky-500" />
                Répartition des sentiments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex rounded-full overflow-hidden h-4">
                {analysis.sentiment.positive > 0 && (
                  <div
                    className="bg-emerald-500 transition-all"
                    style={{ width: `${(analysis.sentiment.positive / total) * 100}%` }}
                  />
                )}
                {analysis.sentiment.neutral > 0 && (
                  <div
                    className="bg-slate-300 transition-all"
                    style={{ width: `${(analysis.sentiment.neutral / total) * 100}%` }}
                  />
                )}
                {analysis.sentiment.negative > 0 && (
                  <div
                    className="bg-red-400 transition-all"
                    style={{ width: `${(analysis.sentiment.negative / total) * 100}%` }}
                  />
                )}
              </div>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-slate-700">{analysis.sentiment.positive} positifs</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-slate-300" />
                  <span className="text-slate-700">{analysis.sentiment.neutral} neutres</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <span className="text-slate-700">{analysis.sentiment.negative} négatifs</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Themes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Star className="w-4 h-4 text-sky-500" />
                Thèmes les plus mentionnés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {analysis.themes.map((t) => (
                  <div
                    key={t.theme}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium ${
                      t.sentiment === "positive"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : t.sentiment === "negative"
                        ? "bg-red-50 border-red-200 text-red-800"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    <span>{t.emoji}</span>
                    <span>{t.theme}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                      t.sentiment === "positive" ? "bg-emerald-100 text-emerald-700"
                      : t.sentiment === "negative" ? "bg-red-100 text-red-700"
                      : "bg-slate-100 text-slate-600"
                    }`}>{t.count}x</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Compliments & Complaints */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ThumbsUp className="w-4 h-4 text-emerald-500" />
                  Ce que vos clients adorent
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {analysis.topCompliments.length === 0 ? (
                  <p className="text-sm text-slate-400">Aucun compliment détecté</p>
                ) : analysis.topCompliments.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 bg-emerald-50 rounded-xl">
                    <span className="text-emerald-500 font-bold text-sm flex-shrink-0">✓</span>
                    <p className="text-sm text-emerald-800">{c}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ThumbsDown className="w-4 h-4 text-red-500" />
                  Points à améliorer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {analysis.topComplaints.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">Aucun point négatif récurrent 🎉</p>
                ) : analysis.topComplaints.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 bg-red-50 rounded-xl">
                    <span className="text-red-400 font-bold text-sm flex-shrink-0">!</span>
                    <p className="text-sm text-red-800">{c}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                Recommandations prioritaires
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis.recommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="w-6 h-6 rounded-full bg-amber-200 text-amber-800 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </div>
                  <p className="text-sm text-amber-900">{r}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
