"use client"

import { use, useEffect, useRef, useState } from "react"
import { ChevronRight, GripVertical, MapPin, Pencil, Plus, Save, Trash2, X, Quote } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReviewData { reviewerName: string; rating: number; comment: string | null; reviewPublishedAt: string }
interface SocialLink  { platform: string; url: string; label: string }
interface HourEntry   { open: string; close: string; closed: boolean }
interface PhotoItem   { dataUrl: string; caption: string }
interface Section     { id: string; type: string; enabled: boolean; order: number; links?: SocialLink[]; schedule?: Record<string, HourEntry>; address?: string; images?: PhotoItem[] }
interface PageData    { businessId: string; businessName: string; rating: number; reviewCount: number; placeId: string | null; reviews: ReviewData[]; logoDataUrl: string | null; pageTheme: string; pageTagline: string | null; pageConfig: { sections: Section[] }; socialLinks: Record<string, string>; isOwner: boolean; reputationPageEnabled: boolean }

// ── Themes ────────────────────────────────────────────────────────────────────

const THEMES = {
  dark:   { bg: "#09090b", surface: "#18181b", elevated: "#27272a", border: "rgba(255,255,255,0.08)", text: "#fafafa", secondary: "rgba(250,250,250,0.6)", muted: "rgba(250,250,250,0.35)", accent: "#e4e4e7", star: "#f59e0b", btn: "#fafafa", btnText: "#09090b", glow: "rgba(250,250,250,0.04)" },
  light:  { bg: "#ffffff", surface: "#f4f4f5", elevated: "#e4e4e7", border: "rgba(0,0,0,0.08)", text: "#09090b", secondary: "rgba(9,9,11,0.6)", muted: "rgba(9,9,11,0.35)", accent: "#18181b", star: "#f59e0b", btn: "#18181b", btnText: "#fafafa", glow: "rgba(0,0,0,0.03)" },
  warm:   { bg: "#0c0a09", surface: "#1c1917", elevated: "#292524", border: "rgba(251,191,36,0.1)", text: "#fef3c7", secondary: "rgba(254,243,199,0.6)", muted: "rgba(254,243,199,0.35)", accent: "#fbbf24", star: "#fbbf24", btn: "#fbbf24", btnText: "#0c0a09", glow: "rgba(251,191,36,0.06)" },
  ocean:  { bg: "#020617", surface: "#0f172a", elevated: "#1e293b", border: "rgba(56,189,248,0.1)", text: "#e0f2fe", secondary: "rgba(224,242,254,0.6)", muted: "rgba(224,242,254,0.35)", accent: "#38bdf8", star: "#f59e0b", btn: "#38bdf8", btnText: "#020617", glow: "rgba(56,189,248,0.06)" },
  forest: { bg: "#052e16", surface: "#14532d", elevated: "#166534", border: "rgba(74,222,128,0.1)", text: "#dcfce7", secondary: "rgba(220,252,231,0.6)", muted: "rgba(220,252,231,0.35)", accent: "#4ade80", star: "#f59e0b", btn: "#4ade80", btnText: "#052e16", glow: "rgba(74,222,128,0.06)" },
} as const
type Theme = typeof THEMES["dark"]

// ── Social icons ──────────────────────────────────────────────────────────────

