"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Star, MessageSquare, CheckCircle2, Clock, TrendingUp, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { formatDate, getStatusLabel, getRatingColor } from "@/lib/utils"
import { toast } from "@/components/ui/toaster"

interface Stats {
  totalReviews: number
  reviewsThisMonth: number
  reviewsLastMonthDelta: number
  averageRating: number
  avgRatingDelta: number
  responseRate: number
  pendingCount: number
}

interface Review {
  id: string
  reviewerName: string
  rating: number
  comment: string | null
  reviewPublishedAt: string
  status: string
}

interface ChartPoint { week: string; avg: number; count: number }

export function DashboardClient() {
  const searchParams = useSearchParams()
  const bizId = searchParams.get("biz")
  const bizParam = bizId ? `?biz=${bizId}` : ""

  const [stats, setStats] = useState<Stats | null>(null)
  const [recentReviews, setRecentReviews] = useState<Review[]>([])
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)

  async function fetchData() {
    const res = await fetch(`/api/dashboard${bizParam}`)
    const data = await res.json()
    setStats(data.stats)
    setRecentReviews(data.recentReviews ?? [])
    setChartData(
      (data.ratingByWeek ?? []).map((r: { week: string; avg: number; count: number }) => ({
        week: new Date(r.week).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
        avg: r.avg,
        count: r.count,
      }))
    )
    setLoading(false)
  }

  async function handleSync() {
    setSyncing(true)
    const res = await fetch(`/api/reviews/sync${bizParam}`, { method: "POST" })
    const data = await res.json()
    if (res.ok) {
      toast({ title: "Synchronisé", description: `${data.synced} avis récupérés.`, variant: "success" })
      await fetchData()
    } else {
      toast({ title: "Erreur", description: data.error, variant: "destructive" })
    }
    setSyncing(false)
  }

  useEffect(() => { fetchData() }, [bizParam]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-slate-200" />)}
        </div>
        <div className="h-64 rounded-2xl bg-slate-200" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Vue d&apos;ensemble de votre réputation</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Synchronisation..." : "Synchroniser"}
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Note moyenne",
            value: stats ? stats.averageRating.toFixed(1) : "–",
            delta: stats ? (stats.avgRatingDelta > 0 ? `+${stats.avgRatingDelta.toFixed(1)}` : stats.avgRatingDelta.toFixed(1)) : null,
            icon: <Star className="w-5 h-5 text-amber-400 fill-amber-400" />,
            color: "amber",
          },
          {
            label: "Avis ce mois",
            value: stats?.reviewsThisMonth ?? "–",
            delta: stats ? (stats.reviewsLastMonthDelta >= 0 ? `+${stats.reviewsLastMonthDelta}` : `${stats.reviewsLastMonthDelta}`) : null,
            icon: <MessageSquare className="w-5 h-5 text-sky-500" />,
            color: "sky",
          },
          {
            label: "Taux de réponse",
            value: stats ? `${Math.round(stats.responseRate)}%` : "–",
            delta: null,
            icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
            color: "emerald",
          },
          {
            label: "En attente",
            value: stats?.pendingCount ?? "–",
            delta: null,
            icon: <Clock className="w-5 h-5 text-orange-400" />,
            color: "orange",
          },
        ].map((card) => (
          <Card key={card.label} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">{card.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{card.value}</p>
                  {card.delta && (
                    <p className={`text-xs mt-1 font-medium ${card.delta.startsWith("+") ? "text-emerald-600" : "text-red-500"}`}>
                      {card.delta} vs mois dernier
                    </p>
                  )}
                </div>
                <div className="p-2 rounded-xl bg-slate-50">{card.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart + Recent reviews */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Rating evolution */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-sky-500" />
              Évolution de la note (8 semaines)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis domain={[1, 5]} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 12 }}
                    formatter={(v) => [Number(v).toFixed(1), "Note moyenne"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="avg"
                    stroke="#0ea5e9"
                    strokeWidth={2.5}
                    dot={{ fill: "#0ea5e9", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">
                Pas assez de données. Synchronisez vos avis d&apos;abord.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent reviews */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Avis récents</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentReviews.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">Aucun avis pour l&apos;instant</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentReviews.map((review) => (
                  <div key={review.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {review.reviewerName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-slate-900 truncate">{review.reviewerName}</span>
                          <span className={`text-xs font-bold ${getRatingColor(review.rating)}`}>{"★".repeat(review.rating)}</span>
                        </div>
                        {review.comment && (
                          <p className="text-xs text-slate-500 truncate">{review.comment}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-400">{formatDate(review.reviewPublishedAt)}</span>
                          <Badge
                            variant={review.status === "PUBLISHED" ? "success" : review.status === "PENDING" ? "warning" : "secondary"}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {getStatusLabel(review.status)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
