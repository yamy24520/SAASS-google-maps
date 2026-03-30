"use client"

import { use, useEffect, useRef, useState, useCallback } from "react"
import {
  Camera, ChevronRight, GripVertical, MapPin, Pencil, Plus, Save, Trash2, X,
  Star as StarIcon, Clock, ExternalLink, CalendarDays, ArrowRight
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
  businessId: string; businessName: string; rating: number; reviewCount: number
  placeId: string | null; reviews: ReviewData[]; logoDataUrl: string | null
  pageTheme: string; pageTagline: string | null
  pageConfig: { sections: Section[] }; socialLinks: Record<string, string>
  bookingEnabled: boolean; bookingPageSlug: string | null
  isOwner: boolean; reputationPageEnabled: boolean
}

// ── Themes ────────────────────────────────────────────────────────────────────

const THEMES = {
  dark:   { bg: "#09090b", surface: "#18181b", elevated: "#27272a", border: "rgba(255,255,255,0.07)", text: "#fafafa", secondary: "rgba(250,250,250,0.65)", muted: "rgba(250,250,250,0.35)", accent: "#e4e4e7", star: "#f59e0b", btn: "#fafafa", btnText: "#09090b", glow: "rgba(250,250,250,0.04)", gradient: "linear-gradient(135deg, #18181b 0%, #09090b 100%)", heroGradient: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.05) 0%, transparent 70%)" },
  light:  { bg: "#fafafa", surface: "#ffffff", elevated: "#f4f4f5", border: "rgba(0,0,0,0.06)", text: "#09090b", secondary: "rgba(9,9,11,0.65)", muted: "rgba(9,9,11,0.35)", accent: "#18181b", star: "#f59e0b", btn: "#18181b", btnText: "#fafafa", glow: "rgba(0,0,0,0.02)", gradient: "linear-gradient(135deg, #ffffff 0%, #f4f4f5 100%)", heroGradient: "radial-gradient(ellipse at 50% 0%, rgba(0,0,0,0.03) 0%, transparent 70%)" },
  warm:   { bg: "#0c0a09", surface: "#1c1917", elevated: "#292524", border: "rgba(251,191,36,0.1)", text: "#fef3c7", secondary: "rgba(254,243,199,0.65)", muted: "rgba(254,243,199,0.35)", accent: "#fbbf24", star: "#fbbf24", btn: "#fbbf24", btnText: "#0c0a09", glow: "rgba(251,191,36,0.06)", gradient: "linear-gradient(135deg, #1c1917 0%, #0c0a09 100%)", heroGradient: "radial-gradient(ellipse at 50% 0%, rgba(251,191,36,0.06) 0%, transparent 70%)" },
  ocean:  { bg: "#020617", surface: "#0f172a", elevated: "#1e293b", border: "rgba(56,189,248,0.1)", text: "#e0f2fe", secondary: "rgba(224,242,254,0.65)", muted: "rgba(224,242,254,0.35)", accent: "#38bdf8", star: "#f59e0b", btn: "#38bdf8", btnText: "#020617", glow: "rgba(56,189,248,0.06)", gradient: "linear-gradient(135deg, #0f172a 0%, #020617 100%)", heroGradient: "radial-gradient(ellipse at 50% 0%, rgba(56,189,248,0.08) 0%, transparent 70%)" },
  forest: { bg: "#052e16", surface: "#14532d", elevated: "#166534", border: "rgba(74,222,128,0.1)", text: "#dcfce7", secondary: "rgba(220,252,231,0.65)", muted: "rgba(220,252,231,0.35)", accent: "#4ade80", star: "#f59e0b", btn: "#4ade80", btnText: "#052e16", glow: "rgba(74,222,128,0.06)", gradient: "linear-gradient(135deg, #14532d 0%, #052e16 100%)", heroGradient: "radial-gradient(ellipse at 50% 0%, rgba(74,222,128,0.08) 0%, transparent 70%)" },
} as const
type ThemeKey = keyof typeof THEMES
type Theme = typeof THEMES[ThemeKey]

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
      {[1,2,3,4,5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= Math.round(n) ? color : "rgba(150,150,150,0.2)"}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
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

// ── Scroll Reveal Hook ───────────────────────────────────────────────────────

function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, style: { opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.6s ease, transform 0.6s ease" } as React.CSSProperties }
}

// ── CSS Keyframes ────────────────────────────────────────────────────────────

const GLOBAL_CSS = `
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes pulse-ring{0%{transform:scale(0.8);opacity:1}100%{transform:scale(2);opacity:0}}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
input[type=time]::-webkit-calendar-picker-indicator{filter:invert(1);opacity:0.5}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:4px}
`

// ── Section: Menu ─────────────────────────────────────────────────────────────

function MenuCategoryTabs({ categories, activeCatId, t, isEditing, onSelect, onAdd }: { categories: MenuCategory[]; activeCatId: string | null; t: Theme; isEditing: boolean; onSelect: (id: string) => void; onAdd?: () => void }) {
  if (!categories.length && !isEditing) return null
  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none", marginBottom: 20 }}>
      {categories.map(cat => {
        const active = cat.id === activeCatId
        return (
          <button key={cat.id} onClick={() => onSelect(cat.id)} style={{ flexShrink: 0, padding: "10px 22px", borderRadius: 50, border: "none", background: active ? t.accent : t.elevated, color: active ? t.btnText : t.secondary, fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s" }}>
            {cat.name}
          </button>
        )
      })}
      {isEditing && (
        <button onClick={onAdd} style={{ flexShrink: 0, padding: "10px 16px", borderRadius: 50, border: `1.5px dashed ${t.border}`, background: "transparent", color: t.muted, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
          <Plus size={13} /> Ajouter
        </button>
      )}
    </div>
  )
}

function MenuSection({ categories, t, isEditing, onChange }: { categories: MenuCategory[]; t: Theme; isEditing: boolean; onChange?: (c: MenuCategory[]) => void }) {
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
    onChange?.(accumulated)
    if (firstNewId) setActiveCatId(firstNewId)
    setScanProgress("")
    setScanning(false)
  }

  // Public view
  if (!isEditing) {
    if (!categories.length) return null
    return (
      <div>
        <MenuCategoryTabs categories={categories} activeCatId={activeCat?.id ?? null} t={t} isEditing={false} onSelect={setActiveCatId} />
        {activeCat && (
          <div style={{ borderRadius: 20, overflow: "hidden", background: t.surface, border: `1px solid ${t.border}` }}>
            {activeCat.items.map((item, i) => (
              <div key={item.id} style={{ display: "flex", gap: 14, padding: "16px 20px", borderBottom: i < activeCat.items.length - 1 ? `1px solid ${t.border}` : "none", alignItems: "flex-start" }}>
                {item.photo && <img src={item.photo} alt={item.name} style={{ width: 68, height: 68, borderRadius: 14, objectFit: "cover", flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <p style={{ color: t.text, fontWeight: 600, fontSize: 15, lineHeight: 1.35 }}>{item.name}</p>
                    {item.price && <span style={{ color: t.accent, fontWeight: 700, fontSize: 15, flexShrink: 0 }}>{item.price}</span>}
                  </div>
                  {item.description && <p style={{ color: t.secondary, fontSize: 13, margin: "4px 0 0", lineHeight: 1.45 }}>{item.description}</p>}
                </div>
              </div>
            ))}
            {activeCat.items.length === 0 && <p style={{ padding: 24, textAlign: "center", color: t.muted, fontSize: 14 }}>Aucun plat</p>}
          </div>
        )}
      </div>
    )
  }

  // Edit view
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
      <MenuCategoryTabs categories={categories} activeCatId={activeCat?.id ?? null} t={t} isEditing onSelect={setActiveCatId} onAdd={() => { const cat = { id: uid(), name: "Nouvelle carte", items: [] }; onChange?.([...categories, cat]); setActiveCatId(cat.id) }} />
      {activeCat && (
        <div style={{ background: t.surface, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${t.border}`, background: t.elevated }}>
            <input value={activeCat.name} onChange={e => onChange?.(categories.map(c => c.id === activeCat.id ? { ...c, name: e.target.value } : c))}
              style={{ flex: 1, background: "transparent", border: "none", color: t.text, fontWeight: 700, fontSize: 14, outline: "none" }} />
            <button onClick={() => onChange?.(categories.filter(c => c.id !== activeCat.id))}
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
                      onChange={async e => { const f = e.target.files?.[0]; if (!f) return; const photo = await compressDish(f); onChange?.(categories.map((c, ci2) => ci2 === ci ? { ...c, items: c.items.map((it, ii2) => ii2 === ii ? { ...it, photo } : it) } : c)); e.target.value = "" }} />
                  </label>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input value={item.name} placeholder="Nom" onChange={e => onChange?.(categories.map((c, ci2) => ci2 === ci ? { ...c, items: c.items.map((it, ii2) => ii2 === ii ? { ...it, name: e.target.value } : it) } : c))}
                        style={{ flex: 1, background: t.elevated, border: "none", borderRadius: 8, padding: "6px 10px", color: t.text, fontSize: 14, fontWeight: 600, outline: "none" }} />
                      <input value={item.price} placeholder="Prix" onChange={e => onChange?.(categories.map((c, ci2) => ci2 === ci ? { ...c, items: c.items.map((it, ii2) => ii2 === ii ? { ...it, price: e.target.value } : it) } : c))}
                        style={{ width: 72, background: t.elevated, border: "none", borderRadius: 8, padding: "6px 10px", color: t.accent, fontSize: 14, fontWeight: 700, outline: "none", textAlign: "right" }} />
                    </div>
                    <input value={item.description} placeholder="Description" onChange={e => onChange?.(categories.map((c, ci2) => ci2 === ci ? { ...c, items: c.items.map((it, ii2) => ii2 === ii ? { ...it, description: e.target.value } : it) } : c))}
                      style={{ background: t.elevated, border: "none", borderRadius: 8, padding: "6px 10px", color: t.secondary, fontSize: 13, outline: "none" }} />
                  </div>
                  <button onClick={() => onChange?.(categories.map((c, ci2) => ci2 === ci ? { ...c, items: c.items.filter((_, ii2) => ii2 !== ii) } : c))}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", padding: 4, flexShrink: 0 }}><X size={14} /></button>
                </div>
              </div>
            )
          })}
          <button onClick={() => { const ci = categories.findIndex(c => c.id === activeCat.id); onChange?.(categories.map((c, ci2) => ci2 === ci ? { ...c, items: [...c.items, { id: uid(), name: "", description: "", price: "" }] } : c)) }}
            style={{ width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", color: t.accent, fontSize: 13, fontWeight: 600, textAlign: "left", display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} /> Ajouter un plat
          </button>
        </div>
      )}
    </div>
  )
}

// ── Section: Reviews ──────────────────────────────────────────────────────────

function ReviewsSection({ reviews, placeId, t, track }: { reviews: ReviewData[]; placeId: string | null; t: Theme; track: (e: string) => void }) {
  const url = placeId ? `https://search.google.com/local/writereview?placeid=${placeId}` : null
  if (!reviews.length && !url) return null
  return (
    <div>
      {/* Review CTA */}
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

      {/* Scrollable review cards */}
      {reviews.length > 0 && (
        <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8, scrollSnapType: "x mandatory", scrollbarWidth: "none" }}>
          {reviews.map((r, i) => (
            <div key={i} style={{
              flex: "0 0 85%", maxWidth: 360, scrollSnapAlign: "start",
              background: t.surface, borderRadius: 20, padding: 24,
              border: `1px solid ${t.border}`, position: "relative",
            }}>
              {/* Quote mark */}
              <svg width={32} height={32} viewBox="0 0 24 24" fill={t.border} style={{ position: "absolute", top: 18, right: 18, opacity: 0.5 }}>
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
              </svg>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${t.accent}60, ${t.star}60)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: t.text, fontWeight: 700, fontSize: 17, flexShrink: 0,
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
                <p style={{
                  color: t.secondary, fontSize: 14, lineHeight: 1.65,
                  display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>{r.comment}</p>
              )}
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

  // Public: grid of social buttons
  if (!isEditing) {
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

  // Edit: list with inputs
  return (
    <div style={{ background: t.surface, borderRadius: 16, overflow: "hidden" }}>
      {links.map((link, i, arr) => (
        <div key={link.platform} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < arr.length - 1 ? `1px solid ${t.border}` : "none" }}>
          <SocialIcon p={link.platform} color={SOCIALS[link.platform]?.color ?? t.text} size={16} />
          <span style={{ color: t.text, fontSize: 13, fontWeight: 500, flex: "0 0 80px" }}>{SOCIALS[link.platform]?.label ?? link.platform}</span>
          <input value={link.url} onChange={e => onChange?.(links.map((l, j) => j === i ? { ...l, url: e.target.value } : l))}
            placeholder="https://..." style={{ flex: 1, background: t.elevated, border: "none", borderRadius: 8, padding: "7px 10px", color: t.text, fontSize: 13, outline: "none" }} />
          <button onClick={() => onChange?.(links.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", padding: 4 }}><Trash2 size={14}/></button>
        </div>
      ))}
      <div style={{ padding: "10px 14px", borderTop: links.length ? `1px solid ${t.border}` : "none" }}>
        <select onChange={e => { const p = e.target.value; if (!p || links.find(l => l.platform === p)) return; onChange?.([...links, { platform: p, url: "", label: SOCIALS[p]?.label ?? p }]); e.target.value = "" }} defaultValue=""
          style={{ width: "100%", background: t.elevated, border: "none", borderRadius: 8, padding: "8px 12px", color: t.muted, fontSize: 13, cursor: "pointer" }}>
          <option value="">+ Ajouter un reseau...</option>
          {Object.keys(SOCIALS).filter(p => !links.find(l => l.platform === p)).map(p => <option key={p} value={p}>{SOCIALS[p].label}</option>)}
        </select>
      </div>
    </div>
  )
}

// ── Section: Hours ────────────────────────────────────────────────────────────

function HoursSection({ schedule, t, isEditing, onChange }: { schedule: Record<string, HourEntry>; t: Theme; isEditing: boolean; onChange?: (s: Record<string, HourEntry>) => void }) {
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
          <span style={{ fontSize: 13, fontWeight: 600, color: isOpen ? "#22c55e" : "#ef4444" }}>{isOpen ? "Ouvert" : "Ferme"}</span>
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
                <span style={{ color: t.muted, fontSize: 14 }}>Ferme</span>
              ) : isEditing ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="time" value={e.open} onChange={ev => onChange?.({ ...schedule, [key]: { ...e, open: ev.target.value } })} style={{ background: t.elevated, border: "none", borderRadius: 8, padding: "4px 8px", color: t.text, fontSize: 13 }} />
                  <span style={{ color: t.muted }}>-</span>
                  <input type="time" value={e.close} onChange={ev => onChange?.({ ...schedule, [key]: { ...e, close: ev.target.value } })} style={{ background: t.elevated, border: "none", borderRadius: 8, padding: "4px 8px", color: t.text, fontSize: 13 }} />
                </div>
              ) : (
                <span style={{ color: t.secondary, fontSize: 14, fontWeight: 500 }}>{e.open} - {e.close}</span>
              )}
              {isEditing && <label style={{ marginLeft: "auto", display: "flex", gap: 6, fontSize: 12, color: t.muted, cursor: "pointer", alignItems: "center" }}><input type="checkbox" checked={!!e.closed} onChange={ev => onChange?.({ ...schedule, [key]: { ...e, closed: ev.target.checked } })} />Ferme</label>}
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
    <div style={{ borderRadius: 20, overflow: "hidden", background: t.surface, border: `1px solid ${t.border}` }}>
      <div style={{ padding: "20px 22px" }}>
        {isEditing ? (
          <input value={address} onChange={e => onChange?.(e.target.value)} placeholder="12 Rue de la Paix, 75002 Paris"
            style={{ width: "100%", background: t.elevated, border: "none", borderRadius: 10, padding: "10px 14px", color: t.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        ) : (
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${t.accent}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <MapPin size={18} style={{ color: t.accent }} />
            </div>
            <p style={{ color: t.text, fontSize: 15, margin: "8px 0 0", lineHeight: 1.5, fontWeight: 500 }}>{address || "Adresse non renseignee"}</p>
          </div>
        )}
      </div>
      {mapsUrl && !isEditing && (
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

function PhotosSection({ images, t, isEditing, onChange }: { images: PhotoItem[]; t: Theme; isEditing: boolean; onChange?: (i: PhotoItem[]) => void }) {
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
            <img src={img.dataUrl} alt="" onClick={() => !isEditing && setLb(img.dataUrl)}
              style={{ width: "100%", height: "100%", objectFit: "cover", cursor: isEditing ? "default" : "pointer", display: "block", transition: "transform 0.3s" }}
              onMouseEnter={e => { if (!isEditing) e.currentTarget.style.transform = "scale(1.03)" }}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"} />
            {isEditing && (
              <button onClick={() => onChange?.(images.filter((_, j) => j !== i))}
                style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.7)", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", backdropFilter: "blur(4px)" }}>
                <X size={13} />
              </button>
            )}
          </div>
        ))}
        {isEditing && images.length < 6 && (
          <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", aspectRatio: "1", borderRadius: 18, border: `2px dashed ${t.border}`, cursor: "pointer", gap: 6, background: t.surface, transition: "border-color 0.2s" }}>
            <Plus size={24} style={{ color: t.muted }} />
            <span style={{ fontSize: 13, color: t.muted }}>Ajouter</span>
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={async e => {
              const file = e.target.files?.[0]; if (!file) return
              const dataUrl = await compressImage(file, 800)
              onChange?.([...images, { dataUrl, caption: "" }]); e.target.value = ""
            }} />
          </label>
        )}
      </div>
    </div>
  )
}

// ── Edit wrapper ──────────────────────────────────────────────────────────────

const SECTION_LABELS: Record<string, string> = { reviews: "Avis clients", menu: "Carte & Menu", social: "Reseaux sociaux", hours: "Horaires", location: "Adresse", photos: "Photos" }
const SECTION_ICONS: Record<string, React.ReactNode> = {
  reviews: <StarIcon size={14} />,
  menu: <Camera size={14} />,
  social: <ExternalLink size={14} />,
  hours: <Clock size={14} />,
  location: <MapPin size={14} />,
  photos: <Camera size={14} />,
}

function EditWrapper({ section, t, onToggle, dragIdx, myIdx, onDragStart, onDrop, children }: { section: Section; t: Theme; onToggle: () => void; dragIdx: number | null; myIdx: number; onDragStart: () => void; onDrop: () => void; children: React.ReactNode }) {
  return (
    <div draggable onDragStart={onDragStart} onDragOver={e => e.preventDefault()} onDrop={onDrop}
      style={{ opacity: dragIdx === myIdx ? 0.3 : 1, transition: "opacity 0.15s" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "8px 14px",
        background: t.surface, borderRadius: 12, border: `1px solid ${t.border}`,
      }}>
        <GripVertical size={14} style={{ color: t.muted, cursor: "grab" }} />
        <span style={{ color: t.accent, display: "flex" }}>{SECTION_ICONS[section.type]}</span>
        <span style={{ fontSize: 13, color: t.text, fontWeight: 600, flex: 1 }}>{SECTION_LABELS[section.type] ?? section.type}</span>
        <button onClick={onToggle} style={{
          fontSize: 11, padding: "4px 12px", borderRadius: 20, border: "none",
          background: section.enabled ? t.accent : t.elevated,
          color: section.enabled ? t.btnText : t.muted,
          cursor: "pointer", fontWeight: 600, transition: "all 0.2s",
        }}>
          {section.enabled ? "Visible" : "Masque"}
        </button>
      </div>
      {section.enabled ? children : (
        <div style={{ height: 44, borderRadius: 14, border: `1.5px dashed ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 12, color: t.muted }}>Section masquee</span>
        </div>
      )}
    </div>
  )
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
  const [logo, setLogo]         = useState<string | null>(null)
  const [tagline, setTagline]   = useState<string | null>(null)
  const [theme, setTheme]       = useState<string>("dark")
  const [dragIdx, setDragIdx]   = useState<number | null>(null)
  const tracked                 = useRef(false)
  const [showStickyBar, setShowStickyBar] = useState(false)
  const heroRef                 = useRef<HTMLDivElement>(null)

  // Reveal hooks for each section
  const heroReveal = useReveal()
  const ratingReveal = useReveal()

  // Sticky CTA bar on scroll
  useEffect(() => {
    const onScroll = () => setShowStickyBar(window.scrollY > 400)
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
      setLogo(d.logoDataUrl)
      setTagline(d.pageTagline)
      setTheme(d.pageTheme ?? "dark")
      setLoading(false)
    }).catch(() => { setError("Page introuvable"); setLoading(false) })
  }, [slug])

  useEffect(() => {
    if (data && !tracked.current) { tracked.current = true; fetch(`/api/r/${slug}/track`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "view" }) }) }
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

  // Loading state
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

  const t: Theme = (THEMES as unknown as Record<string, Theme>)[theme] ?? THEMES.dark
  const bookingUrl = data.bookingEnabled && data.bookingPageSlug ? `/book/${data.bookingPageSlug}` : null
  const reviewUrl = data.placeId ? `https://search.google.com/local/writereview?placeid=${data.placeId}` : null

  const renderSection = (section: Section) => {
    switch (section.type) {
      case "reviews":  return <ReviewsSection reviews={data.reviews} placeId={data.placeId} t={t} track={track} />
      case "social":   return <SocialSection links={section.links ?? []} t={t} track={track} isEditing={isEditing} onChange={l => updateSection(section.id, { links: l })} />
      case "hours":    return <HoursSection schedule={section.schedule ?? {}} t={t} isEditing={isEditing} onChange={s => updateSection(section.id, { schedule: s })} />
      case "location": return <LocationSection address={section.address ?? ""} placeId={data.placeId} t={t} isEditing={isEditing} onChange={a => updateSection(section.id, { address: a })} track={track} />
      case "photos":   return <PhotosSection images={section.images ?? []} t={t} isEditing={isEditing} onChange={imgs => updateSection(section.id, { images: imgs })} />
      case "menu":     return <MenuSection categories={section.categories ?? []} t={t} isEditing={isEditing} onChange={c => updateSection(section.id, { categories: c })} />
      default: return null
    }
  }

  return (
    <div style={{ minHeight: "100svh", background: t.bg, fontFamily: "-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',sans-serif", WebkitFontSmoothing: "antialiased" }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── Edit bar ── */}
      {isEditing && (
        <div style={{
          position: "sticky", top: 0, zIndex: 50,
          background: `${t.surface}ee`, backdropFilter: "blur(20px) saturate(1.8)",
          borderBottom: `1px solid ${t.border}`, padding: "12px 20px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ color: t.text, fontWeight: 700, fontSize: 14, flex: 1 }}>Mode edition</span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {(Object.keys(THEMES) as ThemeKey[]).map(k => (
              <button key={k} onClick={() => setTheme(k)} style={{
                width: 20, height: 20, borderRadius: "50%", background: THEMES[k].bg,
                border: theme === k ? `2.5px solid ${t.text}` : `2px solid ${t.border}`,
                cursor: "pointer", outline: "none", transition: "all 0.15s",
              }} />
            ))}
          </div>
          <button onClick={() => setEditing(false)} style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 12, padding: "8px 16px", color: t.secondary, fontSize: 13, cursor: "pointer", fontWeight: 500 }}>Annuler</button>
          <button onClick={save} disabled={saving} style={{ background: t.btn, border: "none", borderRadius: 12, padding: "8px 20px", color: t.btnText, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, opacity: saving ? 0.6 : 1, transition: "opacity 0.2s" }}>
            <Save size={14} />{saving ? "..." : "Sauvegarder"}
          </button>
        </div>
      )}

      {/* ── Sticky CTA bar (appears on scroll) ── */}
      {!isEditing && (reviewUrl || bookingUrl) && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 40,
          background: `${t.surface}ee`, backdropFilter: "blur(20px) saturate(1.8)",
          borderBottom: `1px solid ${t.border}`,
          padding: "10px 20px", display: "flex", alignItems: "center", gap: 10,
          transform: showStickyBar ? "translateY(0)" : "translateY(-100%)",
          transition: "transform 0.3s ease",
        }}>
          {logo ? (
            <img src={logo} style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover" }} />
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: 8, background: t.elevated, display: "flex", alignItems: "center", justifyContent: "center", color: t.text, fontWeight: 700, fontSize: 14 }}>
              {data.businessName.charAt(0)}
            </div>
          )}
          <span style={{ color: t.text, fontWeight: 600, fontSize: 14, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.businessName}</span>
          {bookingUrl && (
            <a href={bookingUrl} style={{
              padding: "8px 18px", borderRadius: 10, background: t.btn, color: t.btnText,
              fontSize: 13, fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: 6,
            }}>
              <CalendarDays size={14} /> Reserver
            </a>
          )}
          {reviewUrl && (
            <a href={reviewUrl} target="_blank" rel="noopener noreferrer" onClick={() => track("cta_review")} style={{
              padding: "8px 18px", borderRadius: 10, border: `1.5px solid ${t.border}`,
              background: "transparent", color: t.text,
              fontSize: 13, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 6,
            }}>
              <StarIcon size={13} fill={t.star} stroke={t.star} /> Avis
            </a>
          )}
        </div>
      )}

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "0 0 120px" }}>

        {/* ── Hero ── */}
        <div ref={heroRef} style={{ padding: "0 0 40px", position: "relative", overflow: "hidden" }}>
          {/* Background glow */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 300, background: t.heroGradient, pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)", width: 300, height: 300, borderRadius: "50%", background: t.accent, opacity: 0.04, filter: "blur(80px)", pointerEvents: "none" }} />

          <div ref={heroReveal.ref} style={{ ...heroReveal.style, textAlign: "center", padding: "60px 24px 0", position: "relative" }}>
            {/* Logo */}
            {isEditing ? (
              <label style={{ cursor: "pointer", display: "inline-block", marginBottom: 24, position: "relative" }}>
                {logo ? (
                  <img src={logo} style={{ width: 96, height: 96, borderRadius: 26, objectFit: "cover", display: "block", boxShadow: `0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px ${t.border}` }} />
                ) : (
                  <div style={{ width: 96, height: 96, borderRadius: 26, background: t.elevated, border: `2px dashed ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: t.muted, fontSize: 36, fontWeight: 800 }}>
                    {data.businessName.charAt(0)}
                  </div>
                )}
                <div style={{ position: "absolute", bottom: -4, right: -4, width: 28, height: 28, borderRadius: "50%", background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
                  <Pencil size={12} style={{ color: t.btnText }} />
                </div>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={async e => {
                  const file = e.target.files?.[0]; if (!file) return; setLogo(await compressImage(file, 256)); e.target.value = ""
                }} />
              </label>
            ) : logo ? (
              <div style={{ display: "inline-block", marginBottom: 24, position: "relative" }}>
                <img src={logo} style={{ width: 96, height: 96, borderRadius: 26, objectFit: "cover", display: "block", boxShadow: `0 12px 40px rgba(0,0,0,0.35), 0 0 0 1px ${t.border}` }} />
              </div>
            ) : (
              <div style={{
                width: 96, height: 96, borderRadius: 26,
                background: `linear-gradient(135deg, ${t.accent}50, ${t.star}50)`,
                border: `1px solid ${t.border}`,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                color: t.text, fontSize: 40, fontWeight: 800, marginBottom: 24,
                boxShadow: `0 12px 40px rgba(0,0,0,0.35)`,
              }}>
                {data.businessName.charAt(0)}
              </div>
            )}

            {/* Business name */}
            <h1 style={{
              color: t.text, fontSize: "clamp(28px, 7vw, 38px)", fontWeight: 800,
              margin: "0 0 12px", letterSpacing: "-0.8px", lineHeight: 1.1,
            }}>
              {data.businessName}
            </h1>

            {/* Tagline */}
            {isEditing ? (
              <input value={tagline ?? ""} onChange={e => setTagline(e.target.value || null)} placeholder="Ajoutez une accroche..."
                style={{ textAlign: "center", background: t.elevated, border: `1px solid ${t.border}`, borderRadius: 12, padding: "10px 18px", color: t.secondary, fontSize: 15, outline: "none", width: "calc(100% - 40px)", marginBottom: 20 }} />
            ) : tagline ? (
              <p style={{ color: t.secondary, fontSize: 16, margin: "0 0 20px", lineHeight: 1.55, maxWidth: 380, marginLeft: "auto", marginRight: "auto" }}>{tagline}</p>
            ) : null}

            {/* Rating badge */}
            {data.rating > 0 && (
              <div ref={ratingReveal.ref} style={{
                ...ratingReveal.style,
                display: "inline-flex", alignItems: "center", gap: 10,
                background: `${t.surface}cc`, backdropFilter: "blur(12px)",
                border: `1px solid ${t.border}`, borderRadius: 50,
                padding: "10px 20px", marginTop: tagline || isEditing ? 0 : 8,
              }}>
                <Stars n={data.rating} color={t.star} size={15} />
                <span style={{ color: t.text, fontWeight: 700, fontSize: 17, letterSpacing: "-0.3px" }}>{data.rating.toFixed(1)}</span>
                <span style={{ width: 1, height: 14, background: t.border }} />
                <span style={{ color: t.secondary, fontSize: 14, fontWeight: 500 }}>{data.reviewCount} avis</span>
              </div>
            )}

            {/* CTA Buttons */}
            {!isEditing && (bookingUrl || reviewUrl) && (
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 28, flexWrap: "wrap", padding: "0 16px" }}>
                {bookingUrl && (
                  <a href={bookingUrl} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "14px 28px", borderRadius: 16, background: t.btn, color: t.btnText,
                    fontWeight: 700, fontSize: 15, textDecoration: "none", letterSpacing: "-0.2px",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    boxShadow: `0 4px 24px ${t.glow}`,
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 32px ${t.glow}` }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = `0 4px 24px ${t.glow}` }}
                  >
                    <CalendarDays size={17} /> Reserver
                  </a>
                )}
                {reviewUrl && (
                  <a href={reviewUrl} target="_blank" rel="noopener noreferrer" onClick={() => track("cta_review")} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "14px 28px", borderRadius: 16,
                    background: "transparent", border: `1.5px solid ${t.border}`, color: t.text,
                    fontWeight: 600, fontSize: 15, textDecoration: "none",
                    transition: "all 0.2s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.background = t.surface }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.background = "transparent" }}
                  >
                    <StarIcon size={16} fill={t.star} stroke={t.star} /> Laisser un avis
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Sections ── */}
        {isEditing ? (
          <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 32 }}>
            {sections.map((section, i) => {
              const content = renderSection(section)
              if (!content) return null
              return (
                <EditWrapper key={section.id} section={section} t={t} onToggle={() => updateSection(section.id, { enabled: !section.enabled })} dragIdx={dragIdx} myIdx={i} onDragStart={() => setDragIdx(i)} onDrop={() => drop(i)}>
                  {content}
                </EditWrapper>
              )
            })}
          </div>
        ) : (
          <div>
            {sections.filter(s => s.enabled).map((section, i) => {
              const content = renderSection(section)
              if (!content) return null
              const showLabel = section.type !== "reviews"
              return <RevealSection key={section.id} idx={i} section={section} showLabel={showLabel} t={t}>{content}</RevealSection>
            })}
          </div>
        )}

        {/* ── Bottom CTA ── */}
        {!isEditing && bookingUrl && (
          <div style={{ padding: "48px 20px 0", textAlign: "center" }}>
            <div style={{ background: t.surface, borderRadius: 24, padding: "36px 28px", border: `1px solid ${t.border}`, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -40, right: -40, width: 120, height: 120, borderRadius: "50%", background: t.accent, opacity: 0.05, filter: "blur(40px)" }} />
              <h2 style={{ color: t.text, fontSize: 22, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.3px" }}>Envie de nous rendre visite ?</h2>
              <p style={{ color: t.secondary, fontSize: 15, marginBottom: 24, lineHeight: 1.5 }}>Reservez directement en ligne en quelques clics.</p>
              <a href={bookingUrl} style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "16px 32px", borderRadius: 16, background: t.btn, color: t.btnText,
                fontWeight: 700, fontSize: 16, textDecoration: "none",
                transition: "transform 0.2s", boxShadow: `0 4px 24px ${t.glow}`,
              }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                <CalendarDays size={18} /> Reserver maintenant <ArrowRight size={16} />
              </a>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        {!isEditing && (
          <div style={{ textAlign: "center", padding: "48px 20px 0" }}>
            <p style={{ color: t.muted, fontSize: 12, opacity: 0.5, fontWeight: 500 }}>
              Propulse par <span style={{ fontWeight: 700 }}>Reputix</span>
            </p>
          </div>
        )}
      </div>

      {/* ── Edit FAB ── */}
      {data.isOwner && !isEditing && (
        <button onClick={() => setEditing(true)} style={{
          position: "fixed", bottom: 24, right: 20,
          background: t.btn, border: "none", borderRadius: 50,
          padding: "14px 24px", color: t.btnText, fontWeight: 700, fontSize: 15,
          cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
          boxShadow: `0 8px 32px rgba(0,0,0,0.5)`, letterSpacing: "-0.2px",
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.6)" }}
          onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.5)" }}
        >
          <Pencil size={16} /> Modifier
        </button>
      )}
    </div>
  )
}

// ── Reveal section wrapper ───────────────────────────────────────────────────

function RevealSection({ children, idx, section, showLabel, t }: { children: React.ReactNode; idx: number; section: Section; showLabel: boolean; t: Theme }) {
  const reveal = useReveal()
  return (
    <div ref={reveal.ref} style={{
      ...reveal.style,
      transitionDelay: `${idx * 80}ms`,
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
