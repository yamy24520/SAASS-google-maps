"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { TrendingUp, Star, MessageSquare, BarChart2, Search, RefreshCw, MapPin, Pencil, X, Settings2, Save, Loader2, ExternalLink, Upload } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toaster"

export default function ReputationPage() {
  const searchParams = useSearchParams()
  const bizId = searchParams.get("biz")
  const bizParam = bizId ? `?biz=${bizId}` : ""

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [linking, setLinking] = useState(false)
  const [changingPlace, setChangingPlace] = useState(false)

  // Page config state
  const [showPageConfig, setShowPageConfig] = useState(false)
  const [savingPage, setSavingPage] = useState(false)
  const [reputationPageEnabled, setReputationPageEnabled] = useState(false)
  const [pageTagline, setPageTagline] = useState("")
  const [pageTheme, setPageTheme] = useState("dark")
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null)
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({})

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/reputation${bizParam}`)
    const json = await res.json()
    setData(json)
    if (json?.business) {
      setReputationPageEnabled(json.business.reputationPageEnabled ?? false)
      setPageTagline(json.business.pageTagline ?? "")
      setPageTheme(json.business.pageTheme ?? "dark")
      setLogoDataUrl(json.business.logoDataUrl ?? null)
      setSocialLinks(json.business.socialLinks ?? {})
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [bizParam]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSavePage() {
    setSavingPage(true)
    const res = await fetch(`/api/settings${bizParam}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reputationPageEnabled, pageTagline: pageTagline || null, pageTheme, logoDataUrl, socialLinks }),
    })
    if (res.ok) {
      toast({ title: "Page sauvegardée", variant: "success" })
      setShowPageConfig(false)
      await load()
    } else {
      toast({ title: "Erreur lors de la sauvegarde", variant: "destructive" })
    }
    setSavingPage(false)
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    const res = await fetch(`/api/places/search?q=${encodeURIComponent(searchQuery)}`)
    const json = await res.json()
    setSearchResults(json.results ?? [])
    setSearching(false)
  }


  async function handleRefresh() {
    if (!data?.business?.placeId) {
      await load()
      return
    }
    setLinking(true)
    await fetch(`/api/reputation${bizParam}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId: data.business.placeId }),
    })
    await load()
    setLinking(false)
  }

  async function handleLink(placeId: string) {
    setLinking(true)
    await fetch(`/api/reputation${bizParam}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId }),
    })
    setSearchResults([])
    setSearchQuery("")
    setChangingPlace(false)
    await load()
    setLinking(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const snapshots = data?.snapshots ?? []
  const business = data?.business

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Réputation</h1>
          <p className="text-slate-500 mt-1">Suivez l&apos;évolution de votre note dans le temps</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPageConfig(v => !v)} className="gap-2">
            <Settings2 className="w-4 h-4" />
            Ma page publique
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${linking ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* ─── Config page publique ─── */}
      {showPageConfig && (
        <Card className="border-sky-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              Page de réputation publique
            </CardTitle>
            <CardDescription>Une page partageable avec vos avis, photos et réseaux sociaux</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">Activer la page publique</p>
                <p className="text-xs text-slate-500 mt-0.5">Accessible via QR code ou lien partageable</p>
              </div>
              <Switch checked={reputationPageEnabled} onCheckedChange={setReputationPageEnabled} />
            </div>

            {reputationPageEnabled && (
              <>
                {data?.business?.id && (
                  <a href={`/r/${data.business.id}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-sky-600 hover:underline">
                    <ExternalLink className="w-3.5 h-3.5" /> Prévisualiser ma page
                  </a>
                )}

                {/* Logo */}
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <div className="flex items-center gap-4">
                    {logoDataUrl ? (
                      <div className="relative">
                        <img src={logoDataUrl} alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-slate-200" />
                        <button type="button" onClick={() => setLogoDataUrl(null)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                        <Upload className="w-5 h-5" />
                      </div>
                    )}
                    <label className="cursor-pointer">
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        {logoDataUrl ? "Changer" : "Importer"}
                      </span>
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const reader = new FileReader()
                          reader.onload = ev => {
                            const img = new window.Image()
                            img.onload = () => {
                              const canvas = document.createElement("canvas")
                              const size = 256
                              canvas.width = size; canvas.height = size
                              const ctx = canvas.getContext("2d")!
                              const scale = Math.max(size / img.width, size / img.height)
                              const w = img.width * scale; const h = img.height * scale
                              ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
                              setLogoDataUrl(canvas.toDataURL("image/jpeg", 0.85))
                            }
                            img.src = ev.target?.result as string
                          }
                          reader.readAsDataURL(file)
                          e.target.value = ""
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Tagline */}
                <div className="space-y-1.5">
                  <Label>Accroche <span className="text-slate-400 font-normal">(optionnelle)</span></Label>
                  <Input
                    value={pageTagline}
                    onChange={e => setPageTagline(e.target.value)}
                    placeholder="Restaurant gastronomique au cœur de Paris"
                  />
                </div>

                {/* Thème */}
                <div className="space-y-2">
                  <Label>Thème</Label>
                  <div className="flex gap-2">
                    {[
                      { key: "dark",   label: "Sombre",  bg: "#1e293b", accent: "#f59e0b" },
                      { key: "light",  label: "Clair",   bg: "#f1f5f9", accent: "#6366f1" },
                      { key: "warm",   label: "Chaleur", bg: "#7c2d12", accent: "#fbbf24" },
                      { key: "ocean",  label: "Océan",   bg: "#0e7490", accent: "#38bdf8" },
                      { key: "forest", label: "Forêt",   bg: "#14532d", accent: "#4ade80" },
                    ].map(t => (
                      <button key={t.key} type="button" onClick={() => setPageTheme(t.key)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                          pageTheme === t.key ? "border-sky-500 scale-105" : "border-transparent hover:border-slate-200"
                        }`}>
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: t.bg }}>
                          <div className="w-3 h-3 rounded-full" style={{ background: t.accent }} />
                        </div>
                        <span className="text-xs text-slate-600">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Réseaux sociaux */}
                <div className="space-y-2 pt-1">
                  <p className="text-sm font-medium text-slate-700">Réseaux sociaux <span className="text-xs font-normal text-slate-400">(optionnels)</span></p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: "facebook",    label: "Facebook",    placeholder: "https://facebook.com/..." },
                      { key: "instagram",   label: "Instagram",   placeholder: "https://instagram.com/..." },
                      { key: "tripadvisor", label: "TripAdvisor", placeholder: "https://tripadvisor.fr/..." },
                      { key: "website",     label: "Site web",    placeholder: "https://votresite.fr" },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs">{label}</Label>
                        <Input
                          value={socialLinks[key] ?? ""}
                          onChange={e => setSocialLinks(s => ({ ...s, [key]: e.target.value }))}
                          placeholder={placeholder}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Button className="gap-2 w-full" onClick={handleSavePage} disabled={savingPage}>
              {savingPage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {savingPage ? "Sauvegarde..." : "Enregistrer"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Fiche liée */}
      {business?.placeId && !changingPlace ? (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-900">{business.name}</p>
                  <p className="text-xs text-emerald-700">Fiche Google Maps liée · {business.totalReviews} avis · ⭐ {business.rating?.toFixed(1)}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setChangingPlace(true); setSearchResults([]); setSearchQuery("") }}
                className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-100 flex-shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" />
                Changer
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Search form — shown when not linked OR when changing */}
      {(!business?.placeId || changingPlace) && (
        <Card className="border-sky-200 bg-sky-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-sky-900">
                {changingPlace ? "Changer de fiche Google Maps" : "Liez votre fiche Google Maps"}
              </p>
              {changingPlace && (
                <button onClick={() => { setChangingPlace(false); setSearchResults([]) }} className="text-sky-400 hover:text-sky-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-sm text-sky-700 mb-4">Recherchez votre établissement par nom et ville.</p>
            <div className="flex gap-2">
              <Input
                placeholder="Ex: Saint James Bergerac"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="bg-white"
              />
              <Button onClick={handleSearch} disabled={searching} className="gap-2">
                <Search className="w-4 h-4" />
                {searching ? "..." : "Rechercher"}
              </Button>
            </div>
            {searchResults.length > 0 && (
              <div className="mt-3 space-y-2">
                {searchResults.map((r) => (
                  <div key={r.placeId} className="flex items-center justify-between bg-white rounded-xl p-3 border border-sky-100">
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{r.name}</p>
                      <p className="text-xs text-slate-500">{r.address}</p>
                      <p className="text-xs text-sky-600 mt-0.5">⭐ {r.rating} · {r.reviewCount} avis</p>
                    </div>
                    <Button size="sm" onClick={() => handleLink(r.placeId)} disabled={linking}>
                      {linking ? "Liaison..." : changingPlace ? "Choisir" : "Lier"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Note moyenne", value: business?.rating?.toFixed(1) ?? "—", icon: Star, color: "text-yellow-500" },
          { label: "Total avis", value: business?.totalReviews ?? "—", icon: MessageSquare, color: "text-sky-500" },
          { label: "Taux de réponse", value: business?.responseRate ? `${Math.round(business.responseRate)}%` : "—", icon: BarChart2, color: "text-emerald-500" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4 text-sky-500" />
            Évolution de la note
          </CardTitle>
        </CardHeader>
        <CardContent>
          {snapshots.length < 2 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <BarChart2 className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Pas encore assez de données</p>
              <p className="text-xs mt-1">Le graphique apparaît après quelques jours de suivi</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={snapshots}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis domain={[1, 5]} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "13px" }}
                  formatter={(v: any) => [`${v} / 5`, "Note"]}
                />
                <Line type="monotone" dataKey="rating" stroke="#0ea5e9" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
