"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import {
  Save, Loader2, Monitor, Smartphone, RefreshCw, Upload, X, ExternalLink,
  GripVertical, ChevronDown, ChevronUp, Clock, Type, FileText, Tag, ListOrdered,
  Image as ImageIcon, Camera, MapPin, Star, Globe, LayoutGrid, Eye, EyeOff,
} from "lucide-react"
import { toast } from "@/components/ui/toaster"

interface PreviewState {
  pageTheme: string
  pageStyle: string
  pageAccentColor: string | null
  pageTagline: string | null
  logoDataUrl: string | null
  pageCoverDataUrl: string | null
  pageDescription: string | null
  pageLegalText: string | null
  pageLabels: Record<string, string> | null
  pageServiceOrder: string[] | null
  pageShowHours: boolean
  businessName: string
}

interface RepSection {
  id: string
  type: string
  enabled: boolean
  order: number
  links?: { platform: string; url: string; label: string }[]
  schedule?: Record<string, { open: string; close: string; closed: boolean }>
  address?: string
  images?: { dataUrl: string; caption: string }[]
  categories?: { id: string; name: string; items: { id: string; name: string; description: string; price: string; photo?: string }[] }[]
}

interface ServiceItem { id: string; name: string }

const STYLES = [
  {
    key: "modern",
    label: "Modern",
    desc: "Épuré, animations douces",
    preview: { bg: "#f5f5fa", sidebar: "#ffffff", btn: "#6366f1", card: "#ffffff" },
  },
  {
    key: "minimal",
    label: "Minimal",
    desc: "Sobre, typographie pure",
    preview: { bg: "#ffffff", sidebar: "#fafafa", btn: "#111111", card: "#ffffff" },
  },
  {
    key: "future",
    label: "Future",
    desc: "Néon, glow, dark total",
    preview: { bg: "#04040f", sidebar: "#07071a", btn: "#7c50ff", card: "#0a0a20" },
  },
  {
    key: "luxury",
    label: "Luxury",
    desc: "Sombre, doré, prestige",
    preview: { bg: "#0a0800", sidebar: "#100e00", btn: "#c8a03c", card: "#100e00" },
  },
]

const PRESET_COLORS = ["#6366f1","#0ea5e9","#10b981","#f59e0b","#ef4444","#ec4899","#8b5cf6","#14b8a6","#f97316","#ffffff","#c8a03c","#e8a020"]

// Legacy themes kept for compat
const THEMES = [
  { key: "default", label: "Standard", primary: "#6366f1", pageBg: "#f5f5fa", dark: false },
  { key: "hello_kitty", label: "Hello Kitty", primary: "#f0238c", pageBg: "#fff0f7", dark: false },
  { key: "barber", label: "Barber Shop", primary: "#e8a020", pageBg: "#080c14", dark: true },
  { key: "manga", label: "Manga", primary: "#e81818", pageBg: "#fafafa", dark: false },
]

const DEFAULT_LABELS: Record<string, string> = {
  service:  "Quelle prestation ?",
  staff:    "Avec qui ?",
  staffSub: "Choisissez votre prestataire",
  datetime: "Date & heure",
  form:     "Coordonnées",
}

const SECTIONS = [
  { id: "theme",       label: "Theme",       icon: Tag },
  { id: "colors",      label: "Couleurs",    icon: Tag },
  { id: "identity",    label: "Identite",    icon: Type },
  { id: "cover",       label: "Banniere",    icon: ImageIcon },
  { id: "labels",      label: "Labels",      icon: Type },
  { id: "services",    label: "Services",    icon: ListOrdered },
  { id: "hours",       label: "Horaires",    icon: Clock },
  { id: "legal",       label: "Mentions",    icon: FileText },
] as const

const DEFAULT_REP_SECTIONS: RepSection[] = [
  { id: "reviews",  type: "reviews",  enabled: true,  order: 0 },
  { id: "menu",     type: "menu",     enabled: false, order: 1, categories: [] },
  { id: "social",   type: "social",   enabled: true,  order: 2, links: [] },
  { id: "hours",    type: "hours",    enabled: false, order: 3, schedule: {} },
  { id: "location", type: "location", enabled: false, order: 4, address: "" },
  { id: "photos",   type: "photos",   enabled: false, order: 5, images: [] },
]

const REP_SECTION_META: Record<string, { label: string; icon: React.ElementType; desc: string }> = {
  reviews:  { label: "Avis clients",     icon: Star,       desc: "Bouton Google + carrousel d'avis" },
  menu:     { label: "Carte & Menu",     icon: Camera,     desc: "Menu avec scan IA" },
  social:   { label: "Réseaux sociaux",  icon: Globe,      desc: "Liens vers vos réseaux" },
  hours:    { label: "Horaires",         icon: Clock,      desc: "Horaires d'ouverture" },
  location: { label: "Adresse",          icon: MapPin,     desc: "Localisation et Google Maps" },
  photos:   { label: "Photos",           icon: ImageIcon,  desc: "Galerie photos" },
}

const SOCIALS_LIST = ["google","facebook","instagram","tripadvisor","x","whatsapp","website"] as const

