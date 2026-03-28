"use client"

import { use, useEffect, useState } from "react"
import { ExternalLink, Star } from "lucide-react"

function StarRow({ rating, size = 20 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} width={size} height={size} viewBox="0 0 24 24" fill={s <= Math.round(rating) ? "#f59e0b" : "#e2e8f0"}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days < 7) return `il y a ${days} jour${days > 1 ? "s" : ""}`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `il y a ${weeks} semaine${weeks > 1 ? "s" : ""}`
  const months = Math.floor(days / 30)
  if (months < 12) return `il y a ${months} mois`
  return `il y a ${Math.floor(months / 12)} an${Math.floor(months / 12) > 1 ? "s" : ""}`
}

const SOCIAL_ICONS: Record<string, { label: string; color: string; icon: string }> = {
  google:      { label: "Google",      color: "#4285F4", icon: "G" },
  facebook:    { label: "Facebook",    color: "#1877F2", icon: "f" },
  instagram:   { label: "Instagram",   color: "#E1306C", icon: "📷" },
  tripadvisor: { label: "TripAdvisor", color: "#00AA6C", icon: "🦉" },
  website:     { label: "Site web",    color: "#0ea5e9", icon: "🌐" },
}

export default function ReputationPage({
  params,
}: {
  params: Promise<{ businessId: string }>
}) {
  const { businessId } = use(params)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch(`/api/r/${businessId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setData(d)
        setLoading(false)
      })
      .catch(() => { setError("Page introuvable"); setLoading(false) })
  }, [businessId])

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
      <p className="text-slate-400">{error}</p>
    </div>
  )

  const reviewUrl = data.placeId
    ? `https://search.google.com/local/writereview?placeid=${data.placeId}`
    : null
  const mapsUrl = data.placeId
    ? `https://www.google.com/maps/place/?q=place_id:${data.placeId}`
    : null

  const socialLinks: Record<string, string> = data.socialLinks ?? {}
  const hasSocials = Object.keys(socialLinks).some((k) => socialLinks[k])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-start py-10 px-4">
      {/* Card */}
      <div className="w-full max-w-md">

        {/* Hero */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-8 text-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4 text-2xl font-black text-white shadow-lg">
            {data.businessName.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">{data.businessName}</h1>

          {data.rating > 0 && (
            <div className="flex flex-col items-center gap-2 mt-3">
              <StarRow rating={data.rating} size={28} />
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-amber-400">{data.rating.toFixed(1)}</span>
                <span className="text-slate-400 text-sm">/ 5</span>
              </div>
              {data.reviewCount > 0 && (
                <p className="text-slate-400 text-sm">{data.reviewCount} avis Google</p>
              )}
            </div>
          )}
        </div>

        {/* Primary CTA */}
        {reviewUrl && (
          <a
            href={reviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-white text-lg shadow-2xl mb-4 active:scale-95 transition-transform"
            style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}
          >
            <Star className="w-5 h-5 fill-white" />
            Laisser un avis Google
            <ExternalLink className="w-4 h-4" />
          </a>
        )}

        {/* Recent reviews */}
        {data.reviews?.length > 0 && (
          <div className="space-y-3 mb-4">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider px-1">Avis récents</p>
            {data.reviews.map((review: any, i: number) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-sky-500 flex items-center justify-center text-white text-xs font-bold">
                      {review.reviewerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{review.reviewerName}</p>
                      <p className="text-slate-500 text-xs">{timeAgo(review.reviewPublishedAt)}</p>
                    </div>
                  </div>
                  <StarRow rating={review.rating} size={13} />
                </div>
                {review.comment && (
                  <p className="text-slate-300 text-sm leading-relaxed line-clamp-3">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Social / other platforms */}
        {(hasSocials || mapsUrl) && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">Retrouvez-nous</p>
            <div className="flex flex-wrap gap-2">
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-80"
                  style={{ background: "#4285F4" }}
                >
                  <span className="text-base font-black">G</span>
                  Google Maps
                </a>
              )}
              {Object.entries(socialLinks).map(([key, url]) => {
                if (!url) return null
                const meta = SOCIAL_ICONS[key]
                if (!meta) return null
                return (
                  <a
                    key={key}
                    href={url.startsWith("http") ? url : `https://${url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-80"
                    style={{ background: meta.color }}
                  >
                    <span className="text-base">{meta.icon}</span>
                    {meta.label}
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs">
          Propulsé par{" "}
          <span className="text-slate-500 font-semibold">Reputix</span>
        </p>
      </div>
    </div>
  )
}
