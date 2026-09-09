"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Sparkles, Send, X, Loader2, CheckCircle2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate, getStatusLabel, getRatingColor } from "@/lib/utils"
import { readReviewStream } from "@/lib/review-stream"
import { toast } from "@/components/ui/toaster"

interface Review {
  id: string
  reviewerName: string
  reviewerPhotoUrl: string | null
  rating: number
  comment: string | null
  reviewPublishedAt: string
  status: string
  source: string
  aiDraftResponse: string | null
  publishedResponse: string | null
  reviewUrl?: string | null
  sourceDateLabel?: string | null
}

const SOURCE_META: Record<string, { label: string; emoji: string; color: string; publishUrl: (placeId: string | null, url: string | null) => string; publishLabel: string }> = {
  GOOGLE: {
    label: "Google",
    emoji: "🔵",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    publishUrl: (placeId) => placeId
      ? `https://search.google.com/local/reviews?placeid=${placeId}`
      : "https://business.google.com/reviews",
    publishLabel: "Copier & ouvrir Google",
  },
  TRIPADVISOR: {
    label: "TripAdvisor",
    emoji: "🦉",
    color: "bg-green-50 text-green-700 border-green-200",
    publishUrl: (_, url) => url ?? "https://www.tripadvisor.fr",
    publishLabel: "Copier & ouvrir TripAdvisor",
  },
  BOOKING: {
    label: "Booking.com",
    emoji: "🏨",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
    publishUrl: (_, url) => url ?? "https://account.booking.com",
    publishLabel: "Copier & ouvrir Booking",
  },
  TRUSTPILOT: {
    label: "Trustpilot",
    emoji: "⭐",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    publishUrl: (_, url) => url ?? "https://businessapp.b2b.trustpilot.com",
    publishLabel: "Copier & ouvrir Trustpilot",
  },
  AIRBNB: {
    label: "Airbnb",
    emoji: "🏠",
    color: "bg-rose-50 text-rose-700 border-rose-200",
    publishUrl: (_, url) => url ?? "https://www.airbnb.fr/hosting",
    publishLabel: "Copier & ouvrir Airbnb",
  },
}

