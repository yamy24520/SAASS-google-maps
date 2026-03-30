"use client"

import { use, useEffect, useRef, useState, useCallback } from "react"
import {
  Camera, ChevronRight, MapPin, Pencil, Plus, Trash2, X, Search,
  Star as StarIcon, Clock, ExternalLink, CalendarDays, ArrowRight, Settings
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReviewData { reviewerName: string; rating: number; comment: string | null; reviewPublishedAt: string }
interface SocialLink  { platform: string; url: string; label: string }
interface HourEntry   { open: string; close: string; closed: boolean }
interface PhotoItem   { dataUrl: string; caption: string }
interface MenuItem    { id: string; name: string; description: string; price: string; photo?: string }
interface MenuCategory{ id: string; name: string; items: MenuItem[] }
interface Section     { id: string; type: string; enabled: boolean; order: number; links?: SocialLink[]; schedule?: Record<string, HourEntry>; address?: string; images?: PhotoItem[]; categories?: MenuCategory[] }

interface PageData {
  businessId: string
  businessName: string
  rating: number
  reviewCount: number
  placeId: string | null
  reviews: ReviewData[]
  logoDataUrl: string | null
  pageCoverDataUrl: string | null
  pageCoverHeight: number | null
  pageTheme: string
  pageStyle: string | null
  pageAccentColor: string | null
  pageTagline: string | null
  pageDescription: string | null
  pageLegalText: string | null
  pageConfig: { sections: Section[] }
  socialLinks: Record<string, string>
  bookingEnabled: boolean
  bookingPageSlug: string | null
  isOwner: boolean
  reputationPageEnabled: boolean
}

// ── Theme system (mirrors booking page) ───────────────────────────────────────

type StyleKey = "minimal" | "modern" | "future" | "luxury"

interface ThemeConfig {
  bg: string
  surface: string
  elevated: string
  border: string
  text: string
  secondary: string
  muted: string
  accent: string
  star: string
  btn: string
  btnText: string
  glow: string
  heroGradient: string
  isDark: boolean
  fontFamily: string
}

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "")
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `${r},${g},${b}`
}

function buildTheme(style: StyleKey, accent: string): ThemeConfig {
  const rgb = hexToRgb(accent)

  const base: Record<StyleKey, Omit<ThemeConfig, "accent" | "btn" | "glow" | "heroGradient">> = {
    modern: {
      bg: "#f5f5fa",
      surface: "#ffffff",
      elevated: "#f0f0f5",
      border: "rgba(0,0,0,0.07)",
      text: "#0f0f14",
      secondary: "rgba(15,15,20,0.6)",
      muted: "rgba(15,15,20,0.35)",
      star: "#f59e0b",
      btnText: "#ffffff",
      isDark: false,
      fontFamily: "-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',sans-serif",
    },
    minimal: {
      bg: "#fafafa",
      surface: "#ffffff",
      elevated: "#f4f4f5",
      border: "rgba(0,0,0,0.06)",
      text: "#111111",
      secondary: "rgba(17,17,17,0.55)",
      muted: "rgba(17,17,17,0.3)",
      star: "#f59e0b",
      btnText: "#ffffff",
      isDark: false,
      fontFamily: "'Georgia','Times New Roman',serif",
    },
    future: {
      bg: "#070711",
      surface: "#0e0e1f",
      elevated: "#14142a",
      border: `rgba(${rgb},0.18)`,
      text: "#e8e8ff",
      secondary: "rgba(232,232,255,0.6)",
      muted: "rgba(232,232,255,0.3)",
      star: "#f59e0b",
      btnText: "#ffffff",
      isDark: true,
      fontFamily: "'SF Mono','Fira Code','JetBrains Mono',monospace",
    },
    luxury: {
      bg: "#0a0906",
      surface: "#13110e",
      elevated: "#1d1a15",
      border: `rgba(${rgb},0.12)`,
      text: "#f0ece4",
      secondary: "rgba(240,236,228,0.65)",
      muted: "rgba(240,236,228,0.35)",
      star: accent,
      btnText: "#0a0906",
      isDark: true,
      fontFamily: "'Didact Gothic','Cormorant Garamond','Playfair Display',Georgia,serif",
    },
  }

  const b = base[style]

  return {
    ...b,
    accent,
    btn: accent,
    glow: `rgba(${rgb},0.25)`,
    heroGradient: b.isDark
      ? `radial-gradient(ellipse at 50% 0%, rgba(${rgb},0.12) 0%, transparent 65%)`
      : `radial-gradient(ellipse at 50% 0%, rgba(${rgb},0.06) 0%, transparent 65%)`,
  }
}

const LEGACY_THEME_MAP: Record<string, { style: StyleKey; accent: string }> = {
  dark:        { style: "modern",  accent: "#6366f1" },
  light:       { style: "minimal", accent: "#6366f1" },
  warm:        { style: "luxury",  accent: "#fbbf24" },
  ocean:       { style: "future",  accent: "#38bdf8" },
  forest:      { style: "modern",  accent: "#4ade80" },
  rose:        { style: "minimal", accent: "#f43f5e" },
  nature:      { style: "modern",  accent: "#16a34a" },
  default:     { style: "modern",  accent: "#6366f1" },
}

function resolveTheme(data: PageData): ThemeConfig {
  const style = (data.pageStyle as StyleKey | null) ?? LEGACY_THEME_MAP[data.pageTheme]?.style ?? "modern"
  const accent = data.pageAccentColor ?? LEGACY_THEME_MAP[data.pageTheme]?.accent ?? "#6366f1"
  return buildTheme(style, accent)
}

// ── Social icons ──────────────────────────────────────────────────────────────

