"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { MessageSquare, Star, Filter, ChevronLeft, ChevronRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDate, getStatusLabel, getRatingColor } from "@/lib/utils"

interface Review {
  id: string
  reviewerName: string
  rating: number
  comment: string | null
  reviewPublishedAt: string
  status: string
  isNegative: boolean
}

export default function ReviewsPage() {
  const searchParams = useSearchParams()
  const bizId = searchParams.get("biz")

  const [reviews, setReviews] = useState<Review[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [ratingFilter, setRatingFilter] = useState("ALL")
  const [loading, setLoading] = useState(true)

  async function fetchReviews() {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: "20" })
    if (bizId) params.set("biz", bizId)
    if (statusFilter !== "ALL") params.set("status", statusFilter)
    if (ratingFilter !== "ALL") params.set("rating", ratingFilter)

    const res = await fetch(`/api/reviews?${params}`)
    const data = await res.json()
    setReviews(data.reviews ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }

  useEffect(() => { fetchReviews() }, [page, statusFilter, ratingFilter, bizId]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Avis</h1>
          <p className="text-slate-500 text-sm mt-0.5">{total} avis au total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-slate-400" />
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
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-200 animate-pulse" />)}
        </div>
      ) : reviews.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-600">Aucun avis pour le moment</p>
          <p className="text-sm text-slate-400 mt-1">Synchronisez depuis le dashboard pour charger vos avis.</p>
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
                  <Star className="w-4 h-4 text-slate-300 flex-shrink-0" />
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
