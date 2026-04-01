"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Star, MessageSquare, CheckCircle2, Clock, TrendingUp, Globe, ExternalLink, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { formatDate, getStatusLabel, getRatingColor } from "@/lib/utils"

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
  const [sourceBreakdown, setSourceBreakdown] = useState<{ source: string; count: number; avg: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [pageStats, setPageStats] = useState<{ viewsTotal: number; viewsWeek: number; clicks: { type: string; count: number }[]; viewsByDay: { day: string; views: number }[] } | null>(null)
  const [pageSlug, setPageSlug] = useState<string | null>(null)
  const [reputationPageEnabled, setReputationPageEnabled] = useState(false)
  const [syncing, setSyncing] = useState(false)

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
    if (data.sourceBreakdown) setSourceBreakdown(data.sourceBreakdown)
    if (data.pageStats) setPageStats(data.pageStats)
    if (data.pageSlug) setPageSlug(data.pageSlug)
    setReputationPageEnabled(!!data.reputationPageEnabled)
    setLoading(false)
  }

  async function handleSync() {
    setSyncing(true)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 28000)
    try {
      const res = await fetch(`/api/reviews/sync${bizParam}`, { method: "POST", signal: controller.signal })
      if (res.ok) await fetchData()
    } catch {
      // timeout or network error — still refresh data
      await fetchData()
    } finally {
      clearTimeout(timeout)
      setSyncing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [bizParam]) // eslint-disable-line react-hooks/exhaustive-deps

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
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Synchro..." : "Synchroniser"}
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
            href: `/reputation${bizParam}`,
          },
          {
            label: "Avis ce mois",
            value: stats?.reviewsThisMonth ?? "–",
            delta: stats ? (stats.reviewsLastMonthDelta >= 0 ? `+${stats.reviewsLastMonthDelta}` : `${stats.reviewsLastMonthDelta}`) : null,
            icon: <MessageSquare className="w-5 h-5 text-sky-500" />,
            href: `/reviews${bizParam}`,
          },
          {
            label: "Taux de réponse",
            value: stats ? `${Math.round(stats.responseRate)}%` : "–",
            delta: null,
            icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
            href: `/reviews${bizParam}`,
          },
          {
            label: "En attente",
            value: stats?.pendingCount ?? "–",
            delta: null,
            icon: <Clock className="w-5 h-5 text-orange-400" />,
            href: `/reviews${bizParam ? bizParam + "&status=PENDING" : "?status=PENDING"}`,
          },
        ].map((card) => (
          <Link key={card.label} href={card.href}>
            <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
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
          </Link>
        ))}
      </div>

      {/* Source breakdown */}
      {sourceBreakdown.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Avis par plateforme</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {sourceBreakdown.map(s => {
                const meta: Record<string, { emoji: string; label: string; color: string }> = {
                  GOOGLE:      { emoji: "🔵", label: "Google",      color: "bg-blue-50 border-blue-100" },
                  TRIPADVISOR: { emoji: "🦉", label: "TripAdvisor", color: "bg-green-50 border-green-100" },
                  BOOKING:     { emoji: "🏨", label: "Booking",     color: "bg-indigo-50 border-indigo-100" },
                  TRUSTPILOT:  { emoji: "⭐", label: "Trustpilot",  color: "bg-emerald-50 border-emerald-100" },
                }
                const m = meta[s.source] ?? { emoji: "🌐", label: s.source, color: "bg-slate-50 border-slate-100" }
                return (
                  <Link key={s.source} href={`/reviews${bizParam ? bizParam + "&source=" + s.source : "?source=" + s.source}`}>
                    <div className={`p-3 rounded-xl border ${m.color} hover:shadow-sm transition-all cursor-pointer`}>
                      <div className="text-xl mb-1">{m.emoji}</div>
                      <p className="text-xs text-slate-500 font-medium">{m.label}</p>
                      <p className="text-xl font-bold text-slate-900">{s.count}</p>
                      <p className="text-xs text-amber-500 font-medium">★ {s.avg}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
                Pas assez de données pour afficher le graphique.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent reviews */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Avis récents</CardTitle>
              <Link href={`/reviews${bizParam}`} className="text-xs text-sky-500 hover:text-sky-700 font-medium">
                Voir tout →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentReviews.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">Aucun avis pour l&apos;instant</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentReviews.map((review) => (
                  <Link key={review.id} href={`/reviews/${review.id}${bizParam ? "?" + bizParam.slice(1) : ""}`} className="block p-4 hover:bg-slate-50 transition-colors">
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
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Page vitrine stats */}
      {reputationPageEnabled && pageStats && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="w-4 h-4 text-indigo-500" />
                Page vitrine
              </CardTitle>
              {pageSlug && (
                <Link href={`/r/${pageSlug}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7">
                    <ExternalLink className="w-3 h-3" />
                    Voir la page
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{pageStats.viewsTotal.toLocaleString("fr-FR")}</p>
                <p className="text-xs text-slate-500 mt-0.5">Vues totales</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{pageStats.viewsWeek}</p>
                <p className="text-xs text-slate-500 mt-0.5">Cette semaine</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{pageStats.clicks.reduce((s, c) => s + c.count, 0)}</p>
                <p className="text-xs text-slate-500 mt-0.5">Clics CTAs</p>
              </div>
            </div>

            {pageStats.viewsByDay.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-slate-400 mb-2 font-medium">Vues — 7 derniers jours</p>
                <ResponsiveContainer width="100%" height={80}>
                  <BarChart data={pageStats.viewsByDay} barSize={20}>
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 11 }} formatter={(v) => [v, "vues"]} />
                    <Bar dataKey="views" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {pageStats.clicks.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 mb-2 font-medium">Top actions</p>
                <div className="space-y-1.5">
                  {pageStats.clicks.map((c) => {
                    const label = c.type === "cta_review" ? "Laisser un avis" : c.type === "cta_maps" ? "Google Maps" : c.type.replace("cta_social_", "")
                    const max = pageStats.clicks[0]?.count ?? 1
                    return (
                      <div key={c.type} className="flex items-center gap-3">
                        <span className="text-xs text-slate-600 w-32 truncate capitalize">{label}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                          <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${(c.count / max) * 100}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 w-6 text-right">{c.count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {pageStats.viewsTotal === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Aucune visite encore. Partagez votre page !</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