const SOCIALS: Record<string, { label: string; path: string; viewBox?: string; color?: string }> = {
  google:      { label: "Google Maps",  color: "#4285F4", viewBox: "0 0 24 24", path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" },
  facebook:    { label: "Facebook",     color: "#1877F2", viewBox: "0 0 24 24", path: "M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" },
  instagram:   { label: "Instagram",    color: "#E4405F", viewBox: "0 0 24 24", path: "M16 4H8C5.79 4 4 5.79 4 8v8c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4V8c0-2.21-1.79-4-4-4zM12 15a3 3 0 110-6 3 3 0 010 6zm3.5-9a1 1 0 110 2 1 1 0 010-2z" },
  tripadvisor: { label: "TripAdvisor",  color: "#34E0A1", viewBox: "0 0 24 24", path: "M12 2a10 10 0 100 20A10 10 0 0012 2zm-2 11.5a2 2 0 110-4 2 2 0 010 4zm4 0a2 2 0 110-4 2 2 0 010 4zM6.5 9A5.5 5.5 0 0112 6.5 5.5 5.5 0 0117.5 9" },
  x:           { label: "X",            color: "#ffffff", viewBox: "0 0 24 24", path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
  whatsapp:    { label: "WhatsApp",     color: "#25D366", viewBox: "0 0 24 24", path: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.18-.009-.372-.01-.571-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347z M12 2a10 10 0 00-8.55 15.15L2 22l4.99-1.42A10 10 0 1012 2z" },
  website:     { label: "Site web",     color: "#6366f1", viewBox: "0 0 24 24", path: "M12 2a10 10 0 100 20 10 10 0 000-20zm1 17.93A8 8 0 0119.93 13H15a15.1 15.1 0 01-2 6.93zM4.07 13A8 8 0 0011 19.93 15.1 15.1 0 019 13H4.07zM9 11a15.1 15.1 0 012-6.93A8 8 0 004.07 11H9zm6 0h4.93A8 8 0 0013 4.07 15.1 15.1 0 0115 11z" },
}

function SocialIcon({ p, color, size = 18 }: { p: string; color: string; size?: number }) {
  const m = SOCIALS[p]
  if (!m) return null
  return (
    <svg width={size} height={size} viewBox={m.viewBox ?? "0 0 24 24"} fill="none">
      <path d={m.path} fill={color} />
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Stars({ n, color, size = 14 }: { n: number; color: string; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 1 }}>
      {[1,2,3,4,5].map(i => {
        const fill = n >= i ? 1 : n >= i - 0.5 ? 0.5 : 0
        const id = `h-${i}-${Math.random().toString(36).slice(2,6)}`
        if (fill === 0.5) return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24">
            <defs>
              <linearGradient id={id}>
                <stop offset="50%" stopColor={color} />
                <stop offset="50%" stopColor="rgba(150,150,150,0.2)" />
              </linearGradient>
            </defs>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={`url(#${id})`}/>
          </svg>
        )
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={fill === 1 ? color : "rgba(150,150,150,0.2)"}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        )
      })}
    </span>
  )
}

function ago(d: string) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  if (days < 1) return "aujourd'hui"
  if (days < 7) return `il y a ${days}j`
  if (days < 31) return `il y a ${Math.floor(days/7)} sem.`
  if (days < 365) return `il y a ${Math.floor(days/30)} mois`
  return `il y a ${Math.floor(days/365)} an`
}

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

function compressDish(file: File): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = ev => {
      const img = new window.Image()
      img.onload = () => {
        const size = 320
        const canvas = document.createElement("canvas")
        canvas.width = size; canvas.height = size
        const ctx = canvas.getContext("2d")!
        const scale = Math.max(size / img.width, size / img.height)
        const w = img.width * scale, h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        resolve(canvas.toDataURL("image/jpeg", 0.7))
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

const DAYS: [string, string][] = [["monday","Lundi"],["tuesday","Mardi"],["wednesday","Mercredi"],["thursday","Jeudi"],["friday","Vendredi"],["saturday","Samedi"],["sunday","Dimanche"]]
const TODAY_KEY = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]?.[0] ?? "monday"

function uid() { return Math.random().toString(36).slice(2, 9) }

// ── CSS Keyframes ────────────────────────────────────────────────────────────

const GLOBAL_CSS = `
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes glow-pulse{0%,100%{opacity:0.6;transform:scale(1)}50%{opacity:1;transform:scale(1.04)}}
@keyframes reveal-up{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
input[type=time]::-webkit-calendar-picker-indicator{filter:invert(1);opacity:0.5}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:4px}
`

// ── Scroll Reveal Hook ───────────────────────────────────────────────────────

function useReveal(delay = 0) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold: 0.08 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return {
    ref,
    style: {
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(28px)",
      transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
    } as React.CSSProperties,
  }
}

// ── Section: Menu ─────────────────────────────────────────────────────────────

function MenuCategoryTabs({ categories, activeCatId, t, onSelect }: { categories: MenuCategory[]; activeCatId: string | null; t: ThemeConfig; onSelect: (id: string) => void }) {
  if (!categories.length) return null
  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none", marginBottom: 20 }}>
      {categories.map(cat => {
        const active = cat.id === activeCatId
        return (
          <button key={cat.id} onClick={() => onSelect(cat.id)} style={{ flexShrink: 0, padding: "10px 22px", borderRadius: 50, border: "none", background: active ? t.accent : t.elevated, color: active ? t.btnText : t.secondary, fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6 }}>
            {cat.name}
            {cat.items.length > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: active ? "rgba(255,255,255,0.25)" : t.border, color: active ? t.btnText : t.muted, borderRadius: 50, padding: "1px 7px", lineHeight: 1.6 }}>{cat.items.length}</span>}
          </button>
        )
      })}
    </div>
  )
}