export default function ReviewDetailPage() {
  const { reviewId } = useParams<{ reviewId: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const bizId = searchParams.get("biz")
  const bizParam = bizId ? `?biz=${bizId}` : ""
  const [review, setReview] = useState<Review | null>(null)
  const [placeId, setPlaceId] = useState<string | null>(null)
  const [platformUrl, setPlatformUrl] = useState<string | null>(null)
  const [loadingReview, setLoadingReview] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [response, setResponse] = useState("")
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [ignoring, setIgnoring] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    fetch(`/api/reviews/${reviewId}${bizParam}`)
      .then(async (r) => {
        if (r.status === 404) { setNotFound(true); setLoadingReview(false); return }
        const data = await r.json()
        if (!data.review) { setNotFound(true); setLoadingReview(false); return }
        setReview(data.review)
        setPlaceId(data.placeId ?? null)
        setPlatformUrl(data.platformUrl ?? null)
        if (data.review?.aiDraftResponse) setResponse(data.review.aiDraftResponse)
        if (data.review?.publishedResponse) setResponse(data.review.publishedResponse)
        setLoadingReview(false)
      })
      .catch(() => { setNotFound(true); setLoadingReview(false) })
  }, [reviewId, bizParam])

  async function handleGenerate() {
    if (!review || generating) return
    setGenerating(true)
    abortRef.current = new AbortController()
    try {
      const res = await fetch(`/api/reviews/${reviewId}/generate${bizParam}`, { method: "POST", signal: abortRef.current.signal })
      if (!res.ok || !res.body) throw new Error("Impossible de générer la réponse.")
      setResponse("")
      await readReviewStream(res.body, setResponse)
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) toast({ title: "Erreur", description: error instanceof Error ? error.message : "Génération interrompue.", variant: "destructive" })
    } finally { setGenerating(false) }
  }

  async function handlePublish() {
    if (!response.trim() || !review || publishing) return
    const opened = window.open("about:blank", "_blank")
    if (opened) opened.opener = null
    setPublishing(true)
    try {
      await navigator.clipboard.writeText(response)
      const res = await fetch(`/api/reviews/${reviewId}/publish${bizParam}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ response }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Impossible de sauvegarder la réponse.")
      const meta = SOURCE_META[review.source] ?? SOURCE_META.GOOGLE
      if (opened) opened.location.href = review.reviewUrl || meta.publishUrl(placeId, platformUrl)
      setReview({ ...review, status: "APPROVED", aiDraftResponse: response })
      toast({ title: "Réponse copiée et sauvegardée", description: `Collez-la sur ${meta.label} pour terminer la publication.`, variant: "success" })
    } catch (error) {
      opened?.close()
      toast({ title: "Action interrompue", description: error instanceof Error ? error.message : "Copiez votre texte manuellement et réessayez.", variant: "destructive" })
    } finally { setPublishing(false) }
  }

  async function handleGooglePublish() {
    if (!response.trim() || !review || publishing) return
    setPublishing(true)
    try {
      const res = await fetch(`/api/reviews/${reviewId}/publish${bizParam}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ response, publish: true }),
      })
      const data = await res.json()
      if (!res.ok || !data.published) throw new Error(data.error ?? "Publication indisponible pour cet avis.")
      setReview({ ...review, status: "PUBLISHED", publishedResponse: response })
      toast({ title: "Réponse publiée sur Google", variant: "success" })
    } catch (error) {
      toast({ title: "Publication impossible", description: error instanceof Error ? error.message : "Réessayez plus tard.", variant: "destructive" })
    } finally { setPublishing(false) }
  }

  async function handleIgnore() {
    if (!confirm("Ignorer cet avis ? Il sera masqué de votre liste.")) return
    setIgnoring(true)
    try {
      const res = await fetch(`/api/reviews/${reviewId}/ignore${bizParam}`, { method: "POST" })
      if (!res.ok) throw new Error("Impossible d’ignorer cet avis.")
      router.push(`/reviews${bizParam}`)
    } catch { toast({ title: "Erreur", description: "L’avis n’a pas été ignoré. Réessayez.", variant: "destructive" }) }
    finally { setIgnoring(false) }
  }

  if (loadingReview) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => router.push(`/reviews${bizParam}`)}>
          <ArrowLeft className="w-4 h-4" />
          Retour aux avis
        </Button>
        <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
          <p className="text-slate-500 font-medium">Avis introuvable</p>
          <p className="text-sm text-slate-400">Cet avis n&apos;existe pas ou a été supprimé.</p>
        </div>
      </div>
    )
  }

  const r = review as Review
  const isPublished = r.status === "PUBLISHED"
  const sourceMeta = SOURCE_META[r.source] ?? SOURCE_META.GOOGLE

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" className="gap-2" onClick={() => router.back()}>
        <ArrowLeft className="w-4 h-4" />
        Retour aux avis
      </Button>

      {/* Review card */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full gradient-bg flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
              {r.reviewerPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.reviewerPhotoUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                r.reviewerName[0]
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-900 text-lg">{r.reviewerName}</span>
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${sourceMeta.color}`}>
                  {sourceMeta.emoji} {sourceMeta.label}
                </span>
                <Badge
                  variant={r.status === "PUBLISHED" ? "success" : r.status === "PENDING" ? "warning" : "info"}
                >
                  {getStatusLabel(r.status)}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xl font-bold ${getRatingColor(r.rating)}`}>
                  {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                </span>
                <span className="text-sm text-slate-400">{r.sourceDateLabel || formatDate(r.reviewPublishedAt)}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {r.comment ? (
            <p className="text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4 italic">
              &ldquo;{r.comment}&rdquo;
            </p>
          ) : (
            <p className="text-slate-400 italic text-sm">Aucun commentaire écrit.</p>
          )}
        </CardContent>
      </Card>

      {/* Response editor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>{isPublished ? "Réponse publiée" : "Rédiger une réponse"}</span>
            {response && !isPublished && (
              <span className="text-xs text-slate-400 font-normal">{response.length} caractères</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Rédigez votre réponse ou cliquez sur 'Générer avec IA'..."
            className={`min-h-[160px] ${isPublished ? "bg-slate-50" : ""}`}
            readOnly={isPublished || generating}
          />

          {!isPublished && (
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleGenerate}
                disabled={generating || publishing}
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Génération...

                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-sky-500" />
                    {response ? "Régénérer" : "Générer avec IA"}
                    {response && <RotateCcw className="w-3 h-3 text-slate-400" />}
                  </>
                )}
              </Button>

              <Button
                className="gap-2 flex-1 sm:flex-none"
                onClick={handlePublish}
                disabled={!response.trim() || publishing || generating}
              >
                {publishing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Publication...</>
                ) : (
                  <><Send className="w-4 h-4" />{sourceMeta.publishLabel}</>
                )}
              </Button>

              {r.source === "GOOGLE" && <Button variant="outline" disabled={!response.trim() || publishing || generating} onClick={handleGooglePublish}>Publier via Google</Button>}
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-red-500"
                onClick={handleIgnore}
                disabled={ignoring}
              >
                <X className="w-4 h-4 mr-1" />
                Ignorer
              </Button>
            </div>
          )}

          {isPublished && (
            <div className="flex items-center gap-2 text-emerald-600 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Réponse publiée sur {sourceMeta.label}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
