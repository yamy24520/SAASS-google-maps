"use client"

import { useEffect, useState } from "react"
import { TrendingUp, Star, MessageSquare, BarChart2, Search, RefreshCw } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function ReputationPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [linking, setLinking] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch("/api/reputation")
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    const res = await fetch(`/api/places/search?q=${encodeURIComponent(searchQuery)}`)
    const json = await res.json()
    setSearchResults(json.results ?? [])
    setSearching(false)
  }

  async function handleRefresh() {
    if (!data?.business?.placeId) {
      await load()
      return
    }
    setLinking(true)
    await fetch("/api/reputation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId: data.business.placeId }),
    })
    await load()
    setLinking(false)
  }

  async function handleLink(placeId: string) {
    setLinking(true)
    await fetch("/api/reputation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId }),
    })
    setSearchResults([])
    setSearchQuery("")
    await load()
    setLinking(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const snapshots = data?.snapshots ?? []
  const business = data?.business

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analyse de réputation</h1>
          <p className="text-slate-500 mt-1">Suivez l&apos;évolution de votre note dans le temps</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${linking ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* Link Google Maps if not done */}
      {!business?.placeId && (
        <Card className="border-sky-200 bg-sky-50">
          <CardContent className="pt-6">
            <p className="font-semibold text-sky-900 mb-1">Liez votre fiche Google Maps</p>
            <p className="text-sm text-sky-700 mb-4">Recherchez votre établissement pour activer le suivi de réputation en temps réel.</p>
            <div className="flex gap-2">
              <Input
                placeholder="Ex: Restaurant Le Jardin Paris"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="bg-white"
              />
              <Button onClick={handleSearch} disabled={searching} className="gap-2">
                <Search className="w-4 h-4" />
                {searching ? "Recherche..." : "Rechercher"}
              </Button>
            </div>
            {searchResults.length > 0 && (
              <div className="mt-3 space-y-2">
                {searchResults.map((r) => (
                  <div key={r.placeId} className="flex items-center justify-between bg-white rounded-xl p-3 border border-sky-100">
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{r.name}</p>
                      <p className="text-xs text-slate-500">{r.address}</p>
                      <p className="text-xs text-sky-600 mt-0.5">⭐ {r.rating} · {r.reviewCount} avis</p>
                    </div>
                    <Button size="sm" onClick={() => handleLink(r.placeId)} disabled={linking}>
                      {linking ? "Liaison..." : "Lier"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Note moyenne", value: business?.rating?.toFixed(1) ?? "—", icon: Star, color: "text-yellow-500" },
          { label: "Total avis", value: business?.totalReviews ?? "—", icon: MessageSquare, color: "text-sky-500" },
          { label: "Taux de réponse", value: business?.responseRate ? `${Math.round(business.responseRate)}%` : "—", icon: BarChart2, color: "text-emerald-500" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4 text-sky-500" />
            Évolution de la note
          </CardTitle>
        </CardHeader>
        <CardContent>
          {snapshots.length < 2 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <BarChart2 className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Pas encore assez de données</p>
              <p className="text-xs mt-1">Le graphique apparaît après quelques jours de suivi</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={snapshots}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis domain={[1, 5]} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "13px" }}
                  formatter={(v: any) => [`${v} / 5`, "Note"]}
                />
                <Line type="monotone" dataKey="rating" stroke="#0ea5e9" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