function MenuSection({ categories, t }: { categories: MenuCategory[]; t: ThemeConfig }) {
  const [activeCatId, setActiveCatId] = useState<string | null>(categories[0]?.id ?? null)
  const [menuSearch, setMenuSearch] = useState("")
  const activeCat = categories.find(c => c.id === activeCatId) ?? categories[0] ?? null

  useEffect(() => {
    if (!activeCatId || !categories.find(c => c.id === activeCatId)) setActiveCatId(categories[0]?.id ?? null)
  }, [categories, activeCatId])

  if (!categories.length) return null

  const searchQuery = menuSearch.trim().toLowerCase()
  const filteredItems = searchQuery
    ? (activeCat?.items ?? []).filter(i => i.name.toLowerCase().includes(searchQuery) || i.description.toLowerCase().includes(searchQuery))
    : activeCat?.items ?? []

  return (
    <div>
      {/* Search bar */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: t.muted, pointerEvents: "none" }} />
        <input
          value={menuSearch}
          onChange={e => setMenuSearch(e.target.value)}
          placeholder="Rechercher un plat..."
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "11px 16px 11px 38px", borderRadius: 14,
            border: `1.5px solid ${t.border}`, background: t.surface,
            color: t.text, fontSize: 14, outline: "none",
            transition: "border-color 0.2s",
          }}
          onFocus={e => e.currentTarget.style.borderColor = t.accent}
          onBlur={e => e.currentTarget.style.borderColor = t.border}
        />
        {menuSearch && (
          <button onClick={() => setMenuSearch("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: t.muted, padding: 2 }}>
            <X size={14} />
          </button>
        )}
      </div>

      <MenuCategoryTabs categories={categories} activeCatId={activeCat?.id ?? null} t={t} onSelect={id => { setActiveCatId(id); setMenuSearch("") }} />
      {activeCat && (
        <div style={{ borderRadius: 20, overflow: "hidden", background: t.surface, border: `1px solid ${t.border}` }}>
          {filteredItems.map((item, i) => (
            <div key={item.id} style={{ display: "flex", gap: 14, padding: "16px 20px", borderBottom: i < filteredItems.length - 1 ? `1px solid ${t.border}` : "none", alignItems: "flex-start" }}>
              {item.photo && <img src={item.photo} alt={item.name} loading="lazy" style={{ width: 68, height: 68, borderRadius: 14, objectFit: "cover", flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <p style={{ color: t.text, fontWeight: 600, fontSize: 15, lineHeight: 1.35 }}>{item.name}</p>
                  {item.price && <span style={{ color: t.accent, fontWeight: 700, fontSize: 15, flexShrink: 0 }}>{item.price}</span>}
                </div>
                {item.description && <p style={{ color: t.secondary, fontSize: 13, margin: "4px 0 0", lineHeight: 1.45 }}>{item.description}</p>}
              </div>
            </div>
          ))}
          {filteredItems.length === 0 && <p style={{ padding: 24, textAlign: "center", color: t.muted, fontSize: 14 }}>{searchQuery ? "Aucun résultat" : "Aucun plat"}</p>}
        </div>
      )}
    </div>
  )
}

// ── Section: Menu (edit) ──────────────────────────────────────────────────────

function MenuSectionEdit({ categories, t, onChange }: { categories: MenuCategory[]; t: ThemeConfig; onChange: (c: MenuCategory[]) => void }) {
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState("")
  const [activeCatId, setActiveCatId] = useState<string | null>(categories[0]?.id ?? null)
  const activeCat = categories.find(c => c.id === activeCatId) ?? categories[0] ?? null

  useEffect(() => {
    if (!activeCatId || !categories.find(c => c.id === activeCatId)) setActiveCatId(categories[0]?.id ?? null)
  }, [categories, activeCatId])

  async function scanFile(file: File): Promise<MenuCategory[] | null> {
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = async ev => {
        const raw = (ev.target?.result as string).split(",")[1]
        const mime = file.type as string
        try {
          const res = await fetch("/api/menu-scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageBase64: raw, mediaType: mime }) })
          const data = await res.json()
          if (data.error) { resolve(null); return }
          resolve((data.categories ?? []).map((c: { name: string; items: { name: string; description: string; price: string }[] }) => ({
            id: uid(), name: c.name,
            items: (c.items ?? []).map((item: { name: string; description: string; price: string }) => ({ id: uid(), name: item.name, description: item.description ?? "", price: item.price ?? "" })),
          })))
        } catch { resolve(null) }
      }
      reader.readAsDataURL(file)
    })
  }

  async function handleScans(files: FileList) {
    setScanning(true)
    const accumulated = categories.map(c => ({ ...c, items: [...c.items] }))
    const fileArr = Array.from(files)
    let firstNewId: string | null = null
    for (let i = 0; i < fileArr.length; i++) {
      if (fileArr.length > 1) setScanProgress(`Photo ${i + 1}/${fileArr.length}...`)
      const newCats = await scanFile(fileArr[i])
      if (!newCats) continue
      for (const newCat of newCats) {
        const existing = accumulated.find(c => c.name.toLowerCase().trim() === newCat.name.toLowerCase().trim())
        if (existing) existing.items = [...existing.items, ...newCat.items]
        else { accumulated.push(newCat); if (!firstNewId) firstNewId = newCat.id }
      }
    }
    onChange(accumulated)
    if (firstNewId) setActiveCatId(firstNewId)
    setScanProgress("")
    setScanning(false)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, borderRadius: 16, border: `1.5px dashed ${t.border}`, cursor: scanning ? "default" : "pointer", background: t.surface, opacity: scanning ? 0.7 : 1 }}>
        {scanning ? (
          <>
            <div style={{ width: 16, height: 16, border: `2px solid ${t.muted}`, borderTopColor: t.accent, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            <span style={{ color: t.secondary, fontSize: 14, fontWeight: 500 }}>{scanProgress || "Analyse en cours..."}</span>
          </>
        ) : (
          <>
            <Camera size={18} style={{ color: t.accent }} />
            <span style={{ color: t.text, fontSize: 14, fontWeight: 600 }}>Scanner la carte</span>
            <span style={{ color: t.muted, fontSize: 13 }}>- 1 ou plusieurs photos</span>
          </>
        )}
        <input type="file" accept="image/*" multiple style={{ display: "none" }} disabled={scanning}
          onChange={e => { if (e.target.files?.length) handleScans(e.target.files); e.target.value = "" }} />
      </label>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
        {categories.map(cat => {
          const active = cat.id === activeCatId
          return (
            <button key={cat.id} onClick={() => setActiveCatId(cat.id)} style={{ flexShrink: 0, padding: "10px 22px", borderRadius: 50, border: "none", background: active ? t.accent : t.elevated, color: active ? t.btnText : t.secondary, fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
              {cat.name}
            </button>
          )
        })}
        <button onClick={() => { const cat = { id: uid(), name: "Nouvelle carte", items: [] }; onChange([...categories, cat]); setActiveCatId(cat.id) }}
          style={{ flexShrink: 0, padding: "10px 16px", borderRadius: 50, border: `1.5px dashed ${t.border}`, background: "transparent", color: t.muted, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
          <Plus size={13} /> Ajouter
        </button>
      </div>

      {activeCat && (
        <div style={{ background: t.surface, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${t.border}`, background: t.elevated }}>
            <input value={activeCat.name} onChange={e => onChange(categories.map(c => c.id === activeCat.id ? { ...c, name: e.target.value } : c))}
              style={{ flex: 1, background: "transparent", border: "none", color: t.text, fontWeight: 700, fontSize: 14, outline: "none" }} />
            <button onClick={() => onChange(categories.filter(c => c.id !== activeCat.id))}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", padding: 4 }}><Trash2 size={14} /></button>
          </div>
          {activeCat.items.map((item, ii) => {
            const ci = categories.findIndex(c => c.id === activeCat.id)
            return (
              <div key={item.id} style={{ borderBottom: `1px solid ${t.border}` }}>
                <div style={{ display: "flex", gap: 10, padding: "12px 16px", alignItems: "flex-start" }}>
                  <label style={{ width: 52, height: 52, borderRadius: 10, overflow: "hidden", flexShrink: 0, cursor: "pointer", background: t.elevated, display: "flex", alignItems: "center", justifyContent: "center", border: `1px dashed ${t.border}` }}>
                    {item.photo ? <img src={item.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Camera size={16} style={{ color: t.muted }} />}
                    <input type="file" accept="image/*" style={{ display: "none" }}
                      onChange={async e => { const f = e.target.files?.[0]; if (!f) return; const photo = await compressDish(f); onChange(categories.map((c, ci2) => ci2 === ci ? { ...c, items: c.items.map((it, ii2) => ii2 === ii ? { ...it, photo } : it) } : c)); e.target.value = "" }} />
                  </label>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input value={item.name} placeholder="Nom" onChange={e => onChange(categories.map((c, ci2) => ci2 === ci ? { ...c, items: c.items.map((it, ii2) => ii2 === ii ? { ...it, name: e.target.value } : it) } : c))}
                        style={{ flex: 1, background: t.elevated, border: "none", borderRadius: 8, padding: "6px 10px", color: t.text, fontSize: 14, fontWeight: 600, outline: "none" }} />
                      <input value={item.price} placeholder="Prix" onChange={e => onChange(categories.map((c, ci2) => ci2 === ci ? { ...c, items: c.items.map((it, ii2) => ii2 === ii ? { ...it, price: e.target.value } : it) } : c))}
                        style={{ width: 72, background: t.elevated, border: "none", borderRadius: 8, padding: "6px 10px", color: t.accent, fontSize: 14, fontWeight: 700, outline: "none", textAlign: "right" }} />
                    </div>
                    <input value={item.description} placeholder="Description" onChange={e => onChange(categories.map((c, ci2) => ci2 === ci ? { ...c, items: c.items.map((it, ii2) => ii2 === ii ? { ...it, description: e.target.value } : it) } : c))}
                      style={{ background: t.elevated, border: "none", borderRadius: 8, padding: "6px 10px", color: t.secondary, fontSize: 13, outline: "none" }} />
                  </div>
                  <button onClick={() => onChange(categories.map((c, ci2) => ci2 === ci ? { ...c, items: c.items.filter((_, ii2) => ii2 !== ii) } : c))}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", padding: 4, flexShrink: 0 }}><X size={14} /></button>
                </div>
              </div>
            )
          })}
          <button onClick={() => { const ci = categories.findIndex(c => c.id === activeCat.id); onChange(categories.map((c, ci2) => ci2 === ci ? { ...c, items: [...c.items, { id: uid(), name: "", description: "", price: "" }] } : c)) }}
            style={{ width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", color: t.accent, fontSize: 13, fontWeight: 600, textAlign: "left", display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} /> Ajouter un plat
          </button>
        </div>
      )}
    </div>
  )
}

// ── Section: Reviews ──────────────────────────────────────────────────────────

function ReviewCard({ r, t }: { r: ReviewData; t: ThemeConfig }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = (r.comment?.length ?? 0) > 200
  return (
    <div style={{
      flex: "0 0 85%", maxWidth: 360, scrollSnapAlign: "start",
      background: t.surface, borderRadius: 20, padding: 24,
      border: `1px solid ${t.border}`, position: "relative",
    }}>
      <svg width={32} height={32} viewBox="0 0 24 24" fill={t.border} style={{ position: "absolute", top: 18, right: 18, opacity: 0.5 }}>
        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
      </svg>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: `linear-gradient(135deg, ${t.accent}60, ${t.star}60)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: t.isDark ? "#fff" : "#111", fontWeight: 700, fontSize: 17, flexShrink: 0,
        }}>
          {r.reviewerName.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: t.text, fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{r.reviewerName}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Stars n={r.rating} color={t.star} size={12} />
            <span style={{ color: t.muted, fontSize: 12 }}>{ago(r.reviewPublishedAt)}</span>
          </div>
        </div>
      </div>
      {r.comment && (
        <div>
          <p style={{
            color: t.secondary, fontSize: 14, lineHeight: 1.65,
            ...((!expanded && isLong) ? { display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical" as const, overflow: "hidden" } : {}),
          }}>{r.comment}</p>
          {isLong && (
            <button onClick={() => setExpanded(e => !e)} style={{
              background: "none", border: "none", cursor: "pointer", padding: "6px 0 0",
              color: t.accent, fontSize: 13, fontWeight: 600,
            }}>
              {expanded ? "Réduire ▲" : "Lire plus ▼"}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ReviewsSection({ reviews, placeId, t, track }: { reviews: ReviewData[]; placeId: string | null; t: ThemeConfig; track: (e: string) => void }) {
  const url = placeId ? `https://search.google.com/local/writereview?placeid=${placeId}` : null
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollPct, setScrollPct] = useState(0)

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const max = el.scrollWidth - el.clientWidth
    setScrollPct(max > 0 ? el.scrollLeft / max : 0)
  }

  if (!reviews.length && !url) return null
  return (
    <div>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" onClick={() => track("cta_review")}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            width: "100%", padding: "18px 24px", borderRadius: 20, background: t.btn, color: t.btnText,
            fontWeight: 700, fontSize: 16, textDecoration: "none", letterSpacing: "-0.3px",
            marginBottom: 28, transition: "transform 0.2s, box-shadow 0.2s",
            boxShadow: `0 4px 24px ${t.glow}`,
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 32px ${t.glow}` }}
          onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = `0 4px 24px ${t.glow}` }}
        >
          <StarIcon size={18} fill={t.btnText} />
          Laisser un avis Google
          <ArrowRight size={16} />
        </a>
      )}

      {reviews.length > 0 && (
        <>
          <div ref={scrollRef} onScroll={onScroll} style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8, scrollSnapType: "x mandatory", scrollbarWidth: "none" }}>
            {reviews.map((r, i) => <ReviewCard key={i} r={r} t={t} />)}
          </div>
          {reviews.length > 1 && (
            <div style={{ display: "flex", gap: 5, justifyContent: "center", marginTop: 12 }}>
              {reviews.map((_, i) => {
                const active = Math.round(scrollPct * (reviews.length - 1)) === i
                return <div key={i} style={{ width: active ? 20 : 6, height: 6, borderRadius: 3, background: active ? t.accent : t.border, transition: "all 0.3s" }} />
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Section: Social ───────────────────────────────────────────────────────────

function SocialSection({ links, t, track }: { links: SocialLink[]; t: ThemeConfig; track: (e: string) => void }) {
  if (!links.some(l => l.url)) return null
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {links.filter(l => l.url).map((link) => (
        <a key={link.platform} href={link.url.startsWith("http") ? link.url : `https://${link.url}`}
          target="_blank" rel="noopener noreferrer" onClick={() => track(`cta_social_${link.platform}`)}
          style={{
            display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
            borderRadius: 16, background: t.surface, border: `1px solid ${t.border}`,
            textDecoration: "none", transition: "all 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.transform = "translateY(-1px)" }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.transform = "translateY(0)" }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 10, background: t.elevated, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <SocialIcon p={link.platform} color={SOCIALS[link.platform]?.color ?? t.text} size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: t.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{link.label || SOCIALS[link.platform]?.label}</p>
          </div>
          <ExternalLink size={14} style={{ color: t.muted, flexShrink: 0 }} />
        </a>
      ))}
    </div>
  )
}

// ── Section: Hours ────────────────────────────────────────────────────────────

function HoursSection({ schedule, t }: { schedule: Record<string, HourEntry>; t: ThemeConfig }) {
  const isOpen = (() => {
    const e = schedule[TODAY_KEY]; if (!e || e.closed) return false
    const [oh, om] = e.open.split(":").map(Number), [ch, cm] = e.close.split(":").map(Number)
    const m = new Date().getHours() * 60 + new Date().getMinutes()
    return m >= oh * 60 + om && m < ch * 60 + cm
  })()

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 14px", borderRadius: 50,
          background: isOpen ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
          border: `1px solid ${isOpen ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: isOpen ? "#22c55e" : "#ef4444" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: isOpen ? "#22c55e" : "#ef4444" }}>{isOpen ? "Ouvert" : "Fermé"}</span>
        </div>
      </div>
      <div style={{ borderRadius: 20, overflow: "hidden", background: t.surface, border: `1px solid ${t.border}` }}>
        {DAYS.map(([key, label], i) => {
          const e = schedule[key] ?? { open: "09:00", close: "22:00", closed: false }
          const isToday = key === TODAY_KEY
          return (
            <div key={key} style={{
              display: "flex", alignItems: "center", padding: "13px 20px",
              borderBottom: i < 6 ? `1px solid ${t.border}` : "none",
              background: isToday ? `${t.accent}08` : "transparent",
            }}>
              <span style={{ width: 90, fontSize: 14, fontWeight: isToday ? 700 : 400, color: isToday ? t.accent : t.text }}>{label}</span>
              {e.closed ? (
                <span style={{ color: t.muted, fontSize: 14 }}>Fermé</span>
              ) : (
                <span style={{ color: t.secondary, fontSize: 14, fontWeight: 500 }}>{e.open} - {e.close}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Section: Location ─────────────────────────────────────────────────────────

function LocationSection({ address, placeId, t, track }: { address: string; placeId: string | null; t: ThemeConfig; track: (e: string) => void }) {
  const mapsUrl = placeId ? `https://www.google.com/maps/place/?q=place_id:${placeId}` : address ? `https://maps.google.com/?q=${encodeURIComponent(address)}` : null
  return (
    <div style={{ borderRadius: 20, overflow: "hidden", background: t.surface, border: `1px solid ${t.border}` }}>
      <div style={{ padding: "20px 22px" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: `${t.accent}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <MapPin size={18} style={{ color: t.accent }} />
          </div>
          <p style={{ color: t.text, fontSize: 15, margin: "8px 0 0", lineHeight: 1.5, fontWeight: 500 }}>{address || "Adresse non renseignée"}</p>
        </div>
      </div>
      {mapsUrl && (
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" onClick={() => track("cta_maps")}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 22px", borderTop: `1px solid ${t.border}`, color: t.accent, fontSize: 14, fontWeight: 600, textDecoration: "none", transition: "background 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.background = t.elevated}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          Ouvrir dans Google Maps <ChevronRight size={16} />
        </a>
      )}
    </div>
  )
}

// ── Section: Photos ───────────────────────────────────────────────────────────

function PhotosSection({ images, t }: { images: PhotoItem[]; t: ThemeConfig }) {
  const [lb, setLb] = useState<string | null>(null)
  return (
    <div>
      {lb && (
        <div onClick={() => setLb(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20, cursor: "pointer",
        }}>
          <img src={lb} style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: 16, objectFit: "contain" }} />
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: images.length === 1 ? "1fr" : "1fr 1fr", gap: 8 }}>
        {images.map((img, i) => (
          <div key={i} style={{
            position: "relative", borderRadius: 18, overflow: "hidden",
            aspectRatio: images.length === 1 ? "16/9" : "1",
            gridColumn: i === 0 && images.length === 3 ? "1 / -1" : undefined,
          }}>
            <img src={img.dataUrl} alt="" onClick={() => setLb(img.dataUrl)}
              style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer", display: "block", transition: "transform 0.3s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Editable section wrappers ─────────────────────────────────────────────────

const SECTION_LABELS: Record<string, string> = { reviews: "Avis clients", menu: "Carte & Menu", social: "Réseaux sociaux", hours: "Horaires", location: "Adresse", photos: "Photos" }
const SECTION_ICONS: Record<string, React.ReactNode> = {
  reviews: <StarIcon size={14} />,
  menu: <Camera size={14} />,
  social: <ExternalLink size={14} />,
  hours: <Clock size={14} />,
  location: <MapPin size={14} />,
  photos: <Camera size={14} />,
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null
  const [data, setData]         = useState<PageData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState("")
  const [isEditing, setEditing] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [sections, setSections] = useState<Section[]>([])
  const [showStickyBar, setShowStickyBar] = useState(false)
  const tracked                 = useRef(false)

  // Live preview overrides — reçus via postMessage depuis /personnalisation
  const [preview, setPreview] = useState<Partial<PageData> | null>(null)

  const heroReveal  = useReveal(0)
  const ratingReveal = useReveal(120)

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === "REPUTIX_PREVIEW") {
        setPreview(e.data.overrides ?? null)
      } else if (e.data?.type === "REPUTIX_SECTIONS" && e.data.sections) {
        setSections(e.data.sections)
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [])

  useEffect(() => {
    const onScroll = () => setShowStickyBar(window.scrollY > 350)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    fetch(`/api/r/${slug}`).then(r => r.json()).then(d => {
      if (d.error) { setError(d.error); setLoading(false); return }
      setData(d)
      if (d.isOwner && searchParams?.get("edit") === "1") setEditing(true)
      const raw: Section[] = (d.pageConfig?.sections ?? []).sort((a: Section, b: Section) => a.order - b.order)
      const merged = raw.map((s: Section) => {
        if (s.type === "social" && !s.links?.length && d.socialLinks) {
          const links = Object.entries(d.socialLinks as Record<string,string>).filter(([,u]) => u).map(([p,u]) => ({ platform: p, url: u, label: SOCIALS[p]?.label ?? p }))
          return { ...s, links }
        }
        return s
      })
      setSections(merged)
      setLoading(false)
    }).catch(() => { setError("Page introuvable"); setLoading(false) })
  }, [slug])

  useEffect(() => {
    if (data && !tracked.current) {
      tracked.current = true
      fetch(`/api/r/${slug}/track`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "view" }) })
    }
  }, [data, slug])

  const track = useCallback((type: string) => {
    fetch(`/api/r/${slug}/track`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }) })
  }, [slug])

  function updateSection(id: string, patch: Partial<Section>) {
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }

  async function save() {
    setSaving(true)
    const config = { sections: sections.map((s, i) => ({ ...s, order: i })) }
    await fetch("/api/page", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pageConfig: config, reputationPageEnabled: true }) })
    setSaving(false)
    setEditing(false)
    setData(prev => prev ? { ...prev, pageConfig: config } : prev)
  }

  // Loading
  if (loading) return (
    <div style={{ minHeight: "100svh", background: "#09090b", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ width: 28, height: 28, border: "2.5px solid rgba(255,255,255,0.1)", borderTopColor: "rgba(255,255,255,0.7)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, fontWeight: 500 }}>Chargement...</p>
      </div>
      <style>{GLOBAL_CSS}</style>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: "100svh", background: "#09090b", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
      <div style={{ width: 48, height: 48, borderRadius: 16, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <X size={24} style={{ color: "rgba(255,255,255,0.2)" }} />
      </div>
      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>{error}</p>
      <style>{GLOBAL_CSS}</style>
    </div>
  )

  if (!data) return null

  // Merge preview overrides on top of fetched data
  const d: PageData = preview ? { ...data, ...preview } : data

  const t = resolveTheme(d)
  const rgb = hexToRgb(t.accent)
  const bookingUrl = d.bookingEnabled && d.bookingPageSlug ? `/book/${d.bookingPageSlug}` : null
  const reviewUrl  = d.placeId ? `https://search.google.com/local/writereview?placeid=${d.placeId}` : null

  const renderSectionContent = (section: Section) => {
    switch (section.type) {
      case "reviews":  return <ReviewsSection reviews={d.reviews} placeId={d.placeId} t={t} track={track} />
      case "social":   return <SocialSection links={section.links ?? []} t={t} track={track} />
      case "hours":    return isEditing
        ? <HoursSectionEdit schedule={section.schedule ?? {}} t={t} onChange={s => updateSection(section.id, { schedule: s })} />
        : <HoursSection schedule={section.schedule ?? {}} t={t} />
      case "location": return <LocationSection address={section.address ?? ""} placeId={d.placeId} t={t} track={track} />
      case "photos":   return isEditing
        ? <PhotosSectionEdit images={section.images ?? []} t={t} onChange={imgs => updateSection(section.id, { images: imgs })} />
        : <PhotosSection images={section.images ?? []} t={t} />
      case "menu":     return isEditing
        ? <MenuSectionEdit categories={section.categories ?? []} t={t} onChange={c => updateSection(section.id, { categories: c })} />
        : <MenuSection categories={section.categories ?? []} t={t} />
      default: return null
    }
  }

  return (
    <div style={{ minHeight: "100svh", background: t.bg, fontFamily: t.fontFamily, WebkitFontSmoothing: "antialiased" }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── Sticky CTA bar ── */}
      {!isEditing && (reviewUrl || bookingUrl) && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 40,
          background: t.isDark ? `${t.surface}ee` : `${t.surface}f0`,
          backdropFilter: "blur(20px) saturate(1.8)",
          borderBottom: `1px solid ${t.border}`,
          padding: "10px 20px", display: "flex", alignItems: "center", gap: 10,
          transform: showStickyBar ? "translateY(0)" : "translateY(-100%)",
          transition: "transform 0.3s ease",
        }}>
          {d.logoDataUrl ? (
            <img src={d.logoDataUrl} style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
          ) : null}
          <span style={{ color: t.text, fontWeight: 600, fontSize: 14, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.businessName}</span>
          {bookingUrl && (
            <a href={bookingUrl} style={{ padding: "8px 18px", borderRadius: 10, background: t.btn, color: t.btnText, fontSize: 13, fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <CalendarDays size={14} /> Réserver
            </a>
          )}
          {reviewUrl && (
            <a href={reviewUrl} target="_blank" rel="noopener noreferrer" onClick={() => track("cta_review")} style={{ padding: "8px 16px", borderRadius: 10, border: `1.5px solid ${t.border}`, background: "transparent", color: t.text, fontSize: 13, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <StarIcon size={13} fill={t.star} stroke={t.star} />
            </a>
          )}
        </div>
      )}

      {/* ── Edit mode bar ── */}
      {isEditing && (
        <div style={{
          position: "sticky", top: 0, zIndex: 50,
          background: t.isDark ? `${t.surface}ee` : `${t.surface}f2`,
          backdropFilter: "blur(20px) saturate(1.8)",
          borderBottom: `1px solid ${t.border}`, padding: "12px 20px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ color: t.text, fontWeight: 700, fontSize: 14, flex: 1 }}>Sections</span>
          <button onClick={() => setEditing(false)} style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 12, padding: "8px 16px", color: t.secondary, fontSize: 13, cursor: "pointer", fontWeight: 500 }}>Annuler</button>
          <button onClick={save} disabled={saving} style={{ background: t.btn, border: "none", borderRadius: 12, padding: "8px 20px", color: t.btnText, fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1, transition: "opacity 0.2s" }}>
            {saving ? "..." : "Sauvegarder"}
          </button>
        </div>
      )}

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "0 0 120px" }}>

        {/* ── Cover image hero ── */}
        {d.pageCoverDataUrl && (
          <div style={{ position: "relative", width: "100%", overflow: "hidden", ...(d.pageCoverHeight ? { height: d.pageCoverHeight } : { aspectRatio: "21/9" }), maxHeight: d.pageCoverHeight ?? 220, minHeight: 80 }}>
            <img src={d.pageCoverDataUrl} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} alt="" />
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.6) 100%)` }} />
            {/* Logo + name overlay at bottom */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 24px", display: "flex", alignItems: "flex-end", gap: 12 }}>
              {d.logoDataUrl && (
                <img src={d.logoDataUrl} style={{ width: 52, height: 52, borderRadius: 14, objectFit: "cover", border: "2px solid rgba(255,255,255,0.2)", flexShrink: 0 }} />
              )}
              <div>
                <p style={{ color: "#fff", fontWeight: 800, fontSize: 20, letterSpacing: "-0.4px", lineHeight: 1.2, textShadow: "0 1px 8px rgba(0,0,0,0.5)" }}>{d.businessName}</p>
                {d.pageTagline && <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 2, lineHeight: 1.4 }}>{d.pageTagline}</p>}
              </div>
            </div>
          </div>
        )}

        {/* ── Hero (no cover) ── */}
        {!d.pageCoverDataUrl && (
          <div style={{ position: "relative", overflow: "hidden", padding: "0 0 32px" }}>
            {/* Ambient glow bg */}
            <div style={{ position: "absolute", inset: 0, background: t.heroGradient, pointerEvents: "none" }} />
            <div style={{ position: "absolute", top: -80, left: "50%", transform: "translateX(-50%)", width: 320, height: 320, borderRadius: "50%", background: t.accent, opacity: t.isDark ? 0.06 : 0.04, filter: "blur(90px)", pointerEvents: "none" }} />

            <div ref={heroReveal.ref} style={{ ...heroReveal.style, textAlign: "center", padding: "64px 24px 0", position: "relative" }}>
              {/* Logo */}
              {d.logoDataUrl ? (
                <div style={{ display: "inline-block", marginBottom: 24, animation: "float 4s ease-in-out infinite" }}>
                  <img src={d.logoDataUrl} style={{
                    width: 96, height: 96, borderRadius: 26, objectFit: "cover", display: "block",
                    boxShadow: `0 12px 40px rgba(${rgb},0.3), 0 0 0 1px ${t.border}`,
                  }} />
                </div>
              ) : null}

              <h1 style={{ color: t.text, fontSize: "clamp(28px, 7vw, 38px)", fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.8px", lineHeight: 1.1 }}>
                {d.businessName}
              </h1>

              {d.pageTagline && (
                <p style={{ color: t.secondary, fontSize: 16, margin: "0 0 20px", lineHeight: 1.55, maxWidth: 380, marginLeft: "auto", marginRight: "auto" }}>
                  {d.pageTagline}
                </p>
              )}

              {/* Rating badge */}
              {d.rating > 0 && (
                <div ref={ratingReveal.ref} style={{
                  ...ratingReveal.style,
                  display: "inline-flex", alignItems: "center", gap: 10,
                  background: t.isDark ? `${t.surface}cc` : `${t.surface}ee`,
                  backdropFilter: "blur(12px)",
                  border: `1px solid ${t.border}`, borderRadius: 50,
                  padding: "10px 20px", marginTop: d.pageTagline ? 0 : 8,
                }}>
                  <Stars n={d.rating} color={t.star} size={15} />
                  <span style={{ color: t.text, fontWeight: 700, fontSize: 17, letterSpacing: "-0.3px" }}>{d.rating.toFixed(1)}</span>
                  <span style={{ width: 1, height: 14, background: t.border }} />
                  <span style={{ color: t.secondary, fontSize: 14, fontWeight: 500 }}>{d.reviewCount} avis</span>
                </div>
              )}

              {/* CTA buttons */}
              {(bookingUrl || reviewUrl) && (
                <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 28, flexWrap: "wrap", padding: "0 16px" }}>
                  {bookingUrl && (
                    <a href={bookingUrl} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "14px 28px", borderRadius: 16, background: t.btn, color: t.btnText,
                      fontWeight: 700, fontSize: 15, textDecoration: "none",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      boxShadow: `0 4px 24px ${t.glow}`,
                    }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 32px ${t.glow}` }}
                      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = `0 4px 24px ${t.glow}` }}
                    >
                      <CalendarDays size={17} /> Réserver
                    </a>
                  )}
                  {reviewUrl && (
                    <a href={reviewUrl} target="_blank" rel="noopener noreferrer" onClick={() => track("cta_review")} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "14px 28px", borderRadius: 16,
                      background: "transparent", border: `1.5px solid ${t.border}`, color: t.text,
                      fontWeight: 600, fontSize: 15, textDecoration: "none", transition: "all 0.2s",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.background = t.surface }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.background = "transparent" }}
                    >
                      <StarIcon size={16} fill={t.star} stroke={t.star} /> Avis
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rating bar (when cover is present) */}
        {d.pageCoverDataUrl && d.rating > 0 && (
          <div style={{ padding: "20px 24px 0", display: "flex", justifyContent: "center" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              background: t.isDark ? `${t.surface}cc` : `${t.surface}ee`,
              backdropFilter: "blur(12px)",
              border: `1px solid ${t.border}`, borderRadius: 50,
              padding: "10px 20px",
            }}>
              <Stars n={d.rating} color={t.star} size={15} />
              <span style={{ color: t.text, fontWeight: 700, fontSize: 17, letterSpacing: "-0.3px" }}>{d.rating.toFixed(1)}</span>
              <span style={{ width: 1, height: 14, background: t.border }} />
              <span style={{ color: t.secondary, fontSize: 14, fontWeight: 500 }}>{d.reviewCount} avis</span>
            </div>
          </div>
        )}

        {/* CTA row (when cover is present) */}
        {d.pageCoverDataUrl && (bookingUrl || reviewUrl) && (
          <div style={{ display: "flex", gap: 10, justifyContent: "center", padding: "20px 24px 0", flexWrap: "wrap" }}>
            {bookingUrl && (
              <a href={bookingUrl} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "14px 28px", borderRadius: 16, background: t.btn, color: t.btnText,
                fontWeight: 700, fontSize: 15, textDecoration: "none",
                transition: "transform 0.2s, box-shadow 0.2s",
                boxShadow: `0 4px 24px ${t.glow}`,
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 32px ${t.glow}` }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = `0 4px 24px ${t.glow}` }}
              >
                <CalendarDays size={17} /> Réserver
              </a>
            )}
            {reviewUrl && (
              <a href={reviewUrl} target="_blank" rel="noopener noreferrer" onClick={() => track("cta_review")} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "14px 28px", borderRadius: 16,
                background: "transparent", border: `1.5px solid ${t.border}`, color: t.text,
                fontWeight: 600, fontSize: 15, textDecoration: "none", transition: "all 0.2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.background = t.surface }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.background = "transparent" }}
              >
                <StarIcon size={16} fill={t.star} stroke={t.star} /> Avis
              </a>
            )}
          </div>
        )}

        {/* ── Description ── */}
        {d.pageDescription && !isEditing && (
          <div style={{ padding: "28px 24px 0" }}>
            <p style={{ color: t.secondary, fontSize: 15, lineHeight: 1.7, textAlign: "center" }}>{d.pageDescription}</p>
          </div>
        )}

        {/* ── Sections ── */}
        {isEditing ? (
          <div style={{ padding: "32px 20px 0", display: "flex", flexDirection: "column", gap: 32 }}>
            {sections.map((section) => {
              const content = renderSectionContent(section)
              if (!content) return null
              return (
                <div key={section.id}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "8px 14px",
                    background: t.surface, borderRadius: 12, border: `1px solid ${t.border}`,
                  }}>
                    <span style={{ color: t.accent, display: "flex" }}>{SECTION_ICONS[section.type]}</span>
                    <span style={{ fontSize: 13, color: t.text, fontWeight: 600, flex: 1 }}>{SECTION_LABELS[section.type] ?? section.type}</span>
                    <button onClick={() => updateSection(section.id, { enabled: !section.enabled })} style={{
                      fontSize: 11, padding: "4px 12px", borderRadius: 20, border: "none",
                      background: section.enabled ? t.accent : t.elevated,
                      color: section.enabled ? t.btnText : t.muted,
                      cursor: "pointer", fontWeight: 600, transition: "all 0.2s",
                    }}>
                      {section.enabled ? "Visible" : "Masqué"}
                    </button>
                  </div>
                  {section.enabled ? content : (
                    <div style={{ height: 44, borderRadius: 14, border: `1.5px dashed ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 12, color: t.muted }}>Section masquée</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div>
            {sections.filter(s => s.enabled).map((section, i) => {
              const content = renderSectionContent(section)
              if (!content) return null
              const showLabel = section.type !== "reviews"
              return (
                <RevealSection key={section.id} idx={i} section={section} showLabel={showLabel} t={t}>
                  {content}
                </RevealSection>
              )
            })}
          </div>
        )}

        {/* ── Bottom booking CTA ── */}
        {!isEditing && bookingUrl && (
          <div style={{ padding: "48px 20px 0" }}>
            <div style={{ background: t.surface, borderRadius: 24, padding: "36px 28px", border: `1px solid ${t.border}`, position: "relative", overflow: "hidden", textAlign: "center" }}>
              <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: t.accent, opacity: 0.06, filter: "blur(50px)", pointerEvents: "none" }} />
              <h2 style={{ color: t.text, fontSize: 22, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.3px" }}>Envie de nous rendre visite ?</h2>
              <p style={{ color: t.secondary, fontSize: 15, marginBottom: 24, lineHeight: 1.5 }}>Réservez directement en ligne en quelques clics.</p>
              <a href={bookingUrl} style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "16px 32px", borderRadius: 16, background: t.btn, color: t.btnText,
                fontWeight: 700, fontSize: 16, textDecoration: "none",
                transition: "transform 0.2s", boxShadow: `0 4px 24px ${t.glow}`,
              }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                <CalendarDays size={18} /> Réserver maintenant <ArrowRight size={16} />
              </a>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        {!isEditing && (
          <div style={{ textAlign: "center", padding: "48px 20px 0" }}>
            <p style={{ color: t.muted, fontSize: 12, opacity: 0.5, fontWeight: 500 }}>
              Propulsé par <span style={{ fontWeight: 700 }}>Reputix</span>
            </p>
          </div>
        )}
      </div>

      {/* ── Sticky bottom CTA bar (mobile, when top bar not shown) ── */}
      {!isEditing && !showStickyBar && (bookingUrl || reviewUrl) && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 39,
          background: t.isDark ? `${t.surface}f0` : `${t.surface}f8`,
          backdropFilter: "blur(20px) saturate(1.8)",
          borderTop: `1px solid ${t.border}`,
          padding: "12px 16px 16px",
          display: "flex", gap: 10,
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        }}>
          {bookingUrl && (
            <a href={bookingUrl} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "13px 16px", borderRadius: 14, background: t.btn, color: t.btnText,
              fontWeight: 700, fontSize: 15, textDecoration: "none",
            }}>
              <CalendarDays size={16} /> Réserver
            </a>
          )}
          {reviewUrl && (
            <a href={reviewUrl} target="_blank" rel="noopener noreferrer" onClick={() => track("cta_review")} style={{
              flex: bookingUrl ? "0 0 auto" : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "13px 20px", borderRadius: 14,
              background: "transparent", border: `1.5px solid ${t.border}`, color: t.text,
              fontWeight: 600, fontSize: 15, textDecoration: "none",
            }}>
              <StarIcon size={15} fill={t.star} stroke={t.star} /> Avis
            </a>
          )}
        </div>
      )}

      {/* ── Owner FABs ── */}
      {data.isOwner && !isEditing && !preview && (
        <div style={{ position: "fixed", bottom: 24, right: 20, display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
          {/* Sections edit button */}
          <button onClick={() => setEditing(true)} style={{
            background: t.btn, border: "none", borderRadius: 50,
            padding: "12px 20px", color: t.btnText, fontWeight: 700, fontSize: 14,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 7,
            boxShadow: `0 8px 32px rgba(0,0,0,0.4)`,
            transition: "transform 0.2s",
          }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
          >
            <Pencil size={15} /> Sections
          </button>
          {/* Full customization */}
          <a href="/personnalisation" style={{
            background: t.surface, border: `1px solid ${t.border}`, borderRadius: 50,
            padding: "10px 18px", color: t.secondary, fontWeight: 600, fontSize: 13,
            textDecoration: "none", display: "flex", alignItems: "center", gap: 6,
            boxShadow: `0 4px 16px rgba(0,0,0,0.25)`,
            transition: "transform 0.2s",
          }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
          >
            <Settings size={13} /> Personnaliser
          </a>
        </div>
      )}
    </div>
  )
}

// ── Reveal section wrapper ────────────────────────────────────────────────────

function RevealSection({ children, idx, section, showLabel, t }: { children: React.ReactNode; idx: number; section: Section; showLabel: boolean; t: ThemeConfig }) {
  const reveal = useReveal(idx * 80)
  return (
    <div ref={reveal.ref} style={{
      ...reveal.style,
      borderTop: idx > 0 ? `1px solid ${t.border}` : "none",
      padding: "32px 20px 0",
    }}>
      {showLabel && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <span style={{ color: t.accent, display: "flex" }}>{SECTION_ICONS[section.type]}</span>
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: t.muted }}>
            {SECTION_LABELS[section.type]}
          </p>
        </div>
      )}
      {children}
    </div>
  )
}

// ── Hours section (edit mode) ─────────────────────────────────────────────────

function HoursSectionEdit({ schedule, t, onChange }: { schedule: Record<string, HourEntry>; t: ThemeConfig; onChange: (s: Record<string, HourEntry>) => void }) {
  return (
    <div style={{ borderRadius: 20, overflow: "hidden", background: t.surface, border: `1px solid ${t.border}` }}>
      {DAYS.map(([key, label], i) => {
        const e = schedule[key] ?? { open: "09:00", close: "22:00", closed: false }
        return (
          <div key={key} style={{ display: "flex", alignItems: "center", padding: "13px 20px", borderBottom: i < 6 ? `1px solid ${t.border}` : "none" }}>
            <span style={{ width: 90, fontSize: 14, fontWeight: 400, color: t.text }}>{label}</span>
            {e.closed ? (
              <span style={{ color: t.muted, fontSize: 14, flex: 1 }}>Fermé</span>
            ) : (
              <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1 }}>
                <input type="time" value={e.open} onChange={ev => onChange({ ...schedule, [key]: { ...e, open: ev.target.value } })} style={{ background: t.elevated, border: "none", borderRadius: 8, padding: "4px 8px", color: t.text, fontSize: 13 }} />
                <span style={{ color: t.muted }}>-</span>
                <input type="time" value={e.close} onChange={ev => onChange({ ...schedule, [key]: { ...e, close: ev.target.value } })} style={{ background: t.elevated, border: "none", borderRadius: 8, padding: "4px 8px", color: t.text, fontSize: 13 }} />
              </div>
            )}
            <label style={{ marginLeft: "auto", display: "flex", gap: 6, fontSize: 12, color: t.muted, cursor: "pointer", alignItems: "center" }}>
              <input type="checkbox" checked={!!e.closed} onChange={ev => onChange({ ...schedule, [key]: { ...e, closed: ev.target.checked } })} />Fermé
            </label>
          </div>
        )
      })}
    </div>
  )
}

// ── Photos section (edit mode) ────────────────────────────────────────────────

function PhotosSectionEdit({ images, t, onChange }: { images: PhotoItem[]; t: ThemeConfig; onChange: (i: PhotoItem[]) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {images.map((img, i) => (
        <div key={i} style={{ position: "relative", borderRadius: 18, overflow: "hidden", aspectRatio: "1" }}>
          <img src={img.dataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          <button onClick={() => onChange(images.filter((_, j) => j !== i))}
            style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.7)", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", backdropFilter: "blur(4px)" }}>
            <X size={13} />
          </button>
        </div>
      ))}
      {images.length < 6 && (
        <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", aspectRatio: "1", borderRadius: 18, border: `2px dashed ${t.border}`, cursor: "pointer", gap: 6, background: t.surface }}>
          <Plus size={24} style={{ color: t.muted }} />
          <span style={{ fontSize: 13, color: t.muted }}>Ajouter</span>
          <input type="file" accept="image/*" style={{ display: "none" }} onChange={async e => {
            const file = e.target.files?.[0]; if (!file) return
            const dataUrl = await compressImage(file, 800)
            onChange([...images, { dataUrl, caption: "" }]); e.target.value = ""
          }} />
        </label>
      )}
    </div>
  )
}