const SOCIALS: Record<string, { label: string; path: string; viewBox?: string }> = {
  google:      { label: "Google Maps",  viewBox: "0 0 24 24", path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" },
  facebook:    { label: "Facebook",     viewBox: "0 0 24 24", path: "M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" },
  instagram:   { label: "Instagram",    viewBox: "0 0 24 24", path: "M16 4H8C5.79 4 4 5.79 4 8v8c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4V8c0-2.21-1.79-4-4-4zM12 15a3 3 0 110-6 3 3 0 010 6zm3.5-9a1 1 0 110 2 1 1 0 010-2z" },
  tripadvisor: { label: "TripAdvisor",  viewBox: "0 0 24 24", path: "M12 2a10 10 0 100 20A10 10 0 0012 2zm-2 11.5a2 2 0 110-4 2 2 0 010 4zm4 0a2 2 0 110-4 2 2 0 010 4zM6.5 9A5.5 5.5 0 0112 6.5 5.5 5.5 0 0117.5 9" },
  x:           { label: "X",            viewBox: "0 0 24 24", path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
  whatsapp:    { label: "WhatsApp",     viewBox: "0 0 24 24", path: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.18-.009-.372-.01-.571-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347z M12 2a10 10 0 00-8.55 15.15L2 22l4.99-1.42A10 10 0 1012 2z" },
  website:     { label: "Site web",     viewBox: "0 0 24 24", path: "M12 2a10 10 0 100 20A10 10 0 0012 2zm0 2c1.07 0 2.37.71 3.44 2.6.37.65.68 1.38.93 2.15a18.7 18.7 0 01-4.37.5 18.7 18.7 0 01-4.37-.5c.25-.77.56-1.5.93-2.15C9.63 4.71 10.93 4 12 4zm-7.72 5.5A16.7 16.7 0 019.8 10.3a20.7 20.7 0 00-.14 1.7H4.08a7.96 7.96 0 01.2-2.5zm-0.2 4.5h5.58c.04.6.09 1.17.16 1.7a16.7 16.7 0 01-5.52.8 7.96 7.96 0 01-.22-2.5zm2.13 4.5a18.7 18.7 0 004.98.8c-.2.57-.44 1.1-.7 1.57C9.43 21.86 8.37 22 8 22a7.98 7.98 0 01-1.79-5.5zm5.12 2.74a20.7 20.7 0 01-3.1-.6c.18-.5.33-1.03.46-1.59a20.7 20.7 0 003.32.28 20.7 20.7 0 003.32-.28c.13.56.28 1.09.46 1.6a20.7 20.7 0 01-3.1.6H12zm1.27.26a18.7 18.7 0 004.98-.8A7.98 7.98 0 0116.5 22c-.37 0-1.43-.14-2.49-1.13-.26-.47-.5-1-.7-1.57zm4.98-2.25a18.7 18.7 0 01-5.52-.8c.07-.53.12-1.1.16-1.7h5.58a7.96 7.96 0 01-.22 2.5zm.22-4.5h-5.58a20.7 20.7 0 00-.14-1.7 16.7 16.7 0 005.52-.8 7.96 7.96 0 01.2 2.5z" },
}

function SocialIcon({ p, color, size = 18 }: { p: string; color: string; size?: number }) {
  const m = SOCIALS[p]
  if (!m) return null
  return (
    <svg width={size} height={size} viewBox={m.viewBox ?? "0 0 24 24"} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d={m.path} fill={color} stroke="none" />
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Stars({ n, color, size = 13 }: { n: number; color: string; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= Math.round(n) ? color : "rgba(150,150,150,0.25)"}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </span>
  )
}

function ago(d: string) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  if (days < 1) return "aujourd'hui"
  if (days < 7) return `${days}j`
  if (days < 31) return `${Math.floor(days/7)}sem`
  if (days < 365) return `${Math.floor(days/30)}mois`
  return `${Math.floor(days/365)}an`
}

// compress image to square PNG (preserves transparency)
function compressImage(file: File, size: number): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = ev => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = size; canvas.height = size
        const ctx = canvas.getContext("2d")!
        const scale = Math.max(size / img.width, size / img.height)
        const w = img.width * scale, h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        resolve(canvas.toDataURL("image/png"))
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

const DAYS: [string, string][] = [["monday","Lun"],["tuesday","Mar"],["wednesday","Mer"],["thursday","Jeu"],["friday","Ven"],["saturday","Sam"],["sunday","Dim"]]
const TODAY_KEY = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]?.[0] ?? "monday"

// ── Section: Reviews ──────────────────────────────────────────────────────────

function ReviewsSection({ reviews, placeId, t, track }: { reviews: ReviewData[]; placeId: string | null; t: Theme; track: (e: string) => void }) {
  const url = placeId ? `https://search.google.com/local/writereview?placeid=${placeId}` : null
  return (
    <div>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" onClick={() => track("cta_review")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "16px", borderRadius: 16, background: t.btn, color: t.btnText, fontWeight: 700, fontSize: 16, textDecoration: "none", letterSpacing: "-0.2px", marginBottom: 24 }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill={t.btnText}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          Laisser un avis Google
        </a>
      )}
      {reviews.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {reviews.map((r, i) => (
            <div key={i} style={{ background: t.surface, borderRadius: 16, padding: 20, position: "relative" }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill={t.border} style={{ position: "absolute", top: 16, right: 16 }}>
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
              </svg>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg,#6366f1,#8b5cf6)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                  {r.reviewerName.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: t.text, fontWeight: 600, fontSize: 14, margin: "0 0 2px" }}>{r.reviewerName}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Stars n={r.rating} color={t.star} size={11} />
                    <span style={{ color: t.muted, fontSize: 12 }}>{ago(r.reviewPublishedAt)}</span>
                  </div>
                </div>
              </div>
              {r.comment && <p style={{ color: t.secondary, fontSize: 14, lineHeight: 1.6, margin: 0, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Section: Social ───────────────────────────────────────────────────────────

function SocialSection({ links, t, track, isEditing, onChange }: { links: SocialLink[]; t: Theme; track: (e: string) => void; isEditing: boolean; onChange?: (l: SocialLink[]) => void }) {
  if (!isEditing && !links.some(l => l.url)) return null
  return (
    <div style={{ background: t.surface, borderRadius: 16, overflow: "hidden" }}>
      {links.filter(l => isEditing || l.url).map((link, i, arr) => (
        <div key={link.platform} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: i < arr.length - 1 ? `1px solid ${t.border}` : "none" }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: t.elevated, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <SocialIcon p={link.platform} color={t.text} size={17} />
          </div>
          {isEditing ? (
            <>
              <span style={{ color: t.text, fontSize: 14, fontWeight: 500, flex: "0 0 100px" }}>{SOCIALS[link.platform]?.label ?? link.platform}</span>
              <input value={link.url} onChange={e => onChange?.(links.map((l, j) => j === i ? { ...l, url: e.target.value } : l))}
                placeholder="https://..." style={{ flex: 1, background: t.elevated, border: "none", borderRadius: 8, padding: "7px 10px", color: t.text, fontSize: 13, outline: "none" }} />
              <button onClick={() => onChange?.(links.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", padding: 4 }}><Trash2 size={15}/></button>
            </>
          ) : (
            <a href={link.url.startsWith("http") ? link.url : `https://${link.url}`} target="_blank" rel="noopener noreferrer"
              onClick={() => track(`cta_social_${link.platform}`)}
              style={{ display: "flex", alignItems: "center", flex: 1, textDecoration: "none", gap: 4 }}>
              <span style={{ color: t.text, fontSize: 15, fontWeight: 500, flex: 1 }}>{link.label || SOCIALS[link.platform]?.label}</span>
              <ChevronRight size={16} style={{ color: t.muted }} />
            </a>
          )}
        </div>
      ))}
      {isEditing && (
        <div style={{ padding: "10px 14px", borderTop: links.length ? `1px solid ${t.border}` : "none" }}>
          <select onChange={e => { const p = e.target.value; if (!p || links.find(l => l.platform === p)) return; onChange?.([...links, { platform: p, url: "", label: SOCIALS[p]?.label ?? p }]); e.target.value = "" }} defaultValue=""
            style={{ width: "100%", background: t.elevated, border: "none", borderRadius: 8, padding: "8px 12px", color: t.muted, fontSize: 13, cursor: "pointer" }}>
            <option value="">+ Ajouter un réseau...</option>
            {Object.keys(SOCIALS).filter(p => !links.find(l => l.platform === p)).map(p => <option key={p} value={p}>{SOCIALS[p].label}</option>)}
          </select>
        </div>
      )}
    </div>
  )
}

// ── Section: Hours ────────────────────────────────────────────────────────────

function HoursSection({ schedule, t, isEditing, onChange }: { schedule: Record<string, HourEntry>; t: Theme; isEditing: boolean; onChange?: (s: Record<string, HourEntry>) => void }) {
  const open = (() => {
    const e = schedule[TODAY_KEY]; if (!e || e.closed) return false
    const [oh, om] = e.open.split(":").map(Number), [ch, cm] = e.close.split(":").map(Number)
    const m = new Date().getHours() * 60 + new Date().getMinutes()
    return m >= oh * 60 + om && m < ch * 60 + cm
  })()
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: t.muted, margin: 0 }}>Horaires</p>
        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: open ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: open ? "#22c55e" : "#ef4444" }}>{open ? "Ouvert" : "Fermé"}</span>
      </div>
      <div style={{ background: t.surface, borderRadius: 16, overflow: "hidden" }}>
        {DAYS.map(([key, label], i) => {
          const e = schedule[key] ?? { open: "09:00", close: "22:00", closed: false }
          const isToday = key === TODAY_KEY
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", padding: "11px 18px", borderBottom: i < 6 ? `1px solid ${t.border}` : "none", background: isToday ? `${t.accent}12` : "transparent" }}>
              <span style={{ width: 34, fontSize: 14, fontWeight: isToday ? 700 : 400, color: isToday ? t.accent : t.text }}>{label}</span>
              {e.closed ? <span style={{ color: t.muted, fontSize: 14 }}>Fermé</span> : isEditing ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="time" value={e.open} onChange={ev => onChange?.({ ...schedule, [key]: { ...e, open: ev.target.value } })} style={{ background: t.elevated, border: "none", borderRadius: 6, padding: "4px 8px", color: t.text, fontSize: 13 }} />
                  <span style={{ color: t.muted }}>–</span>
                  <input type="time" value={e.close} onChange={ev => onChange?.({ ...schedule, [key]: { ...e, close: ev.target.value } })} style={{ background: t.elevated, border: "none", borderRadius: 6, padding: "4px 8px", color: t.text, fontSize: 13 }} />
                </div>
              ) : <span style={{ color: t.secondary, fontSize: 14 }}>{e.open} – {e.close}</span>}
              {isEditing && <label style={{ marginLeft: "auto", display: "flex", gap: 6, fontSize: 12, color: t.muted, cursor: "pointer", alignItems: "center" }}><input type="checkbox" checked={!!e.closed} onChange={ev => onChange?.({ ...schedule, [key]: { ...e, closed: ev.target.checked } })} />Fermé</label>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Section: Location ─────────────────────────────────────────────────────────

function LocationSection({ address, placeId, t, isEditing, onChange, track }: { address: string; placeId: string | null; t: Theme; isEditing: boolean; onChange?: (a: string) => void; track: (e: string) => void }) {
  const mapsUrl = placeId ? `https://www.google.com/maps/place/?q=place_id:${placeId}` : address ? `https://maps.google.com/?q=${encodeURIComponent(address)}` : null
  return (
    <div style={{ background: t.surface, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "16px 18px" }}>
        {isEditing ? (
          <input value={address} onChange={e => onChange?.(e.target.value)} placeholder="12 Rue de la Paix, 24100 Bergerac"
            style={{ width: "100%", background: t.elevated, border: "none", borderRadius: 8, padding: "8px 12px", color: t.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        ) : (
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: t.elevated, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <MapPin size={17} style={{ color: t.accent }} />
            </div>
            <p style={{ color: t.text, fontSize: 15, margin: "4px 0 0", lineHeight: 1.5 }}>{address || "Adresse non renseignée"}</p>
          </div>
        )}
      </div>
      {mapsUrl && !isEditing && (
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" onClick={() => track("cta_maps")}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px", borderTop: `1px solid ${t.border}`, color: t.accent, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
          Ouvrir dans Google Maps <ChevronRight size={16} />
        </a>
      )}
    </div>
  )
}

// ── Section: Photos ───────────────────────────────────────────────────────────

function PhotosSection({ images, t, isEditing, onChange }: { images: PhotoItem[]; t: Theme; isEditing: boolean; onChange?: (i: PhotoItem[]) => void }) {
  const [lb, setLb] = useState<string | null>(null)
  return (
    <div>
      {lb && <div onClick={() => setLb(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.96)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}><img src={lb} style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: 12, objectFit: "contain" }} /></div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {images.map((img, i) => (
          <div key={i} style={{ position: "relative", borderRadius: 14, overflow: "hidden", aspectRatio: "1" }}>
            <img src={img.dataUrl} alt="" onClick={() => !isEditing && setLb(img.dataUrl)} style={{ width: "100%", height: "100%", objectFit: "cover", cursor: isEditing ? "default" : "pointer", display: "block" }} />
            {isEditing && <button onClick={() => onChange?.(images.filter((_, j) => j !== i))} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.7)", border: "none", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}><X size={13} /></button>}
          </div>
        ))}
        {isEditing && images.length < 6 && (
          <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", aspectRatio: "1", borderRadius: 14, border: `2px dashed ${t.border}`, cursor: "pointer", gap: 6, background: t.surface }}>
            <Plus size={22} style={{ color: t.muted }} />
            <span style={{ fontSize: 12, color: t.muted }}>Ajouter</span>
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={async e => {
              const file = e.target.files?.[0]; if (!file) return
              const dataUrl = await compressImage(file, 800)
              onChange?.([...images, { dataUrl, caption: "" }])
              e.target.value = ""
            }} />
          </label>
        )}
      </div>
    </div>
  )
}

// ── Edit section wrapper ──────────────────────────────────────────────────────

const SECTION_LABELS: Record<string, string> = { reviews: "Avis clients", social: "Réseaux sociaux", hours: "Horaires", location: "Adresse", photos: "Photos" }

function EditWrapper({ section, t, onToggle, dragIdx, myIdx, onDragStart, onDrop, children }: { section: Section; t: Theme; onToggle: () => void; dragIdx: number | null; myIdx: number; onDragStart: () => void; onDrop: () => void; children: React.ReactNode }) {
  return (
    <div draggable onDragStart={onDragStart} onDragOver={e => e.preventDefault()} onDrop={onDrop} style={{ opacity: dragIdx === myIdx ? 0.3 : 1, transition: "opacity 0.15s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, padding: "0 4px" }}>
        <GripVertical size={15} style={{ color: t.muted, cursor: "grab" }} />
        <span style={{ fontSize: 12, color: t.secondary, fontWeight: 500, flex: 1 }}>{SECTION_LABELS[section.type] ?? section.type}</span>
        <button onClick={onToggle} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, border: `1px solid ${t.border}`, background: section.enabled ? t.accent : "transparent", color: section.enabled ? t.btnText : t.muted, cursor: "pointer", fontWeight: 600 }}>
          {section.enabled ? "Visible" : "Masqué"}
        </button>
      </div>
      {section.enabled ? children : (
        <div style={{ height: 44, borderRadius: 12, border: `1.5px dashed ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 12, color: t.muted }}>Section masquée</span>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [data, setData]         = useState<PageData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState("")
  const [isEditing, setEditing] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [sections, setSections] = useState<Section[]>([])
  const [logo, setLogo]         = useState<string | null>(null)
  const [tagline, setTagline]   = useState<string | null>(null)
  const [theme, setTheme]       = useState("dark")
  const [dragIdx, setDragIdx]   = useState<number | null>(null)
  const tracked                 = useRef(false)

  useEffect(() => {
    fetch(`/api/r/${slug}`).then(r => r.json()).then(d => {
      if (d.error) { setError(d.error); setLoading(false); return }
      setData(d)
      const raw: Section[] = (d.pageConfig?.sections ?? []).sort((a: Section, b: Section) => a.order - b.order)
      // Backfill socialLinks into social section
      const merged = raw.map((s: Section) => {
        if (s.type === "social" && !s.links?.length && d.socialLinks) {
          const links = Object.entries(d.socialLinks as Record<string,string>).filter(([,u]) => u).map(([p,u]) => ({ platform: p, url: u, label: SOCIALS[p]?.label ?? p }))
          return { ...s, links }
        }
        return s
      })
      setSections(merged)
      setLogo(d.logoDataUrl)
      setTagline(d.pageTagline)
      setTheme(d.pageTheme ?? "dark")
      setLoading(false)
    }).catch(() => { setError("Page introuvable"); setLoading(false) })
  }, [slug])

  useEffect(() => {
    if (data && !tracked.current) { tracked.current = true; fetch(`/api/r/${slug}/track`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "view" }) }) }
  }, [data, slug])

  function track(type: string) {
    fetch(`/api/r/${slug}/track`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }) })
  }

  function updateSection(id: string, patch: Partial<Section>) {
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }

  async function save() {
    setSaving(true)
    const config = { sections: sections.map((s, i) => ({ ...s, order: i })) }
    await fetch("/api/page", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pageConfig: config, logoDataUrl: logo, pageTagline: tagline, pageTheme: theme, reputationPageEnabled: true }) })
    setSaving(false)
    setEditing(false)
    setData(prev => prev ? { ...prev, pageConfig: config, logoDataUrl: logo, pageTagline: tagline, pageTheme: theme } : prev)
  }

  function drop(toIdx: number) {
    if (dragIdx === null || dragIdx === toIdx) { setDragIdx(null); return }
    const next = [...sections]; const [m] = next.splice(dragIdx, 1); next.splice(toIdx, 0, m)
    setSections(next); setDragIdx(null)
  }

  if (loading) return (
    <div style={{ minHeight: "100svh", background: "#09090b", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 24, height: 24, border: "2px solid rgba(255,255,255,0.15)", borderTopColor: "rgba(255,255,255,0.8)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  if (error) return <div style={{ minHeight: "100svh", background: "#09090b", display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>{error}</p></div>
  if (!data) return null

  const t: Theme = (THEMES as unknown as Record<string, Theme>)[theme] ?? THEMES.dark

  const renderSection = (section: Section) => {
    switch (section.type) {
      case "reviews":  return <ReviewsSection reviews={data.reviews} placeId={data.placeId} t={t} track={track} />
      case "social":   return <SocialSection links={section.links ?? []} t={t} track={track} isEditing={isEditing} onChange={l => updateSection(section.id, { links: l })} />
      case "hours":    return <HoursSection schedule={section.schedule ?? {}} t={t} isEditing={isEditing} onChange={s => updateSection(section.id, { schedule: s })} />
      case "location": return <LocationSection address={section.address ?? ""} placeId={data.placeId} t={t} isEditing={isEditing} onChange={a => updateSection(section.id, { address: a })} track={track} />
      case "photos":   return <PhotosSection images={section.images ?? []} t={t} isEditing={isEditing} onChange={imgs => updateSection(section.id, { images: imgs })} />
      default: return null
    }
  }

  return (
    <div style={{ minHeight: "100svh", background: t.bg, fontFamily: "-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box} input[type=time]::-webkit-calendar-picker-indicator{filter:invert(1);opacity:0.5}`}</style>

      {/* Edit bar */}
      {isEditing && (
        <div style={{ position: "sticky", top: 0, zIndex: 50, background: t.surface, borderBottom: `1px solid ${t.border}`, padding: "10px 20px", display: "flex", alignItems: "center", gap: 10, backdropFilter: "blur(20px)" }}>
          <span style={{ color: t.text, fontWeight: 600, fontSize: 14, flex: 1 }}>Mode édition</span>
          {/* Theme dots */}
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {(["dark","light","warm","ocean","forest"] as const).map(k => (
              <button key={k} onClick={() => setTheme(k)} style={{ width: 18, height: 18, borderRadius: "50%", background: THEMES[k].bg, border: theme === k ? `2.5px solid ${t.text}` : `2px solid ${t.border}`, cursor: "pointer", outline: "none", transition: "border 0.15s" }} />
            ))}
          </div>
          <button onClick={() => setEditing(false)} style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 10, padding: "6px 14px", color: t.secondary, fontSize: 13, cursor: "pointer" }}>Annuler</button>
          <button onClick={save} disabled={saving} style={{ background: t.btn, border: "none", borderRadius: 10, padding: "6px 16px", color: t.btnText, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, opacity: saving ? 0.6 : 1 }}>
            <Save size={13} />{saving ? "..." : "Sauvegarder"}
          </button>
        </div>
      )}

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 0 100px" }}>

        {/* ── Hero ── */}
        <div style={{ padding: "48px 24px 32px", textAlign: "center", position: "relative" }}>
          {/* Subtle glow behind logo */}
          <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", width: 160, height: 160, borderRadius: "50%", background: t.accent, opacity: 0.06, filter: "blur(40px)", pointerEvents: "none" }} />

          {/* Logo upload / display */}
          {isEditing ? (
            <label style={{ cursor: "pointer", display: "inline-block", marginBottom: 20, position: "relative" }}>
              {logo ? (
                <img src={logo} style={{ width: 84, height: 84, borderRadius: 22, objectFit: "cover", display: "block", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }} />
              ) : (
                <div style={{ width: 84, height: 84, borderRadius: 22, background: t.elevated, border: `2px dashed ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: t.muted, fontSize: 30, fontWeight: 800 }}>
                  {data.businessName.charAt(0)}
                </div>
              )}
              <div style={{ position: "absolute", bottom: -4, right: -4, width: 24, height: 24, borderRadius: "50%", background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
                <Pencil size={11} style={{ color: t.btnText }} />
              </div>
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={async e => {
                const file = e.target.files?.[0]; if (!file) return
                setLogo(await compressImage(file, 256)); e.target.value = ""
              }} />
            </label>
          ) : logo ? (
            <div style={{ position: "relative", display: "inline-block", marginBottom: 20 }}>
              <img src={logo} style={{ width: 84, height: 84, borderRadius: 22, objectFit: "cover", display: "block", boxShadow: "0 8px 32px rgba(0,0,0,0.35)" }} />
            </div>
          ) : (
            <div style={{ width: 84, height: 84, borderRadius: 22, background: `linear-gradient(135deg,${t.accent}40,${t.star}40)`, border: `1px solid ${t.border}`, display: "inline-flex", alignItems: "center", justifyContent: "center", color: t.text, fontSize: 34, fontWeight: 800, marginBottom: 20, boxShadow: "0 8px 32px rgba(0,0,0,0.35)" }}>
              {data.businessName.charAt(0)}
            </div>
          )}

          <h1 style={{ color: t.text, fontSize: 30, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.5px", lineHeight: 1.15 }}>
            {data.businessName}
          </h1>

          {isEditing ? (
            <input value={tagline ?? ""} onChange={e => setTagline(e.target.value || null)} placeholder="Ajoutez une accroche..."
              style={{ textAlign: "center", background: t.elevated, border: `1px solid ${t.border}`, borderRadius: 10, padding: "7px 14px", color: t.secondary, fontSize: 14, outline: "none", width: "calc(100% - 40px)", marginBottom: 16 }} />
          ) : tagline ? (
            <p style={{ color: t.secondary, fontSize: 15, margin: "0 0 16px", lineHeight: 1.5 }}>{tagline}</p>
          ) : null}

          {data.rating > 0 && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 50, padding: "8px 16px", marginTop: tagline || isEditing ? 0 : 8 }}>
              <Stars n={data.rating} color={t.star} size={14} />
              <span style={{ color: t.text, fontWeight: 700, fontSize: 16, letterSpacing: "-0.2px" }}>{data.rating.toFixed(1)}</span>
              <span style={{ color: t.muted, fontSize: 13 }}>· {data.reviewCount} avis</span>
            </div>
          )}
        </div>

        {/* Separator */}
        <div style={{ height: 1, background: t.border, margin: "0 24px 32px" }} />

        {/* ── Sections ── */}
        <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 32 }}>
          {sections.map((section, i) => {
            const content = renderSection(section)
            if (!content) return null
            if (isEditing) return (
              <EditWrapper key={section.id} section={section} t={t} onToggle={() => updateSection(section.id, { enabled: !section.enabled })} dragIdx={dragIdx} myIdx={i} onDragStart={() => setDragIdx(i)} onDrop={() => drop(i)}>
                {content}
              </EditWrapper>
            )
            return section.enabled ? (
              <div key={section.id}>
                {section.type !== "reviews" && (
                  <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: t.muted, marginBottom: 12, paddingLeft: 2 }}>
                    {SECTION_LABELS[section.type]}
                  </p>
                )}
                {content}
              </div>
            ) : null
          })}
        </div>

        {/* Footer */}
        {!isEditing && (
          <p style={{ textAlign: "center", color: t.muted, fontSize: 12, marginTop: 48, opacity: 0.6 }}>
            Propulsé par <span style={{ fontWeight: 600 }}>Reputix</span>
          </p>
        )}
      </div>

      {/* Edit FAB */}
      {data.isOwner && !isEditing && (
        <button onClick={() => setEditing(true)} style={{ position: "fixed", bottom: 24, right: 20, background: t.btn, border: "none", borderRadius: 50, padding: "13px 22px", color: t.btnText, fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.5)", letterSpacing: "-0.2px" }}>
          <Pencil size={15} />
          Modifier
        </button>
      )}
    </div>
  )
}
