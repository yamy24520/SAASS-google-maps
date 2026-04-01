"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { MessageSquare, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDate, getStatusLabel, getRatingColor } from "@/lib/utils"

const LIMIT = 50

const SOURCE_TABS = [
  { value: "ALL", label: "Tous", emoji: "🌐" },
  { value: "GOOGLE", label: "Google", emoji: "🔵" },
  { value: "TRIPADVISOR", label: "TripAdvisor", emoji: "🦉" },
  { value: "BOOKING", label: "Booking", emoji: "🏨" },
  { value: "TRUSTPILOT", label: "Trustpilot", emoji: "⭐" },
  { value: "AIRBNB", label: "Airbnb", emoji: "🏠" },
]

interface Review {
  id: string
  reviewerName: string
  rating: number
  comment: string | null
  reviewPublishedAt: string
  status: string
  isNegative: boolean
  source: string
}

function SourceBadge({ source }: { source: string }) {
  const map: Record<string, { emoji: string; label: string; color: string }> = {
    GOOGLE:      { emoji: "🔵", label: "Google",      color: "bg-blue-50 text-blue-700 border-blue-200" },
    TRIPADVISOR: { emoji: "🦉", label: "TripAdvisor", color: "bg-green-50 text-green-700 border-green-200" },
    BOOKING:     { emoji: "🏨", label: "Booking",     color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    TRUSTPILOT:  { emoji: "⭐", label: "Trustpilot",  color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    AIRBNB:      { emoji: "🏠", label: "Airbnb",      color: "bg-rose-50 text-rose-700 border-rose-200" },
  }
  const s = map[source] ?? { emoji: "🌐", label: source, color: "bg-slate-50 text-slate-600 border-slate-200" }
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0 rounded-full border font-medium ${s.color}`}>
      {s.emoji} {s.label}
    </span>
  )
}

export default function ReviewsPage() {
  const searchParams = useSearchParams()
  const bizId = searchParams.get("biz")

  const [reviews, setReviews] = useState<Review[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [sourceFilter, setSourceFilter] = useState("ALL")
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "ALL")
  const [ratingFilter, setRatingFilter] = useState("ALL")
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [loading, setLoading] = useState(true)

  async function fetchReviews() {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
    if (bizId) params.set("biz", bizId)
    if (sourceFilter !== "ALL") params.set("source", sourceFilter)
    if (statusFilter !== "ALL") params.set("status", statusFilter)
    if (ratingFilter !== "ALL") params.set("rating", ratingFilter)
    if (search) params.set("q", search)

    const res = await fetch(`/api/reviews?${params}`)
    const data = await res.json()
    setReviews(data.reviews ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }

  useEffect(() => { fetchReviews() }, [page, sourceFilter, statusFilter, ratingFilter, search, bizId]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Avis</h1>
        <p className="text-slate-500 text-sm mt-0.5">{total} avis au total</p>
      </div>

      {/* Source tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {SOURCE_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => { setSourceFilter(tab.value); setPage(1) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border ${
              sourceFilter === tab.value
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            <span>{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { setSearch(searchInput); setPage(1) } }}
            onBlur={() => { setSearch(searchInput); setPage(1) }}
            placeholder="Rechercher dans les avis..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les statuts</SelectItem>
            <SelectItem value="PENDING">En attente</SelectItem>
            <SelectItem value="DRAFT">Brouillon</SelectItem>
            <SelectItem value="PUBLISHED">Publiés</SelectItem>
            <SelectItem value="IGNORED">Ignorés</SelectItem>
          </SelectContent>
        </Select>

        <Select value={ratingFilter} onValueChange={(v) => { setRatingFilter(v); setPage(1) }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Note" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Toutes les notes</SelectItem>
            <SelectItem value="1">1 étoile ★</SelectItem>
            <SelectItem value="2">2 étoiles ★★</SelectItem>
            <SelectItem value="3">3 étoiles ★★★</SelectItem>
            <SelectItem value="4">4 étoiles ★★★★</SelectItem>
            <SelectItem value="5">5 étoiles ★★★★★</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reviews list */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-4 rounded-2xl bg-white border border-slate-100 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <div className="h-4 w-28 bg-slate-200 rounded" />
                  <div className="h-4 w-16 bg-slate-200 rounded" />
                </div>
                <div className="h-3.5 w-full bg-slate-100 rounded" />
                <div className="h-3 w-20 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-600">Aucun avis trouvé</p>
          <p className="text-sm text-slate-400 mt-1">
            {search || sourceFilter !== "ALL" || statusFilter !== "ALL" || ratingFilter !== "ALL"
              ? "Essayez de modifier vos filtres."
              : "Les avis apparaîtront ici automatiquement."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Link key={review.id} href={`/reviews/${review.id}${bizId ? `?biz=${bizId}` : ""}`}>
              <Card className="p-4 hover:shadow-md hover:border-sky-200 transition-all cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-white font-bold flex-shrink-0">
                    {review.reviewerName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-slate-900">{review.reviewerName}</span>
                      <span className={`text-sm font-bold ${getRatingColor(review.rating)}`}>
                        {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                      </span>
                      <SourceBadge source={review.source} />
                      {review.isNegative && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Négatif</Badge>
                      )}
                      <Badge
                        variant={
                          review.status === "PUBLISHED" ? "success"
                          : review.status === "PENDING" ? "warning"
                          : review.status === "DRAFT" ? "info"
                          : "secondary"
                        }
                        className="text-[10px] px-1.5 py-0"
                      >
                        {getStatusLabel(review.status)}
                      </Badge>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-slate-600 line-clamp-2">{review.comment}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">{formatDate(review.reviewPublishedAt)}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-slate-600">Page {page} sur {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
