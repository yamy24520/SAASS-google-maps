"use client"

import { use, useEffect, useRef, useState } from "react"
import { ChevronRight, GripVertical, MapPin, Pencil, Plus, Save, Star, Trash2, X } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReviewData { reviewerName: string; rating: number; comment: string | null; reviewPublishedAt: string }
interface SocialLink  { platform: string; url: string; label: string }
interface HourEntry   { open: string; close: string; closed: boolean }
interface PhotoItem   { dataUrl: string; caption: string }

interface Section {
  id: string; type: string; enabled: boolean; order: number
  links?:    SocialLink[]
  schedule?: Record<string, HourEntry>
  address?:  string
  images?:   PhotoItem[]
}

interface PageData {
  businessId: string; businessName: string; rating: number; reviewCount: number
  placeId: string | null; reviews: ReviewData[]; logoDataUrl: string | null
  pageTheme: string; pageTagline: string | null; pageConfig: { sections: Section[] }
  socialLinks: Record<string, string>; isOwner: boolean; reputationPageEnabled: boolean
}

// ── Themes ────────────────────────────────────────────────────────────────────

const THEMES: Record<string, { bg: string; surface: string; elevated: string; text: string; secondary: string; tertiary: string; separator: string; accent: string; star: string; btn: string; btnText: string }> = {
  dark: {
    bg: "#000000", surface: "rgba(28,28,30,1)", elevated: "rgba(44,44,46,1)",
    text: "#ffffff", secondary: "rgba(235,235,245,0.6)", tertiary: "rgba(235,235,245,0.3)",
    separator: "rgba(255,255,255,0.12)", accent: "#0a84ff", star: "#ff9f0a",
    btn: "#ffffff", btnText: "#000000",
  },
  light: {
    bg: "#f2f2f7", surface: "#ffffff", elevated: "#e5e5ea",
    text: "#000000", secondary: "rgba(60,60,67,0.6)", tertiary: "rgba(60,60,67,0.3)",
    separator: "rgba(60,60,67,0.12)", accent: "#007aff", star: "#ff9f0a",
    btn: "#007aff", btnText: "#ffffff",
  },
  warm: {
    bg: "#1c0a00", surface: "rgba(60,20,5,0.9)", elevated: "rgba(90,35,10,0.9)",
    text: "#fff8f0", secondary: "rgba(255,220,170,0.6)", tertiary: "rgba(255,220,170,0.3)",
    separator: "rgba(255,200,100,0.15)", accent: "#ff9f0a", star: "#ff9f0a",
    btn: "#ff9f0a", btnText: "#000000",
  },
  ocean: {
    bg: "#001829", surface: "rgba(0,40,70,0.9)", elevated: "rgba(0,60,100,0.9)",
    text: "#e8f4fd", secondary: "rgba(180,220,255,0.6)", tertiary: "rgba(180,220,255,0.3)",
    separator: "rgba(100,180,255,0.15)", accent: "#30d5ff", star: "#ff9f0a",
    btn: "#30d5ff", btnText: "#000000",
  },
  forest: {
    bg: "#011a0a", surface: "rgba(5,45,20,0.9)", elevated: "rgba(10,70,30,0.9)",
    text: "#e8f5e9", secondary: "rgba(170,235,180,0.6)", tertiary: "rgba(170,235,180,0.3)",
    separator: "rgba(100,200,120,0.15)", accent: "#32d74b", star: "#ff9f0a",
    btn: "#32d74b", btnText: "#000000",
  },
}

// ── Social Icons (monochrome SVG) ─────────────────────────────────────────────

