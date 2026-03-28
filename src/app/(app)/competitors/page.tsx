"use client"

import { useEffect, useState } from "react"
import { Trophy, Star, MessageSquare, TrendingUp, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function CompetitorsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch("/api/competitors")
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  async function handleSync() {
    setSyncing(true)
    const repRes = await fetch("/api/reputation")
    const repData = await repRes.json()
    if (!repData.business?.placeId) {
      alert("Liez d'abord votre fiche Google Maps dans la page Réputation.")
      setSyncing(false)
      return
    }
    if (!repData.business?.lat || !repData.business?.lng) {
      alert("Coordonnées introuvables. Déliez et reliez votre fiche Google Maps dans la page Réputation.")
      setSyncing(false)
      return
    }
    await fetch("/api/competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: repData.business.lat, lng: repData.business.lng, placeType: repData.business.placeType }),
    })
    await load()
    setSyncing(false)
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const business = data?.business
  const competitors = data?.competitors ?? []

  const allPlayers = [
    { name: business?.name ?? "Vous", rating: business?.rating ?? 0, reviewCount: business?.reviewCount ?? 0, isYou: true },
    ...competitors.map((c: any) => ({ ...c, isYou: false })),
  ].sort((a, b) => b.rating - a.rating)

  const yourRank = allPlayers.findIndex((p) => p.isYou) + 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Benchmark concurrents</h1>
          <p className="text-slate-500 mt-1">Comparez-vous aux établissements similaires autour de vous</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Analyse..." : "Actualiser"}
        </Button>
      </div>

      {/* Your ranking */}
      {competitors.length > 0 && (
        <Card className="border-sky-200 bg-gradient-to-r from-sky-50 to-cyan-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold">
                #{yourRank}
              </div>
              <div>
                <p className="font-semibold text-slate-900">Votre classement</p>
                <p className="text-sm text-slate-500">
                  {yourRank === 1
                    ? "🏆 Vous êtes le meilleur de votre zone !"
                    : `${yourRank - 1} établissement${yourRank > 2 ? "s" : ""} devant vous`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="w-4 h-4 text-yellow-500" />
            Classement de la zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {allPlayers.length === 1 ? (
            <div className="text-center py-8 text-slate-400">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucun concurrent trouvé</p>
              <p className="text-xs mt-1">Liez votre fiche Google Maps puis actualisez</p>
            </div>
          ) : (
            allPlayers.map((player, idx) => (
              <div
                key={player.name}
                className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                  player.isYou
                    ? "bg-gradient-to-r from-sky-50 to-cyan-50 border border-sky-200"
                    : "bg-slate-50"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  idx === 0 ? "bg-yellow-100 text-yellow-700" :
                  idx === 1 ? "bg-slate-200 text-slate-600" :
                  idx === 2 ? "bg-orange-100 text-orange-700" :
                  "bg-slate-100 text-slate-500"
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900 truncate text-sm">{player.name}</p>
                    {player.isYou && <Badge className="text-xs bg-sky-100 text-sky-700 border-sky-200">Vous</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{(player as any).address ?? ""}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1 justify-end">
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    <span className="font-bold text-slate-900 text-sm">{player.rating?.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-1 justify-end mt-0.5">
                    <MessageSquare className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-500">{player.reviewCount} avis</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Insights */}
      {competitors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-sky-500" />
              Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(() => {
              const avgCompetitorRating = competitors.reduce((s: number, c: any) => s + c.rating, 0) / competitors.length
              const avgCompetitorReviews = Math.round(competitors.reduce((s: number, c: any) => s + c.reviewCount, 0) / competitors.length)
              const insights = []

              if ((business?.rating ?? 0) > avgCompetitorRating) {
                insights.push({ text: `Votre note (${business?.rating?.toFixed(1)}) est supérieure à la moyenne de vos concurrents (${avgCompetitorRating.toFixed(1)})`, positive: true })
              } else {
                insights.push({ text: `Votre note (${business?.rating?.toFixed(1)}) est inférieure à la moyenne (${avgCompetitorRating.toFixed(1)}). Répondez à plus d'avis !`, positive: false })
              }

              if ((business?.reviewCount ?? 0) > avgCompetitorReviews) {
                insights.push({ text: `Vous avez plus d'avis que la moyenne (${avgCompetitorReviews} avis chez vos concurrents)`, positive: true })
              } else {
                insights.push({ text: `Vos concurrents ont en moyenne ${avgCompetitorReviews} avis. Encouragez vos clients à laisser des avis !`, positive: false })
              }

              return insights.map((insight, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${insight.positive ? "bg-emerald-50" : "bg-amber-50"}`}>
                  <span className="text-lg">{insight.positive ? "✅" : "⚠️"}</span>
                  <p className={`text-sm ${insight.positive ? "text-emerald-800" : "text-amber-800"}`}>{insight.text}</p>
                </div>
              ))
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
