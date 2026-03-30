"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Save, Loader2, Monitor, Smartphone, RefreshCw, Upload, X, ExternalLink } from "lucide-react"
import { toast } from "@/components/ui/toaster"

interface PreviewState {
  pageTheme: string
  pageAccentColor: string | null
  pageTagline: string | null
  logoDataUrl: string | null
  businessName: string
}

const THEMES = [
  { key: "default",    label: "Standard",    primary: "#0ea5e9", pageBg: "#f8fafc", dark: false },
  { key: "hello_kitty",label: "Hello Kitty", primary: "#e91e8c", pageBg: "#fce4ec", dark: false },
  { key: "barber",     label: "Barber Shop", primary: "#f59e0b", pageBg: "#0f172a", dark: true  },
  { key: "manga",      label: "Manga",       primary: "#dc2626", pageBg: "#ffffff", dark: false },
]

export default function PersonnalisationPage() {
  const searchParams = useSearchParams()
  const bizParam = searchParams.get("biz") ? `?biz=${searchParams.get("biz")}` : ""

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [slug, setSlug]           = useState<string | null>(null)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [iframeReady, setIframeReady] = useState(false)
  const [viewport, setViewport]   = useState<"desktop" | "mobile">("desktop")

  const [state, setState] = useState<PreviewState>({
    pageTheme: "default",
    pageAccentColor: null,
    pageTagline: null,
    logoDataUrl: null,
    businessName: "",
  })
  const [saved, setSaved] = useState<PreviewState>(state)
  const dirty = JSON.stringify(state) !== JSON.stringify(saved)

  // Custom accent: use theme primary as placeholder when null
  const activePrimary = state.pageAccentColor ?? THEMES.find(t => t.key === state.pageTheme)?.primary ?? "#0ea5e9"

  const sendPreview = useCallback((overrides: PreviewState) => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "REPUTIX_PREVIEW", overrides },
      window.location.origin
    )
  }, [])

  // Fetch current settings
  useEffect(() => {
    Promise.all([
      fetch(`/api/settings${bizParam}`).then(r => r.json()),
      fetch(`/api/page${bizParam}`).then(r => r.json()),
    ]).then(([sData, pData]) => {
      const b = sData.business
      if (b) {
        const initial: PreviewState = {
          pageTheme:      b.pageTheme ?? "default",
          pageAccentColor: b.pageAccentColor ?? null,
          pageTagline:    b.pageTagline ?? null,
          logoDataUrl:    b.logoDataUrl ?? null,
          businessName:   b.name ?? "",
        }
        setState(initial)
        setSaved(initial)
      }
      setSlug(pData.pageSlug ?? null)
      setLoading(false)
    })
  }, [bizParam]) // eslint-disable-line react-hooks/exhaustive-deps

  // Send preview whenever state changes and iframe is ready
  useEffect(() => {
    if (iframeReady) sendPreview(state)
  }, [state, iframeReady, sendPreview])

  function update<K extends keyof PreviewState>(key: K, value: PreviewState[K]) {
    setState(prev => ({ ...prev, [key]: value }))
  }

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/settings${bizParam}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageTheme:       state.pageTheme,
        pageAccentColor: state.pageAccentColor,
        pageTagline:     state.pageTagline || null,
        logoDataUrl:     state.logoDataUrl,
      }),
    })
    if (res.ok) {
      setSaved({ ...state })
      toast({ title: "Apparence sauvegardée", variant: "success" })
    } else {
      toast({ title: "Erreur lors de la sauvegarde", variant: "destructive" })
    }
    setSaving(false)
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      update("logoDataUrl", ev.target?.result as string ?? null)
    }
    reader.readAsDataURL(file)
  }

  function reloadIframe() {
    setIframeReady(false)
    if (iframeRef.current) iframeRef.current.src = iframeRef.current.src
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
      <p className="font-semibold text-slate-700">Page de réservation non configurée</p>
      <p className="text-sm text-slate-400">Activez d&apos;abord votre page de réservation dans <a href="/services" className="text-sky-500 hover:underline">Configuration</a>.</p>
    </div>
  )

  const iframeUrl = `/book/${slug}`
  const activeTheme = THEMES.find(t => t.key === state.pageTheme) ?? THEMES[0]

  return (
    // Full-height layout sans le padding de la page parent
    <div className="fixed inset-0 lg:left-64 top-16 flex flex-col bg-slate-100 z-10">

      {/* ── Topbar ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-slate-900 text-sm">Apparence de la page réservation</h1>
          {dirty && <p className="text-xs text-amber-500 font-medium">Modifications non sauvegardées</p>}
        </div>

        {/* Viewport toggle */}
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

        <button onClick={reloadIframe} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors" title="Recharger l'aperçu">
          <RefreshCw className="w-4 h-4" />
        </button>

        {slug && (
          <a href={iframeUrl} target="_blank" rel="noopener noreferrer"
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors" title="Ouvrir dans un nouvel onglet">
            <ExternalLink className="w-4 h-4" />
          </a>
        )}

        <button onClick={save} disabled={saving || !dirty}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold disabled:opacity-40 transition-colors">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Sauvegarder
        </button>
      </div>

      {/* ── Body: panel + iframe ─────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left config panel ─────────────────────────────────────────────── */}
        <div className="w-72 flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto">
          <div className="p-5 space-y-7">

            {/* Thème */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Thème</p>
              <div className="grid grid-cols-2 gap-2">
                {THEMES.map(theme => {
                  const isSelected = state.pageTheme === theme.key
                  return (
                    <button key={theme.key} onClick={() => update("pageTheme", theme.key)}
                      className="flex flex-col items-center gap-2 p-2.5 rounded-xl transition-all"
                      style={{
                        border: isSelected ? `2px solid ${theme.primary}` : "2px solid #e2e8f0",
                        background: isSelected ? `${theme.primary}12` : "transparent",
                      }}>
                      <div className="w-full h-10 rounded-lg overflow-hidden">
                        <div style={{ height: "55%", background: theme.primary }} />
                        <div style={{ height: "45%", background: theme.pageBg, borderTop: "1px solid #e2e8f0" }} />
                      </div>
                      <span className="text-xs font-medium text-slate-700">{theme.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Couleur d'accent */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Couleur principale</p>
                {state.pageAccentColor && (
                  <button onClick={() => update("pageAccentColor", null)}
                    className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                    <X className="w-3 h-3" /> Réinitialiser
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input type="color" value={activePrimary}
                    onChange={e => update("pageAccentColor", e.target.value)}
                    className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{activePrimary.toUpperCase()}</p>
                  {state.pageAccentColor
                    ? <p className="text-xs text-sky-500">Couleur personnalisée</p>
                    : <p className="text-xs text-slate-400">Couleur du thème</p>
                  }
                </div>
              </div>
              {/* Palette rapide */}
              <div className="flex gap-1.5 mt-2.5 flex-wrap">
                {["#0ea5e9","#8b5cf6","#10b981","#f59e0b","#ef4444","#ec4899","#14b8a6","#f97316"].map(c => (
                  <button key={c} onClick={() => update("pageAccentColor", c)}
                    className={`w-6 h-6 rounded-full transition-transform hover:scale-110 flex-shrink-0 ${state.pageAccentColor === c ? "ring-2 ring-offset-1 ring-slate-400 scale-110" : ""}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>

            {/* Accroche */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Accroche</p>
              <input
                value={state.pageTagline ?? ""}
                onChange={e => update("pageTagline", e.target.value || null)}
                placeholder="ex : Réservez en 30 secondes ✨"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <p className="text-xs text-slate-400 mt-1.5">Affichée sous le nom dans la sidebar</p>
            </div>

            {/* Logo */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Logo</p>
              {state.logoDataUrl ? (
                <div className="flex items-center gap-3">
                  <img src={state.logoDataUrl} className="w-14 h-14 rounded-xl object-cover border border-slate-200" alt="logo" />
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" /> Changer
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                    <button onClick={() => update("logoDataUrl", null)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-50 text-xs font-medium transition-colors w-full">
                      <X className="w-3.5 h-3.5" /> Supprimer
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-2 w-full py-6 rounded-xl border-2 border-dashed border-slate-200 hover:border-sky-300 hover:bg-sky-50/30 cursor-pointer transition-all">
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-xs text-slate-500">Cliquez pour uploader</span>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
              )}
            </div>

            {/* Aperçu de la couleur sur fond de thème */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Aperçu couleur</p>
              <div className="rounded-xl overflow-hidden border border-slate-200">
                <div className="p-3 flex items-center gap-2" style={{ background: activeTheme.pageBg }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm" style={{ background: activePrimary }}>
                    {state.businessName.charAt(0) || "R"}
                  </div>
                  <div className="flex-1">
                    <div className="h-2.5 w-24 rounded-full mb-1" style={{ background: activeTheme.dark ? "#ffffff30" : "#0f172a20" }} />
                    <div className="h-2 w-16 rounded-full" style={{ background: activeTheme.dark ? "#ffffff18" : "#0f172a12" }} />
                  </div>
                </div>
                <div className="p-3" style={{ background: activeTheme.dark ? "#1e293b" : "#f8fafc" }}>
                  <div className="h-7 rounded-lg w-full" style={{ background: activePrimary, opacity: 0.9 }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right iframe ──────────────────────────────────────────────────── */}
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
            {!iframeReady && (
              <div className="absolute inset-0 bg-slate-100 flex items-center justify-center z-10">
                <div className="text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-sky-500 animate-spin mx-auto" />
                  <p className="text-sm text-slate-400">Chargement de l&apos;aperçu…</p>
                </div>
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={iframeUrl}
              className="w-full h-full border-0"
              onLoad={() => {
                setIframeReady(true)
                // Small delay so the page has time to mount its listener
                setTimeout(() => sendPreview(state), 200)
              }}
              title="Aperçu page réservation"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