const SOCIAL_META: Record<string, { label: string; svg: string }> = {
  google:      { label: "Google Maps", svg: `<svg viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>` },
  facebook:    { label: "Facebook", svg: `<svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>` },
  instagram:   { label: "Instagram", svg: `<svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>` },
  tripadvisor: { label: "TripAdvisor", svg: `<svg viewBox="0 0 24 24"><path d="M12 0a12 12 0 100 24A12 12 0 0012 0zm0 4.5c1.93 0 3.73.54 5.25 1.47L19.5 6H21l-2.1 2.1A7.46 7.46 0 0112 5.5a7.46 7.46 0 00-6.9 2.6L3 6h1.5l2.25-.03A7.5 7.5 0 0112 4.5zM7 12a2.5 2.5 0 110 5 2.5 2.5 0 010-5zm10 0a2.5 2.5 0 110 5 2.5 2.5 0 010-5zM7 13.5a1 1 0 100 2 1 1 0 000-2zm10 0a1 1 0 100 2 1 1 0 000-2z"/></svg>` },
  x:           { label: "X (Twitter)", svg: `<svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>` },
  whatsapp:    { label: "WhatsApp", svg: `<svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>` },
  website:     { label: "Site web", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>` },
}

function SocialIcon({ platform, color, size = 18 }: { platform: string; color: string; size?: number }) {
  const meta = SOCIAL_META[platform]
  if (!meta) return null
  return (
    <span
      style={{ width: size, height: size, color, display: "inline-flex", flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: meta.svg.replace("<svg ", `<svg width="${size}" height="${size}" fill="${platform === "website" ? "none" : color}" `) }}
    />
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Stars({ rating, color, size = 14 }: { rating: number; color: string; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 1 }}>
      {[1,2,3,4,5].map(s => (
        <svg key={s} width={size} height={size} viewBox="0 0 24 24" fill={s <= Math.round(rating) ? color : "rgba(150,150,150,0.3)"}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </span>
  )
}

function timeAgo(d: string) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  if (days < 1) return "aujourd'hui"
  if (days < 7) return `${days}j`
  if (days < 30) return `${Math.floor(days/7)}sem`
  if (days < 365) return `${Math.floor(days/30)}mois`
  return `${Math.floor(days/365)}an`
}

const DAYS: [string, string][] = [["monday","Lun"],["tuesday","Mar"],["wednesday","Mer"],["thursday","Jeu"],["friday","Ven"],["saturday","Sam"],["sunday","Dim"]]
const TODAY = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay()-1]?.[0] ?? "monday"

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ label, t }: { label: string; t: typeof THEMES["dark"] }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: t.tertiary, marginBottom: 12, paddingLeft: 4 }}>
      {label}
    </p>
  )
}

// ── Reviews section ───────────────────────────────────────────────────────────

function ReviewsSection({ reviews, placeId, t, onTrack }: { reviews: ReviewData[]; placeId: string | null; t: typeof THEMES["dark"]; onTrack: (type: string) => void }) {
  const [idx, setIdx] = useState(0)
  const reviewUrl = placeId ? `https://search.google.com/local/writereview?placeid=${placeId}` : null
  return (
    <div>
      {reviewUrl && (
        <a
          href={reviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onTrack("cta_review")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "14px 20px", borderRadius: 14, background: t.btn, color: t.btnText, fontWeight: 700, fontSize: 16, textDecoration: "none", marginBottom: 20 }}
        >
          <Star style={{ width: 18, height: 18, fill: t.btnText }} />
          Laisser un avis Google
        </a>
      )}
      {reviews.length > 0 && (
        <>
          <SectionLabel label="Avis clients" t={t} />
          <div style={{ borderRadius: 16, overflow: "hidden", background: t.surface }}>
            {reviews.map((r, i) => (
              <div key={i} style={{ padding: "16px", borderBottom: i < reviews.length - 1 ? `1px solid ${t.separator}` : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#0ea5e9)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                      {r.reviewerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ color: t.text, fontWeight: 600, fontSize: 14, margin: 0 }}>{r.reviewerName}</p>
                      <p style={{ color: t.tertiary, fontSize: 12, margin: 0 }}>{timeAgo(r.reviewPublishedAt)}</p>
                    </div>
                  </div>
                  <Stars rating={r.rating} color={t.star} size={13} />
                </div>
                {r.comment && <p style={{ color: t.secondary, fontSize: 14, lineHeight: 1.5, margin: 0, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.comment}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Social section ────────────────────────────────────────────────────────────

function SocialSection({ links, t, onTrack, isEditing, onChange }: { links: SocialLink[]; t: typeof THEMES["dark"]; onTrack: (type: string) => void; isEditing: boolean; onChange?: (links: SocialLink[]) => void }) {
  const all = Object.keys(SOCIAL_META)
  if (!isEditing && links.filter(l => l.url).length === 0) return null
  return (
    <div>
      <SectionLabel label="Retrouvez-nous" t={t} />
      <div style={{ borderRadius: 16, overflow: "hidden", background: t.surface }}>
        {links.filter(l => isEditing || l.url).map((link, i, arr) => (
          <div key={link.platform} style={{ padding: "14px 16px", borderBottom: i < arr.length - 1 ? `1px solid ${t.separator}` : "none", display: "flex", alignItems: "center", gap: 12 }}>
            {isEditing ? (
              <>
                <SocialIcon platform={link.platform} color={t.secondary} size={20} />
                <span style={{ color: t.text, fontSize: 15, flex: 1 }}>{SOCIAL_META[link.platform]?.label ?? link.platform}</span>
                <input
                  value={link.url}
                  onChange={e => onChange?.(links.map((l, j) => j === i ? { ...l, url: e.target.value } : l))}
                  placeholder="https://..."
                  style={{ flex: 2, background: t.elevated, border: "none", borderRadius: 8, padding: "6px 10px", color: t.text, fontSize: 13, outline: "none" }}
                />
                <button onClick={() => onChange?.(links.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#ff3b30", padding: 4 }}>
                  <Trash2 size={15} />
                </button>
              </>
            ) : (
              <a
                href={link.url.startsWith("http") ? link.url : `https://${link.url}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onTrack(`cta_social_${link.platform}`)}
                style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, textDecoration: "none" }}
              >
                <SocialIcon platform={link.platform} color={t.secondary} size={22} />
                <span style={{ color: t.text, fontSize: 15, flex: 1 }}>{link.label || SOCIAL_META[link.platform]?.label}</span>
                <ChevronRight size={16} style={{ color: t.tertiary }} />
              </a>
            )}
          </div>
        ))}
        {isEditing && (
          <div style={{ padding: "12px 16px", borderTop: links.length > 0 ? `1px solid ${t.separator}` : "none" }}>
            <select
              onChange={e => {
                const p = e.target.value
                if (!p || links.find(l => l.platform === p)) return
                onChange?.([...links, { platform: p, url: "", label: SOCIAL_META[p]?.label ?? p }])
                e.target.value = ""
              }}
              defaultValue=""
              style={{ background: t.elevated, border: "none", borderRadius: 8, padding: "8px 12px", color: t.secondary, fontSize: 14, cursor: "pointer", width: "100%" }}
            >
              <option value="">+ Ajouter un réseau...</option>
              {all.filter(p => !links.find(l => l.platform === p)).map(p => (
                <option key={p} value={p}>{SOCIAL_META[p].label}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Hours section ─────────────────────────────────────────────────────────────

function HoursSection({ schedule, t, isEditing, onChange }: { schedule: Record<string, HourEntry>; t: typeof THEMES["dark"]; isEditing: boolean; onChange?: (s: Record<string, HourEntry>) => void }) {
  const isOpenNow = () => {
    const todayEntry = schedule[TODAY]
    if (!todayEntry || todayEntry.closed) return false
    const now = new Date()
    const [oh, om] = todayEntry.open.split(":").map(Number)
    const [ch, cm] = todayEntry.close.split(":").map(Number)
    const mins = now.getHours() * 60 + now.getMinutes()
    return mins >= oh * 60 + om && mins < ch * 60 + cm
  }
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <SectionLabel label="Horaires" t={t} />
        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: isOpenNow() ? "rgba(50,215,75,0.2)" : "rgba(255,59,48,0.2)", color: isOpenNow() ? "#32d74b" : "#ff3b30", marginTop: -10 }}>
          {isOpenNow() ? "Ouvert" : "Fermé"}
        </span>
      </div>
      <div style={{ borderRadius: 16, overflow: "hidden", background: t.surface }}>
        {DAYS.map(([key, label], i) => {
          const entry = schedule[key] ?? { open: "09:00", close: "22:00", closed: false }
          const isToday = key === TODAY
          return (
            <div key={key} style={{ padding: "12px 16px", borderBottom: i < 6 ? `1px solid ${t.separator}` : "none", display: "flex", alignItems: "center", background: isToday ? `${t.accent}15` : "transparent" }}>
              <span style={{ width: 36, color: isToday ? t.accent : t.text, fontWeight: isToday ? 700 : 400, fontSize: 14 }}>{label}</span>
              {entry.closed ? (
                <span style={{ color: t.tertiary, fontSize: 14 }}>Fermé</span>
              ) : isEditing ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="time" value={entry.open} onChange={e => onChange?.({ ...schedule, [key]: { ...entry, open: e.target.value } })}
                    style={{ background: t.elevated, border: "none", borderRadius: 6, padding: "4px 8px", color: t.text, fontSize: 13 }} />
                  <span style={{ color: t.tertiary }}>–</span>
                  <input type="time" value={entry.close} onChange={e => onChange?.({ ...schedule, [key]: { ...entry, close: e.target.value } })}
                    style={{ background: t.elevated, border: "none", borderRadius: 6, padding: "4px 8px", color: t.text, fontSize: 13 }} />
                </div>
              ) : (
                <span style={{ color: t.secondary, fontSize: 14 }}>{entry.open} – {entry.close}</span>
              )}
              {isEditing && (
                <label style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: t.tertiary, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!entry.closed} onChange={e => onChange?.({ ...schedule, [key]: { ...entry, closed: e.target.checked } })} />
                  Fermé
                </label>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Location section ──────────────────────────────────────────────────────────

function LocationSection({ address, placeId, t, isEditing, onChange, onTrack }: { address: string; placeId: string | null; t: typeof THEMES["dark"]; isEditing: boolean; onChange?: (a: string) => void; onTrack: (type: string) => void }) {
  const mapsUrl = placeId ? `https://www.google.com/maps/place/?q=place_id:${placeId}` : address ? `https://maps.google.com/?q=${encodeURIComponent(address)}` : null
  return (
    <div>
      <SectionLabel label="Adresse" t={t} />
      <div style={{ borderRadius: 16, background: t.surface, overflow: "hidden" }}>
        <div style={{ padding: "16px" }}>
          {isEditing ? (
            <input
              value={address}
              onChange={e => onChange?.(e.target.value)}
              placeholder="12 Rue de la Paix, 24100 Bergerac"
              style={{ width: "100%", background: t.elevated, border: "none", borderRadius: 8, padding: "8px 12px", color: t.text, fontSize: 14, outline: "none", boxSizing: "border-box" }}
            />
          ) : (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <MapPin size={18} style={{ color: t.accent, flexShrink: 0, marginTop: 1 }} />
              <p style={{ color: t.text, fontSize: 15, margin: 0, lineHeight: 1.5 }}>{address || "Adresse non renseignée"}</p>
            </div>
          )}
        </div>
        {mapsUrl && !isEditing && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onTrack("cta_maps")}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: `1px solid ${t.separator}`, color: t.accent, fontSize: 15, fontWeight: 500, textDecoration: "none" }}
          >
            Voir sur Google Maps
            <ChevronRight size={16} />
          </a>
        )}
      </div>
    </div>
  )
}

// ── Photos section ────────────────────────────────────────────────────────────

function PhotosSection({ images, t, isEditing, onChange }: { images: PhotoItem[]; t: typeof THEMES["dark"]; isEditing: boolean; onChange?: (imgs: PhotoItem[]) => void }) {
  const [lightbox, setLightbox] = useState<string | null>(null)
  return (
    <div>
      <SectionLabel label="Galerie" t={t} />
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <img src={lightbox} style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: 12, objectFit: "contain" }} />
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {images.map((img, i) => (
          <div key={i} style={{ position: "relative", borderRadius: 12, overflow: "hidden", aspectRatio: "1", background: t.surface }}>
            <img src={img.dataUrl} alt={img.caption} onClick={() => !isEditing && setLightbox(img.dataUrl)} style={{ width: "100%", height: "100%", objectFit: "cover", cursor: isEditing ? "default" : "pointer" }} />
            {isEditing && (
              <button onClick={() => onChange?.(images.filter((_, j) => j !== i))} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}>
                <X size={14} />
              </button>
            )}
          </div>
        ))}
        {isEditing && images.length < 6 && (
          <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", aspectRatio: "1", borderRadius: 12, border: `2px dashed ${t.separator}`, cursor: "pointer", gap: 6 }}>
            <Plus size={24} style={{ color: t.tertiary }} />
            <span style={{ fontSize: 12, color: t.tertiary }}>Ajouter</span>
            <input type="file" accept="image/*" className="hidden" onChange={e => {
              const file = e.target.files?.[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = ev => {
                const img = new window.Image()
                img.onload = () => {
                  const canvas = document.createElement("canvas")
                  const size = 800
                  canvas.width = size; canvas.height = size
                  const ctx = canvas.getContext("2d")!
                  const scale = Math.max(size / img.width, size / img.height)
                  const w = img.width * scale, h = img.height * scale
                  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
                  onChange?.([...images, { dataUrl: canvas.toDataURL("image/jpeg", 0.75), caption: "" }])
                }
                img.src = ev.target?.result as string
              }
              reader.readAsDataURL(file)
              e.target.value = ""
            }} />
          </label>
        )}
      </div>
    </div>
  )
}

// ── Section wrapper with edit controls ────────────────────────────────────────

function EditableSectionWrapper({ section, t, children, onToggle, isDragging, onDragStart, onDragOver, onDrop }: {
  section: Section; t: typeof THEMES["dark"]; children: React.ReactNode
  onToggle: () => void; isDragging: boolean
  onDragStart: () => void; onDragOver: (e: React.DragEvent) => void; onDrop: () => void
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={e => { e.preventDefault(); onDragOver(e) }}
      onDrop={onDrop}
      style={{ opacity: isDragging ? 0.4 : 1, transition: "opacity 0.15s" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <GripVertical size={16} style={{ color: t.tertiary, cursor: "grab", flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: t.secondary, flex: 1, fontWeight: 500 }}>
          {{ reviews: "Avis", social: "Réseaux sociaux", hours: "Horaires", location: "Adresse", photos: "Photos" }[section.type] ?? section.type}
        </span>
        <button
          onClick={onToggle}
          style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, border: `1px solid ${t.separator}`, background: section.enabled ? t.accent : "transparent", color: section.enabled ? "#fff" : t.tertiary, cursor: "pointer" }}
        >
          {section.enabled ? "Visible" : "Masqué"}
        </button>
      </div>
      {section.enabled && <div style={{ opacity: 1 }}>{children}</div>}
      {!section.enabled && (
        <div style={{ height: 48, borderRadius: 12, border: `2px dashed ${t.separator}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 13, color: t.tertiary }}>Section masquée</span>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ReputationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [data, setData]         = useState<PageData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [sections, setSections] = useState<Section[]>([])
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null)
  const [pageTagline, setPageTagline] = useState<string | null>(null)
  const [pageTheme, setPageTheme]     = useState("dark")
  const [dragIdx, setDragIdx]   = useState<number | null>(null)
  const tracked                 = useRef(false)

  useEffect(() => {
    fetch(`/api/r/${slug}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return }
        setData(d)
        const cfg = d.pageConfig as { sections: Section[] }
        // Merge socialLinks into social section for backward compat
        const merged = cfg.sections.map((s: Section) => {
          if (s.type === "social" && (!s.links || s.links.length === 0) && d.socialLinks) {
            const links = Object.entries(d.socialLinks as Record<string,string>)
              .filter(([,url]) => url)
              .map(([p, url]) => ({ platform: p, url, label: SOCIAL_META[p]?.label ?? p }))
            return { ...s, links }
          }
          return s
        })
        setSections(merged.sort((a: Section, b: Section) => a.order - b.order))
        setLogoDataUrl(d.logoDataUrl)
        setPageTagline(d.pageTagline)
        setPageTheme(d.pageTheme ?? "dark")
        setLoading(false)
      })
      .catch(() => { setError("Page introuvable"); setLoading(false) })
  }, [slug])

  useEffect(() => {
    if (data && !tracked.current) {
      tracked.current = true
      fetch(`/api/r/${slug}/track`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "view" }) })
    }
  }, [data, slug])

  function track(type: string) {
    fetch(`/api/r/${slug}/track`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }) })
  }

  function updateSection(id: string, patch: Partial<Section>) {
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }

  async function handleSave() {
    setSaving(true)
    const config = { sections: sections.map((s, i) => ({ ...s, order: i })) }
    await fetch("/api/page", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageConfig: config, logoDataUrl, pageTagline, pageTheme, reputationPageEnabled: true }),
    })
    setSaving(false)
    setIsEditing(false)
    setData(prev => prev ? { ...prev, pageConfig: config, logoDataUrl, pageTagline, pageTheme } : prev)
  }

  // Drag & drop
  function handleDrop(toIdx: number) {
    if (dragIdx === null || dragIdx === toIdx) { setDragIdx(null); return }
    const next = [...sections]
    const [moved] = next.splice(dragIdx, 1)
    next.splice(toIdx, 0, moved)
    setSections(next)
    setDragIdx(null)
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 28, height: 28, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  if (error) return (
    <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "rgba(255,255,255,0.4)" }}>{error}</p>
    </div>
  )
  if (!data) return null

  const t = THEMES[pageTheme] ?? THEMES.dark

  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box}`}</style>

      {/* Edit top bar */}
      {isEditing && (
        <div style={{ position: "sticky", top: 0, zIndex: 50, background: t.surface, borderBottom: `1px solid ${t.separator}`, padding: "12px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: t.text, fontWeight: 600, fontSize: 15, flex: 1 }}>✏️ Mode édition</span>
          {/* Theme picker */}
          <div style={{ display: "flex", gap: 6 }}>
            {Object.entries(THEMES).map(([k, th]) => (
              <button key={k} onClick={() => setPageTheme(k)}
                style={{ width: 22, height: 22, borderRadius: "50%", background: th.bg, border: pageTheme === k ? `2px solid ${t.accent}` : `2px solid transparent`, cursor: "pointer", outline: "none" }} />
            ))}
          </div>
          <button onClick={() => setIsEditing(false)} style={{ background: "none", border: `1px solid ${t.separator}`, borderRadius: 8, padding: "6px 14px", color: t.secondary, fontSize: 14, cursor: "pointer" }}>
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving} style={{ background: t.accent, border: "none", borderRadius: 8, padding: "6px 14px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Save size={14} />
            {saving ? "..." : "Sauvegarder"}
          </button>
        </div>
      )}

      <div style={{ maxWidth: 430, margin: "0 auto", padding: "32px 20px 80px" }}>

        {/* ── Hero ── */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          {/* Logo */}
          {isEditing ? (
            <label style={{ cursor: "pointer", display: "inline-block", marginBottom: 16 }}>
              {logoDataUrl ? (
                <img src={logoDataUrl} style={{ width: 80, height: 80, borderRadius: 20, objectFit: "cover", border: `2px solid ${t.accent}` }} />
              ) : (
                <div style={{ width: 80, height: 80, borderRadius: 20, background: t.elevated, border: `2px dashed ${t.separator}`, display: "flex", alignItems: "center", justifyContent: "center", color: t.tertiary, fontSize: 28, fontWeight: 800 }}>
                  {data.businessName.charAt(0)}
                </div>
              )}
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                const file = e.target.files?.[0]; if (!file) return
                const reader = new FileReader()
                reader.onload = ev => {
                  const img = new window.Image()
                  img.onload = () => {
                    const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 256
                    const ctx = canvas.getContext("2d")!
                    const scale = Math.max(256/img.width, 256/img.height)
                    const w = img.width*scale, h = img.height*scale
                    ctx.drawImage(img, (256-w)/2, (256-h)/2, w, h)
                    setLogoDataUrl(canvas.toDataURL("image/jpeg", 0.85))
                  }
                  img.src = ev.target?.result as string
                }
                reader.readAsDataURL(file); e.target.value = ""
              }} />
            </label>
          ) : logoDataUrl ? (
            <img src={logoDataUrl} style={{ width: 80, height: 80, borderRadius: 20, objectFit: "cover", marginBottom: 16 }} />
          ) : (
            <div style={{ width: 80, height: 80, borderRadius: 20, background: `linear-gradient(135deg,${t.accent},${t.star})`, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 32, fontWeight: 800, marginBottom: 16 }}>
              {data.businessName.charAt(0)}
            </div>
          )}

          <h1 style={{ color: t.text, fontSize: 28, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.3px" }}>{data.businessName}</h1>

          {isEditing ? (
            <input
              value={pageTagline ?? ""}
              onChange={e => setPageTagline(e.target.value || null)}
              placeholder="Votre accroche..."
              style={{ textAlign: "center", background: "transparent", border: `1px solid ${t.separator}`, borderRadius: 8, padding: "6px 12px", color: t.secondary, fontSize: 15, outline: "none", width: "100%", marginBottom: 12 }}
            />
          ) : pageTagline && (
            <p style={{ color: t.secondary, fontSize: 15, margin: "0 0 12px" }}>{pageTagline}</p>
          )}

          {data.rating > 0 && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: t.surface, borderRadius: 12, padding: "8px 14px" }}>
              <Stars rating={data.rating} color={t.star} size={15} />
              <span style={{ color: t.text, fontWeight: 700, fontSize: 16 }}>{data.rating.toFixed(1)}</span>
              <span style={{ color: t.tertiary, fontSize: 13 }}>· {data.reviewCount} avis</span>
            </div>
          )}
        </div>

        {/* ── Sections ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {sections.map((section, i) => {
            const sectionContent = (() => {
              switch (section.type) {
                case "reviews":
                  return <ReviewsSection reviews={data.reviews} placeId={data.placeId} t={t} onTrack={track} />
                case "social":
                  return <SocialSection links={section.links ?? []} t={t} onTrack={track} isEditing={isEditing} onChange={links => updateSection(section.id, { links })} />
                case "hours":
                  return <HoursSection schedule={section.schedule ?? {}} t={t} isEditing={isEditing} onChange={schedule => updateSection(section.id, { schedule })} />
                case "location":
                  return <LocationSection address={section.address ?? ""} placeId={data.placeId} t={t} isEditing={isEditing} onChange={address => updateSection(section.id, { address })} onTrack={track} />
                case "photos":
                  return <PhotosSection images={section.images ?? []} t={t} isEditing={isEditing} onChange={images => updateSection(section.id, { images })} />
                default:
                  return null
              }
            })()

            if (isEditing) {
              return (
                <EditableSectionWrapper
                  key={section.id}
                  section={section}
                  t={t}
                  onToggle={() => updateSection(section.id, { enabled: !section.enabled })}
                  isDragging={dragIdx === i}
                  onDragStart={() => setDragIdx(i)}
                  onDragOver={() => {}}
                  onDrop={() => handleDrop(i)}
                >
                  {sectionContent}
                </EditableSectionWrapper>
              )
            }
            return section.enabled ? <div key={section.id}>{sectionContent}</div> : null
          })}
        </div>

        {/* Footer */}
        {!isEditing && (
          <p style={{ textAlign: "center", color: t.tertiary, fontSize: 12, marginTop: 40 }}>
            Propulsé par <span style={{ color: t.secondary, fontWeight: 600 }}>Reputix</span>
          </p>
        )}
      </div>

      {/* Edit FAB */}
      {data.isOwner && !isEditing && (
        <button
          onClick={() => setIsEditing(true)}
          style={{ position: "fixed", bottom: 28, right: 20, background: t.accent, border: "none", borderRadius: 20, padding: "12px 20px", color: "#fff", fontWeight: 600, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}
        >
          <Pencil size={16} />
          Modifier
        </button>
      )}
    </div>
  )
}