function SectionAccordion({ id, label, icon: Icon, openSection, setOpenSection, children }: {
  id: string; label: string; icon: React.ElementType
  openSection: string; setOpenSection: (s: string) => void
  children: React.ReactNode
}) {
  const isOpen = openSection === id
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpenSection(isOpen ? "" : id)}
        className="w-full flex items-center gap-2.5 px-5 py-3.5 text-left hover:bg-slate-50 transition-colors"
      >
        <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex-1">{label}</span>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
      </button>
      {isOpen && <div className="px-5 pb-5 space-y-4">{children}</div>}
    </div>
  )
}

export default function PersonnalisationPage() {
  const searchParams = useSearchParams()
  const bizParam = searchParams.get("biz") ? `?biz=${searchParams.get("biz")}` : ""
  const initialTab = searchParams.get("tab") === "reputation" ? "reputation" : "booking"

  const iframeRef    = useRef<HTMLIFrameElement>(null)
  const repIframeRef = useRef<HTMLIFrameElement>(null)
  const [slug, setSlug]               = useState<string | null>(null)
  const [repSlug, setRepSlug]         = useState<string | null>(null)
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [iframeReady, setIframeReady] = useState(false)
  const [repIframeReady, setRepIframeReady] = useState(false)
  const [repTabVisited, setRepTabVisited] = useState(() => initialTab === "reputation")
  const [viewport, setViewport]       = useState<"desktop" | "mobile">("desktop")
  const [services, setServices]       = useState<ServiceItem[]>([])
  const [openSection, setOpenSection] = useState<string>("theme")
  const [tab, setTab]                 = useState<"booking" | "reputation">(initialTab)
  const [repSections, setRepSections] = useState<RepSection[]>(DEFAULT_REP_SECTIONS)
  const [savedRepSections, setSavedRepSections] = useState<RepSection[]>(DEFAULT_REP_SECTIONS)
  const [savingRep, setSavingRep]     = useState(false)
  const [scanningMenu, setScanningMenu] = useState(false)
  const [mobileScanToken, setMobileScanToken] = useState<string | null>(null)
  const [generatingScanToken, setGeneratingScanToken] = useState(false)
  const [expandedRepSection, setExpandedRepSection] = useState<string | null>(null)

  const [state, setState] = useState<PreviewState>({
    pageTheme: "default",
    pageStyle: "modern",
    pageAccentColor: null,
    pageTagline: null,
    logoDataUrl: null,
    pageCoverDataUrl: null,
    pageDescription: null,
    pageLegalText: null,
    pageLabels: null,
    pageServiceOrder: null,
    pageShowHours: false,
    businessName: "",
  })
  const [saved, setSaved] = useState<PreviewState>(state)
  const savedRef = useRef(saved)
  savedRef.current = saved

  // Efficient dirty check — compare only lightweight fields, skip base64 blobs by reference
  const dirty = state.pageTheme !== saved.pageTheme
    || state.pageStyle !== saved.pageStyle
    || state.pageAccentColor !== saved.pageAccentColor
    || state.pageTagline !== saved.pageTagline
    || state.logoDataUrl !== saved.logoDataUrl
    || state.pageCoverDataUrl !== saved.pageCoverDataUrl
    || state.pageDescription !== saved.pageDescription
    || state.pageLegalText !== saved.pageLegalText
    || state.pageShowHours !== saved.pageShowHours
    || state.businessName !== saved.businessName
    || JSON.stringify(state.pageLabels) !== JSON.stringify(saved.pageLabels)
    || JSON.stringify(state.pageServiceOrder) !== JSON.stringify(saved.pageServiceOrder)

  const activePrimary = state.pageAccentColor ?? STYLES.find(s => s.key === state.pageStyle)?.preview.btn ?? "#6366f1"

  const sendPreview = useCallback((overrides: PreviewState) => {
    const msg = { type: "REPUTIX_PREVIEW", overrides }
    iframeRef.current?.contentWindow?.postMessage(msg, window.location.origin)
    repIframeRef.current?.contentWindow?.postMessage(msg, window.location.origin)
  }, [])

  const sendRepSectionsPreview = useCallback((sections: RepSection[]) => {
    repIframeRef.current?.contentWindow?.postMessage(
      { type: "REPUTIX_SECTIONS", sections },
      window.location.origin
    )
  }, [])

  async function saveRepSections() {
    setSavingRep(true)
    try {
      const config = { sections: repSections.map((s, i) => ({ ...s, order: i })) }
      await fetch(`/api/page${bizParam}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageConfig: config, reputationPageEnabled: true }),
      })
      setSavedRepSections([...repSections])
      toast({ title: "Sections sauvegardées", variant: "success" })
    } catch {
      toast({ title: "Erreur lors de la sauvegarde", variant: "destructive" })
    }
    setSavingRep(false)
  }

  function updateRepSection(id: string, patch: Partial<RepSection>) {
    setRepSections(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ...patch } : s)
      setTimeout(() => sendRepSectionsPreview(next), 50)
      return next
    })
  }

  function moveRepSection(idx: number, dir: -1 | 1) {
    setRepSections(prev => {
      const next = [...prev]
      const target = idx + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target], next[idx]]
      setTimeout(() => sendRepSectionsPreview(next), 50)
      return next
    })
  }

  async function scanMenuFromFile(file: File): Promise<{ id: string; name: string; items: { id: string; name: string; description: string; price: string }[] }[] | null> {
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = async ev => {
        const raw = (ev.target?.result as string).split(",")[1]
        try {
          const res = await fetch("/api/menu-scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageBase64: raw, mediaType: file.type }) })
          const data = await res.json()
          if (data.error) { resolve(null); return }
          resolve((data.categories ?? []).map((c: { name: string; items: { name: string; description: string; price: string }[] }) => ({
            id: crypto.randomUUID(), name: c.name,
            items: (c.items ?? []).map((item: { name: string; description: string; price: string }) => ({ id: crypto.randomUUID(), name: item.name, description: item.description ?? "", price: item.price ?? "" })),
          })))
        } catch { resolve(null) }
      }
      reader.readAsDataURL(file)
    })
  }

  // Fetch current settings + services
  useEffect(() => {
    Promise.all([
      fetch(`/api/settings${bizParam}`).then(r => r.json()),
      fetch(`/api/page${bizParam}`).then(r => r.json()),
      fetch(`/api/services${bizParam}`).then(r => r.json()),
    ]).then(([sData, pData, svcData]) => {
      const b = sData.business
      if (b) {
        const initial: PreviewState = {
          pageTheme:        b.pageTheme ?? "default",
          pageStyle:        b.pageStyle ?? "modern",
          pageAccentColor:  b.pageAccentColor ?? null,
          pageTagline:      b.pageTagline ?? null,
          logoDataUrl:      b.logoDataUrl ?? null,
          pageCoverDataUrl: b.pageCoverDataUrl ?? null,
          pageDescription:  b.pageDescription ?? null,
          pageLegalText:    b.pageLegalText ?? null,
          pageLabels:       b.pageLabels ?? null,
          pageServiceOrder: b.pageServiceOrder ?? null,
          pageShowHours:    b.pageShowHours ?? false,
          businessName:     b.name ?? "",
        }
        setState(initial)
        setSaved(initial)
      }
      setSlug(pData.pageSlug ?? null)
      setRepSlug(pData.pageSlug ?? null)
      // Load rep sections from pageConfig
      if (pData.pageConfig?.sections?.length) {
        const saved = (pData.pageConfig.sections as RepSection[]).sort((a, b) => a.order - b.order)
        const savedTypes = new Set(saved.map((s: RepSection) => s.type))
        const missing = DEFAULT_REP_SECTIONS.filter(s => !savedTypes.has(s.type))
        const merged = [...saved, ...missing]
        setRepSections(merged)
        setSavedRepSections(merged)
      }
      setServices((svcData.services ?? svcData ?? []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })))
      setLoading(false)
    })
  }, [bizParam])

  // Debounced preview — wait 150ms after last change before sending to iframe
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!iframeReady) return
    if (previewTimer.current) clearTimeout(previewTimer.current)
    previewTimer.current = setTimeout(() => sendPreview(state), 150)
    return () => { if (previewTimer.current) clearTimeout(previewTimer.current) }
  }, [state, iframeReady, sendPreview])

  function update<K extends keyof PreviewState>(key: K, value: PreviewState[K]) {
    setState(prev => ({ ...prev, [key]: value }))
  }

  function updateLabel(key: string, value: string) {
    setState(prev => {
      const labels = { ...(prev.pageLabels ?? {}) }
      if (value) labels[key] = value
      else delete labels[key]
      return { ...prev, pageLabels: Object.keys(labels).length > 0 ? labels : null }
    })
  }

  async function save() {
    setSaving(true)
    try {
      // 1. Save text/config fields (lightweight)
      const textRes = await fetch(`/api/settings${bizParam}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageTheme:        state.pageTheme,
          pageStyle:        state.pageStyle,
          pageAccentColor:  state.pageAccentColor,
          pageTagline:      state.pageTagline || null,
          pageDescription:  state.pageDescription || null,
          pageLegalText:    state.pageLegalText || null,
          pageLabels:       state.pageLabels,
          pageServiceOrder: state.pageServiceOrder,
          pageShowHours:    state.pageShowHours,
        }),
      })
      if (!textRes.ok) throw new Error("text")

      // 2. Save images separately only if they changed (heavy payload)
      const logoChanged = state.logoDataUrl !== saved.logoDataUrl
      const coverChanged = state.pageCoverDataUrl !== saved.pageCoverDataUrl
      if (logoChanged || coverChanged) {
        const imgRes = await fetch(`/api/settings${bizParam}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(logoChanged  ? { logoDataUrl:      state.logoDataUrl }      : {}),
            ...(coverChanged ? { pageCoverDataUrl: state.pageCoverDataUrl } : {}),
          }),
        })
        if (!imgRes.ok) throw new Error("images")
      }

      setSaved({ ...state })
      toast({ title: "Apparence sauvegardee", variant: "success" })
    } catch {
      toast({ title: "Erreur lors de la sauvegarde", variant: "destructive" })
    }
    setSaving(false)
  }

  function compressImage(file: File, maxW: number, maxH: number, quality: number): Promise<string> {
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = ev => {
        const img = new window.Image()
        img.onload = () => {
          const ratio = Math.min(maxW / img.width, maxH / img.height, 1)
          const w = Math.round(img.width * ratio)
          const h = Math.round(img.height * ratio)
          const canvas = document.createElement("canvas")
          canvas.width = w; canvas.height = h
          canvas.getContext("2d")!.drawImage(img, 0, 0, w, h)
          resolve(canvas.toDataURL("image/jpeg", quality))
        }
        img.src = ev.target?.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  function handleImageUpload(key: "logoDataUrl" | "pageCoverDataUrl") {
    return async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      // Logo: max 256x256, cover: max 1200x400 — both compressed to JPEG <200Ko
      const dataUrl = key === "logoDataUrl"
        ? await compressImage(file, 256, 256, 0.85)
        : await compressImage(file, 1200, 400, 0.82)
      update(key, dataUrl)
      e.target.value = ""
    }
  }

  function moveService(idx: number, dir: -1 | 1) {
    const order = state.pageServiceOrder ?? services.map(s => s.id)
    const newOrder = [...order]
    const target = idx + dir
    if (target < 0 || target >= newOrder.length) return
    ;[newOrder[idx], newOrder[target]] = [newOrder[target], newOrder[idx]]
    update("pageServiceOrder", newOrder)
  }

  function reloadIframe() {
    if (tab === "reputation") {
      setRepIframeReady(false)
      if (repIframeRef.current) { const s = repIframeRef.current.src; repIframeRef.current.src = ""; repIframeRef.current.src = s }
    } else {
      setIframeReady(false)
      if (iframeRef.current) { const s = iframeRef.current.src; iframeRef.current.src = ""; iframeRef.current.src = s }
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
    </div>
  )

  if (!slug) return (
    <div className="max-w-lg mx-auto mt-16 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
        <Monitor className="w-8 h-8 text-slate-400" />
      </div>
      <p className="font-semibold text-slate-700">Page de reservation non configuree</p>
      <p className="text-sm text-slate-400">Activez d&apos;abord votre page dans <a href="/services" className="text-sky-500 hover:underline">Configuration</a>.</p>
    </div>
  )

  const iframeUrl = `/book/${slug}`
  const repIframeUrl = `/r/${repSlug}`

  // Ordered services for display
  const displayOrder = state.pageServiceOrder ?? services.map(s => s.id)
  const orderedSvcs = [...services].sort((a, b) => {
    const ia = displayOrder.indexOf(a.id)
    const ib = displayOrder.indexOf(b.id)
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
  })

  return (
    <div className="fixed inset-0 lg:left-64 top-16 flex flex-col bg-slate-100 z-10">

      {/* Topbar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        {/* Tab switcher */}
        <div className="flex rounded-xl border border-slate-200 overflow-hidden flex-shrink-0">
          <button onClick={() => setTab("booking")}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors ${tab === "booking" ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
            Réservation
          </button>
          <button onClick={() => { setTab("reputation"); setRepTabVisited(true) }}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors ${tab === "reputation" ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
            Réputation
          </button>
        </div>
        <div className="flex-1 min-w-0">
          {dirty && <p className="text-xs text-amber-500 font-medium">Modifications non sauvegardées</p>}
        </div>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          <button onClick={() => setViewport("desktop")}
            className={`p-2 transition-colors ${viewport === "desktop" ? "bg-slate-100 text-slate-900" : "bg-white text-slate-400 hover:bg-slate-50"}`}>
            <Monitor className="w-4 h-4" />
          </button>
          <button onClick={() => setViewport("mobile")}
            className={`p-2 transition-colors ${viewport === "mobile" ? "bg-slate-100 text-slate-900" : "bg-white text-slate-400 hover:bg-slate-50"}`}>
            <Smartphone className="w-4 h-4" />
          </button>
        </div>
        <button onClick={reloadIframe} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors" title="Recharger">
          <RefreshCw className="w-4 h-4" />
        </button>
        <a href={tab === "booking" ? iframeUrl : repIframeUrl} target="_blank" rel="noopener noreferrer"
          className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors" title="Nouvel onglet">
          <ExternalLink className="w-4 h-4" />
        </a>
        <button onClick={save} disabled={saving || !dirty}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold disabled:opacity-40 transition-colors">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Sauvegarder
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left config panel */}
        <div className="w-80 flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto">

          {/* ─ Style visuel ─ */}
          <SectionAccordion openSection={openSection} setOpenSection={setOpenSection} id="theme" label="Style visuel" icon={Tag}>
            <div className="grid grid-cols-2 gap-2">
              {STYLES.map(s => {
                const sel = state.pageStyle === s.key
                const accent = state.pageAccentColor ?? s.preview.btn
                return (
                  <button key={s.key} onClick={() => update("pageStyle", s.key)}
                    className="flex flex-col gap-2 p-2.5 rounded-xl text-left transition-all"
                    style={{
                      border: sel ? `2px solid ${accent}` : "2px solid #e2e8f0",
                      background: sel ? `${accent}10` : "transparent",
                    }}>
                    {/* Mini preview */}
                    <div className="w-full h-12 rounded-lg overflow-hidden flex" style={{ background: s.preview.bg }}>
                      <div className="w-1/3 h-full" style={{ background: s.preview.sidebar, borderRight: "1px solid rgba(0,0,0,0.06)" }} />
                      <div className="flex-1 p-1.5 flex flex-col gap-1">
                        <div className="h-2 rounded-full w-3/4" style={{ background: s.preview.card === "#ffffff" ? "#e2e8f0" : "rgba(255,255,255,0.08)" }} />
                        <div className="h-3 rounded-md w-full mt-auto" style={{ background: accent }} />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{s.label}</p>
                      <p className="text-[10px] text-slate-400 leading-tight">{s.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </SectionAccordion>

          {/* ─ Couleur principale ─ */}
          <SectionAccordion openSection={openSection} setOpenSection={setOpenSection} id="colors" label="Couleur principale" icon={Tag}>
            <p className="text-xs text-slate-400">S&apos;applique sur n&apos;importe quel style.</p>
            <div className="flex items-center gap-3">
              <input type="color" value={activePrimary}
                onChange={e => update("pageAccentColor", e.target.value)}
                className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white" />
              <div>
                <p className="text-sm font-semibold text-slate-800">{activePrimary.toUpperCase()}</p>
                {state.pageAccentColor
                  ? <p className="text-xs text-sky-500">Personnalisee</p>
                  : <p className="text-xs text-slate-400">Couleur par defaut</p>}
              </div>
              {state.pageAccentColor && (
                <button onClick={() => update("pageAccentColor", null)}
                  className="ml-auto text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                  <X className="w-3 h-3" /> Reset
                </button>
              )}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => update("pageAccentColor", c)}
                  className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${state.pageAccentColor === c ? "ring-2 ring-offset-1 ring-slate-400 scale-110" : ""}`}
                  style={{ background: c, border: c === "#ffffff" ? "1px solid #e2e8f0" : "none" }} />
              ))}
            </div>
            {/* Mini preview */}
            {(() => {
              const activeStyle = STYLES.find(s => s.key === state.pageStyle) ?? STYLES[0]
              return (
                <div className="rounded-xl overflow-hidden border border-slate-200">
                  <div className="p-3 flex items-center gap-2" style={{ background: activeStyle.preview.bg }}>
                    {state.logoDataUrl
                      ? <img src={state.logoDataUrl} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" alt="" />
                      : null}
                    <div className="flex-1">
                      <div className="h-2.5 w-24 rounded-full mb-1" style={{ background: activeStyle.preview.bg === "#ffffff" || activeStyle.preview.bg === "#fafafa" || activeStyle.preview.bg === "#f5f5fa" ? "#0f172a20" : "#ffffff30" }} />
                      <div className="h-2 w-16 rounded-full" style={{ background: activeStyle.preview.bg === "#ffffff" || activeStyle.preview.bg === "#fafafa" || activeStyle.preview.bg === "#f5f5fa" ? "#0f172a12" : "#ffffff18" }} />
                    </div>
                  </div>
                  <div className="p-3" style={{ background: activeStyle.preview.card }}>
                    <div className="h-7 rounded-lg w-full" style={{ background: activePrimary }} />
                  </div>
                </div>
              )
            })()}
          </SectionAccordion>

          {/* ─ Identite (logo, tagline, description) ─ */}
          <SectionAccordion openSection={openSection} setOpenSection={setOpenSection} id="identity" label="Identite" icon={Type}>
            {/* Logo */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">Logo</p>
              {state.logoDataUrl ? (
                <div className="flex items-center gap-3">
                  <img src={state.logoDataUrl} className="w-14 h-14 rounded-xl object-cover border border-slate-200" alt="logo" />
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" /> Changer
                      <input type="file" accept="image/*" onChange={handleImageUpload("logoDataUrl")} className="hidden" />
                    </label>
                    <button onClick={() => update("logoDataUrl", null)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-50 text-xs font-medium transition-colors w-full">
                      <X className="w-3.5 h-3.5" /> Supprimer
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-2 w-full py-5 rounded-xl border-2 border-dashed border-slate-200 hover:border-sky-300 hover:bg-sky-50/30 cursor-pointer transition-all">
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-xs text-slate-500">Cliquez pour uploader</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload("logoDataUrl")} className="hidden" />
                </label>
              )}
            </div>
            {/* Tagline */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1.5">Accroche</p>
              <input value={state.pageTagline ?? ""} onChange={e => update("pageTagline", e.target.value || null)}
                placeholder="ex : Reservez en 30 secondes"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500" />
              <p className="text-xs text-slate-400 mt-1">Sous le nom dans la sidebar</p>
            </div>
            {/* Description */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1.5">Description / Texte d&apos;accueil</p>
              <textarea value={state.pageDescription ?? ""} onChange={e => update("pageDescription", e.target.value || null)}
                placeholder="Bienvenue dans notre salon ! Nous sommes heureux de vous accueillir..."
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none" />
              <p className="text-xs text-slate-400 mt-1">Visible dans la sidebar sous l&apos;accroche</p>
            </div>
          </SectionAccordion>

          {/* ─ Banniere / Cover ─ */}
          <SectionAccordion openSection={openSection} setOpenSection={setOpenSection} id="cover" label="Banniere" icon={ImageIcon}>
            {state.pageCoverDataUrl ? (
              <div className="space-y-3">
                <img src={state.pageCoverDataUrl} className="w-full h-24 rounded-xl object-cover border border-slate-200" alt="cover" />
                <div className="flex gap-2">
                  <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" /> Changer
                    <input type="file" accept="image/*" onChange={handleImageUpload("pageCoverDataUrl")} className="hidden" />
                  </label>
                  <button onClick={() => update("pageCoverDataUrl", null)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-red-400 hover:bg-red-50 text-xs font-medium transition-colors">
                    <X className="w-3.5 h-3.5" /> Supprimer
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-2 w-full py-8 rounded-xl border-2 border-dashed border-slate-200 hover:border-sky-300 hover:bg-sky-50/30 cursor-pointer transition-all">
                <ImageIcon className="w-6 h-6 text-slate-400" />
                <span className="text-xs text-slate-500">Image de couverture (recommandé : 1200x400)</span>
                <input type="file" accept="image/*" onChange={handleImageUpload("pageCoverDataUrl")} className="hidden" />
              </label>
            )}
            <p className="text-xs text-slate-400">Affichée en haut de la page réputation et dans la sidebar réservation</p>
          </SectionAccordion>

          {/* ─ Labels custom (réservation only) ─ */}
          {tab === "booking" && <SectionAccordion openSection={openSection} setOpenSection={setOpenSection} id="labels" label="Labels des etapes" icon={Type}>
            <p className="text-xs text-slate-400 mb-2">Personnalisez le texte des titres de chaque etape. Laissez vide pour le texte par defaut.</p>
            {Object.entries(DEFAULT_LABELS).map(([key, placeholder]) => (
              <div key={key}>
                <p className="text-xs font-medium text-slate-500 mb-1 capitalize">{key === "staffSub" ? "Sous-titre staff" : key}</p>
                <input
                  value={state.pageLabels?.[key] ?? ""}
                  onChange={e => updateLabel(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            ))}
          </SectionAccordion>}

          {/* ─ Ordre des services (réservation only) ─ */}
          {tab === "booking" && <SectionAccordion openSection={openSection} setOpenSection={setOpenSection} id="services" label="Ordre des services" icon={ListOrdered}>
            {orderedSvcs.length === 0 ? (
              <p className="text-xs text-slate-400">Aucun service actif</p>
            ) : (
              <div className="space-y-1">
                {orderedSvcs.map((svc, idx) => (
                  <div key={svc.id} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <GripVertical className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                    <span className="text-sm text-slate-700 flex-1 truncate">{svc.name}</span>
                    <button onClick={() => moveService(idx, -1)} disabled={idx === 0}
                      className="p-1 rounded hover:bg-slate-200 disabled:opacity-20 transition-colors">
                      <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                    <button onClick={() => moveService(idx, 1)} disabled={idx === orderedSvcs.length - 1}
                      className="p-1 rounded hover:bg-slate-200 disabled:opacity-20 transition-colors">
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {state.pageServiceOrder && (
              <button onClick={() => update("pageServiceOrder", null)}
                className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                <X className="w-3 h-3" /> Reinitialiser l&apos;ordre
              </button>
            )}
          </SectionAccordion>}

          {/* ─ Horaires (réservation only) ─ */}
          {tab === "booking" && <SectionAccordion openSection={openSection} setOpenSection={setOpenSection} id="hours" label="Afficher les horaires" icon={Clock}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-700 font-medium">Horaires dans la sidebar</p>
                <p className="text-xs text-slate-400">Affiche vos horaires d&apos;ouverture sur la page de reservation</p>
              </div>
              <button
                onClick={() => update("pageShowHours", !state.pageShowHours)}
                className={`relative w-11 h-6 rounded-full transition-colors ${state.pageShowHours ? "bg-sky-500" : "bg-slate-200"}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${state.pageShowHours ? "translate-x-[22px]" : "translate-x-0.5"}`} />
              </button>
            </div>
            {state.pageShowHours && (
              <p className="text-xs text-slate-400">Les horaires proviennent de votre <a href="/services" className="text-sky-500 hover:underline">Configuration</a>.</p>
            )}
          </SectionAccordion>}

          {/* ─ Mentions legales (réservation only) ─ */}
          {tab === "booking" && <SectionAccordion openSection={openSection} setOpenSection={setOpenSection} id="legal" label="Mentions légales" icon={FileText}>
            <textarea
              value={state.pageLegalText ?? ""}
              onChange={e => update("pageLegalText", e.target.value || null)}
              placeholder="CGV, politique d'annulation, mentions légales..."
              rows={4}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
            />
            <p className="text-xs text-slate-400">Affiché en bas de la sidebar de réservation</p>
          </SectionAccordion>}

          {/* ─ Modules (réputation only) ─ */}
          {tab === "reputation" && (
            <div className="border-t border-slate-100">
              <div className="px-5 py-3.5 flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex-1">Modules</span>
                {JSON.stringify(repSections) !== JSON.stringify(savedRepSections) && (
                  <button onClick={saveRepSections} disabled={savingRep}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500 text-white text-xs font-semibold disabled:opacity-50">
                    {savingRep ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Sauver
                  </button>
                )}
              </div>
              <div className="px-3 pb-4 space-y-2">
                {repSections.map((sec, idx) => {
                  const meta = REP_SECTION_META[sec.type]
                  if (!meta) return null
                  const Icon = meta.icon
                  const isExpanded = expandedRepSection === sec.id
                  return (
                    <div key={sec.id} className={`rounded-xl border transition-all ${sec.enabled ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50"}`}>
                      {/* Header row */}
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => moveRepSection(idx, -1)} disabled={idx === 0}
                            className="p-0.5 rounded hover:bg-slate-100 disabled:opacity-20 transition-colors">
                            <ChevronUp className="w-3 h-3 text-slate-400" />
                          </button>
                          <button onClick={() => moveRepSection(idx, 1)} disabled={idx === repSections.length - 1}
                            className="p-0.5 rounded hover:bg-slate-100 disabled:opacity-20 transition-colors">
                            <ChevronDown className="w-3 h-3 text-slate-400" />
                          </button>
                        </div>
                        <Icon className={`w-4 h-4 flex-shrink-0 ${sec.enabled ? "text-sky-500" : "text-slate-300"}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold ${sec.enabled ? "text-slate-800" : "text-slate-400"}`}>{meta.label}</p>
                          <p className="text-[10px] text-slate-400 truncate">{meta.desc}</p>
                        </div>
                        {/* Toggle visible */}
                        <button onClick={() => updateRepSection(sec.id, { enabled: !sec.enabled })}
                          className={`p-1.5 rounded-lg transition-colors ${sec.enabled ? "bg-sky-50 text-sky-500 hover:bg-sky-100" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}>
                          {sec.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        {/* Expand for settings */}
                        {(sec.type === "menu" || sec.type === "social" || sec.type === "location") && (
                          <button onClick={() => setExpandedRepSection(isExpanded ? null : sec.id)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-slate-200 transition-colors">
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>

                      {/* Expanded settings */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1 border-t border-slate-100 space-y-3">

                          {/* Menu: scan IA */}
                          {sec.type === "menu" && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-slate-500">Scanner la carte via IA</p>
                              <label className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed border-slate-200 hover:border-sky-300 hover:bg-sky-50/30 cursor-pointer transition-all ${scanningMenu ? "opacity-60 pointer-events-none" : ""}`}>
                                {scanningMenu ? (
                                  <><Loader2 className="w-4 h-4 text-sky-500 animate-spin" /><span className="text-xs text-slate-500">Analyse en cours...</span></>
                                ) : (
                                  <><Camera className="w-4 h-4 text-slate-400" /><span className="text-xs text-slate-600 font-medium">Photo(s) du menu</span><span className="text-xs text-slate-400">— IA détecte tout</span></>
                                )}
                                <input type="file" accept="image/*" multiple className="hidden" disabled={scanningMenu}
                                  onChange={async e => {
                                    const files = Array.from(e.target.files ?? [])
                                    if (!files.length) return
                                    setScanningMenu(true)
                                    const accumulated = [...(sec.categories ?? [])]
                                    for (const file of files) {
                                      const cats = await scanMenuFromFile(file)
                                      if (!cats) continue
                                      for (const cat of cats) {
                                        const ex = accumulated.find(c => c.name.toLowerCase().trim() === cat.name.toLowerCase().trim())
                                        if (ex) ex.items = [...ex.items, ...cat.items]
                                        else accumulated.push(cat)
                                      }
                                    }
                                    updateRepSection(sec.id, { categories: accumulated, enabled: true })
                                    setScanningMenu(false)
                                    e.target.value = ""
                                  }} />
                              </label>

                              {/* Mobile scan */}
                              {!mobileScanToken ? (
                                <button
                                  disabled={generatingScanToken}
                                  onClick={async () => {
                                    setGeneratingScanToken(true)
                                    const res = await fetch(`/api/scan-token${bizParam}`, { method: "POST" })
                                    const json = await res.json()
                                    if (json.token) setMobileScanToken(json.token)
                                    setGeneratingScanToken(false)
                                  }}
                                  className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50/30 transition-all text-left"
                                >
                                  {generatingScanToken ? (
                                    <><Loader2 className="w-4 h-4 text-violet-500 animate-spin" /><span className="text-xs text-slate-500">Génération du lien...</span></>
                                  ) : (
                                    <><Smartphone className="w-4 h-4 text-slate-400" /><span className="text-xs text-slate-600 font-medium">Scanner depuis mobile</span><span className="text-xs text-slate-400">— lien QR partageble</span></>
                                  )}
                                </button>
                              ) : (
                                <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-violet-800">Lien mobile (2h)</span>
                                    <button onClick={() => setMobileScanToken(null)} className="text-violet-400 hover:text-violet-600"><X className="w-3.5 h-3.5" /></button>
                                  </div>
                                  <div className="flex justify-center">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`${typeof window !== "undefined" ? window.location.origin : ""}/scan/${mobileScanToken}`)}`}
                                      alt="QR code"
                                      width={140}
                                      height={140}
                                      className="rounded-lg"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      readOnly
                                      value={`${typeof window !== "undefined" ? window.location.origin : ""}/scan/${mobileScanToken}`}
                                      className="flex-1 px-2 py-1.5 text-[10px] border border-slate-200 rounded-lg bg-white text-slate-600 overflow-ellipsis"
                                    />
                                    <button
                                      onClick={() => navigator.clipboard.writeText(`${window.location.origin}/scan/${mobileScanToken}`)}
                                      className="px-2 py-1.5 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-medium flex-shrink-0"
                                    >
                                      Copier
                                    </button>
                                  </div>
                                </div>
                              )}
                              {sec.categories && sec.categories.length > 0 && (
                                <div className="space-y-1">
                                  {sec.categories.map(cat => (
                                    <div key={cat.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-100">
                                      <span className="text-xs text-slate-700 flex-1 truncate font-medium">{cat.name}</span>
                                      <span className="text-[10px] text-slate-400">{cat.items.length} plats</span>
                                      <button onClick={() => updateRepSection(sec.id, { categories: sec.categories!.filter(c => c.id !== cat.id) })}
                                        className="p-0.5 text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Social links */}
                          {sec.type === "social" && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-slate-500">Liens</p>
                              {SOCIALS_LIST.map(platform => {
                                const existing = sec.links?.find(l => l.platform === platform)
                                return (
                                  <div key={platform} className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500 w-20 capitalize flex-shrink-0">{platform}</span>
                                    <input
                                      value={existing?.url ?? ""}
                                      onChange={e => {
                                        const url = e.target.value
                                        const newLinks = [...(sec.links ?? []).filter(l => l.platform !== platform)]
                                        if (url) newLinks.push({ platform, url, label: platform })
                                        updateRepSection(sec.id, { links: newLinks })
                                      }}
                                      placeholder="https://..."
                                      className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                                    />
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* Location */}
                          {sec.type === "location" && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-medium text-slate-500">Adresse</p>
                              <input
                                value={sec.address ?? ""}
                                onChange={e => updateRepSection(sec.id, { address: e.target.value })}
                                placeholder="12 Rue de la Paix, 75002 Paris"
                                className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                              />
                            </div>
                          )}

                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right iframe(s) */}
        <div className="flex-1 flex items-start justify-center overflow-auto bg-slate-200 p-4">
          <div
            className="relative bg-white shadow-2xl rounded-2xl overflow-hidden transition-all duration-300"
            style={{
              width: viewport === "mobile" ? 390 : "100%",
              maxWidth: viewport === "desktop" ? "none" : 390,
              height: viewport === "mobile" ? 844 : "100%",
              minHeight: viewport === "desktop" ? "calc(100vh - 140px)" : "none",
            }}
          >
            {/* Booking iframe */}
            <div className={tab === "booking" ? "absolute inset-0" : "hidden"}>
              {!iframeReady && tab === "booking" && (
                <div className="absolute inset-0 bg-slate-100 flex items-center justify-center z-10">
                  <div className="text-center space-y-3">
                    <Loader2 className="w-8 h-8 text-sky-500 animate-spin mx-auto" />
                    <p className="text-sm text-slate-400">Chargement de l&apos;aperçu...</p>
                  </div>
                </div>
              )}
              <iframe
                ref={iframeRef}
                src={iframeUrl}
                className="w-full h-full border-0"
                onLoad={() => {
                  setIframeReady(true)
                  setTimeout(() => sendPreview(state), 200)
                }}
                title="Aperçu page réservation"
              />
            </div>

            {/* Reputation iframe — monté une fois pour toutes après le premier switch */}
            {repTabVisited && (
              <div className={tab === "reputation" ? "absolute inset-0" : "hidden"}>
                {!repIframeReady && (
                  <div className="absolute inset-0 bg-slate-100 flex items-center justify-center z-10">
                    <div className="text-center space-y-3">
                      <Loader2 className="w-8 h-8 text-sky-500 animate-spin mx-auto" />
                      <p className="text-sm text-slate-400">Chargement de l&apos;aperçu...</p>
                    </div>
                  </div>
                )}
                {repSlug && (
                  <iframe
                    ref={repIframeRef}
                    src={repIframeUrl}
                    className="w-full h-full border-0"
                    onLoad={() => {
                      setRepIframeReady(true)
                      setTimeout(() => sendPreview(state), 200)
                    }}
                    title="Aperçu page réputation"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
