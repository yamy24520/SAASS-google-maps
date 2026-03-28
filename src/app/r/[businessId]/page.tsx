"use client"

import { use, useEffect, useState } from "react"
import { ExternalLink, Star } from "lucide-react"

// ── Themes ────────────────────────────────────────────────────────────────────

const THEMES: Record<string, {
  bg: string
  card: string
  border: string
  text: string
  sub: string
  cta: string
  accent: string
  starFull: string
  starEmpty: string
  pill: string
  pillText: string
}> = {
  dark: {
    bg:        "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
    card:      "rgba(255,255,255,0.06)",
    border:    "rgba(255,255,255,0.1)",
    text:      "#f1f5f9",
    sub:       "#94a3b8",
    cta:       "linear-gradient(135deg, #f59e0b, #ef4444)",
    accent:    "#f59e0b",
    starFull:  "#f59e0b",
    starEmpty: "#334155",
    pill:      "rgba(255,255,255,0.08)",
    pillText:  "#94a3b8",
  },
  light: {
    bg:        "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
    card:      "#ffffff",
    border:    "#e2e8f0",
    text:      "#0f172a",
    sub:       "#64748b",
    cta:       "linear-gradient(135deg, #6366f1, #0ea5e9)",
    accent:    "#6366f1",
    starFull:  "#f59e0b",
    starEmpty: "#e2e8f0",
    pill:      "#f1f5f9",
    pillText:  "#64748b",
  },
  warm: {
    bg:        "linear-gradient(135deg, #431407 0%, #7c2d12 50%, #431407 100%)",
    card:      "rgba(255,255,255,0.08)",
    border:    "rgba(255,200,100,0.2)",
    text:      "#fef3c7",
    sub:       "#fcd34d",
    cta:       "linear-gradient(135deg, #f59e0b, #d97706)",
    accent:    "#fbbf24",
    starFull:  "#fbbf24",
    starEmpty: "#92400e",
    pill:      "rgba(251,191,36,0.15)",
    pillText:  "#fcd34d",
  },
  ocean: {
    bg:        "linear-gradient(135deg, #0c4a6e 0%, #0e7490 50%, #0c4a6e 100%)",
    card:      "rgba(255,255,255,0.08)",
    border:    "rgba(125,211,252,0.2)",
    text:      "#e0f2fe",
    sub:       "#7dd3fc",
    cta:       "linear-gradient(135deg, #0ea5e9, #06b6d4)",
    accent:    "#38bdf8",
    starFull:  "#fbbf24",
    starEmpty: "#164e63",
    pill:      "rgba(56,189,248,0.15)",
    pillText:  "#7dd3fc",
  },
  forest: {
    bg:        "linear-gradient(135deg, #052e16 0%, #14532d 50%, #052e16 100%)",
    card:      "rgba(255,255,255,0.07)",
    border:    "rgba(134,239,172,0.2)",
    text:      "#dcfce7",
    sub:       "#86efac",
    cta:       "linear-gradient(135deg, #22c55e, #15803d)",
    accent:    "#4ade80",
    starFull:  "#fbbf24",
    starEmpty: "#14532d",
    pill:      "rgba(74,222,128,0.15)",
    pillText:  "#86efac",
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StarRow({ rating, full, empty, size = 20 }: { rating: number; full: string; empty: string; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} width={size} height={size} viewBox="0 0 24 24" fill={s <= Math.round(rating) ? full : empty}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

function timeAgo(dateStr: string) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (days < 1) return "aujourd'hui"
  if (days < 7) return `il y a ${days}j`
  if (days < 30) return `il y a ${Math.floor(days / 7)}sem`
  if (days < 365) return `il y a ${Math.floor(days / 30)}mois`
  return `il y a ${Math.floor(days / 365)}an`
}

const SOCIALS: Record<string, { label: string; bg: string; icon: string }> = {
  google:      { label: "Google Maps",  bg: "#4285F4", icon: "G" },
  facebook:    { label: "Facebook",     bg: "#1877F2", icon: "f" },
  instagram:   { label: "Instagram",    bg: "#E1306C", icon: "📷" },
  tripadvisor: { label: "TripAdvisor",  bg: "#00AA6C", icon: "🦉" },
  website:     { label: "Site web",     bg: "#475569", icon: "🌐" },
}

// ── Page ──────────────────────────────────────────────────────────────────────

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
      .then((d) => { if (d.error) setError(d.error); else setData(d); setLoading(false) })
      .catch(() => { setError("Page introuvable"); setLoading(false) })
  }, [businessId])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f172a" }}>
      <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f172a" }}>
      <p style={{ color: "#64748b" }}>{error}</p>
    </div>
  )

  const theme = THEMES[data.pageTheme ?? "dark"] ?? THEMES.dark
  const reviewUrl = data.placeId ? `https://search.google.com/local/writereview?placeid=${data.placeId}` : null
  const mapsUrl   = data.placeId ? `https://www.google.com/maps/place/?q=place_id:${data.placeId}` : null
  const socialLinks: Record<string, string> = data.socialLinks ?? {}
  const hasSocials = mapsUrl || Object.values(socialLinks).some(Boolean)

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-10 px-4" style={{ background: theme.bg }}>
      <div className="w-full max-w-md space-y-4">

        {/* ── Hero card ── */}
        <div
          className="rounded-3xl p-8 text-center"
          style={{ background: theme.card, border: `1px solid ${theme.border}` }}
        >
          {/* Logo */}
          {data.logoDataUrl ? (
            <img
              src={data.logoDataUrl}
              alt={data.businessName}
              className="w-20 h-20 rounded-2xl object-cover mx-auto mb-4 shadow-lg"
            />
          ) : (
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl font-black text-white shadow-lg"
              style={{ background: theme.cta }}
            >
              {data.businessName.charAt(0).toUpperCase()}
            </div>
          )}

          <h1 className="text-2xl font-bold mb-1" style={{ color: theme.text }}>{data.businessName}</h1>

          {data.pageTagline && (
            <p className="text-sm mb-3" style={{ color: theme.sub }}>{data.pageTagline}</p>
          )}

          {data.rating > 0 && (
            <div className="flex flex-col items-center gap-2 mt-3">
              <StarRow rating={data.rating} full={theme.starFull} empty={theme.starEmpty} size={26} />
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black" style={{ color: theme.accent }}>{data.rating.toFixed(1)}</span>
                <span className="text-sm" style={{ color: theme.sub }}>/ 5</span>
              </div>
              {data.reviewCount > 0 && (
                <p className="text-sm" style={{ color: theme.sub }}>{data.reviewCount} avis Google</p>
              )}
            </div>
          )}
        </div>

        {/* ── CTA ── */}
        {reviewUrl && (
          <a
            href={reviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-white text-lg shadow-2xl active:scale-95 transition-transform"
            style={{ background: theme.cta }}
          >
            <Star className="w-5 h-5 fill-white" />
            Laisser un avis Google
            <ExternalLink className="w-4 h-4" />
          </a>
        )}

        {/* ── Recent reviews ── */}
        {data.reviews?.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider px-1" style={{ color: theme.sub }}>
              Avis récents
            </p>
            {data.reviews.map((r: any, i: number) => (
              <div
                key={i}
                className="rounded-2xl p-4"
                style={{ background: theme.card, border: `1px solid ${theme.border}` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #6366f1, #0ea5e9)" }}
                    >
                      {r.reviewerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: theme.text }}>{r.reviewerName}</p>
                      <p className="text-xs" style={{ color: theme.sub }}>{timeAgo(r.reviewPublishedAt)}</p>
                    </div>
                  </div>
                  <StarRow rating={r.rating} full={theme.starFull} empty={theme.starEmpty} size={12} />
                </div>
                {r.comment && (
                  <p className="text-sm leading-relaxed line-clamp-3" style={{ color: theme.sub }}>{r.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Social / platforms ── */}
        {hasSocials && (
          <div
            className="rounded-2xl p-4"
            style={{ background: theme.card, border: `1px solid ${theme.border}` }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: theme.sub }}>
              Retrouvez-nous
            </p>
            <div className="flex flex-wrap gap-2">
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-80 transition-opacity"
                  style={{ background: SOCIALS.google.bg }}
                >
                  <span className="font-black">{SOCIALS.google.icon}</span>
                  {SOCIALS.google.label}
                </a>
              )}
              {Object.entries(socialLinks).map(([key, url]) => {
                if (!url) return null
                const meta = SOCIALS[key]
                if (!meta) return null
                return (
                  <a
                    key={key}
                    href={url.startsWith("http") ? url : `https://${url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-80 transition-opacity"
                    style={{ background: meta.bg }}
                  >
                    <span>{meta.icon}</span>
                    {meta.label}
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <p className="text-center text-xs" style={{ color: theme.sub }}>
          Propulsé par <span className="font-semibold" style={{ color: theme.accent }}>Reputix</span>
        </p>
      </div>
    </div>
  )
}
