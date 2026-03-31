"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  Save, Loader2, Globe, Unlink, ExternalLink,
  CreditCard, CheckCircle2, AlertCircle, Phone, Mic, MicOff, Building2, Star, Upload, X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "@/components/ui/toaster"
import { PushNotificationToggle } from "@/components/PushNotificationBanner"

interface SpinPrize {
  emoji: string
  label: string
  probability: number
}

interface Business {
  name: string
  category: string
  responseTone: string
  autoReplyEnabled: boolean
  autoReplyMinRating: number
  customSignature: string | null
  alertEmailEnabled: boolean
  language: string
  gbpConnectedAt: string | null
  gbpLocationName: string | null
  gbpLocationId: string | null
  tripAdvisorUrl: string | null
  bookingUrl: string | null
  trustpilotUrl: string | null
  offerEnabled: boolean
  offerText: string | null
  offerType: "FIXED" | "SPIN_WHEEL"
  spinPrizes: SpinPrize[] | null
  reputationPageEnabled: boolean
  socialLinks: { facebook?: string; instagram?: string; website?: string; tripadvisor?: string } | null
  logoDataUrl: string | null
  pageTheme: string
  pageTagline: string | null
  pageAccentColor: string | null
  id?: string
}

const DEFAULT_SPIN_PRIZES: SpinPrize[] = [
  { emoji: "🍷", label: "Verre offert", probability: 30 },
  { emoji: "🍮", label: "Dessert offert", probability: 25 },
  { emoji: "💸", label: "-10% sur l'addition", probability: 30 },
  { emoji: "🙏", label: "Merci !", probability: 15 },
]

const TABS = [
  { id: "general",   label: "Général",   icon: Building2 },
  { id: "reviews",   label: "Avis & IA", icon: Star },
  { id: "advanced",  label: "Paiements", icon: CreditCard },
]

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const bizId = searchParams.get("biz")
  const bizParam = bizId ? `?biz=${bizId}` : ""

  const [tab, setTab] = useState("general")
  const [form, setForm] = useState<Business>({
    name: "",
    category: "RESTAURANT",
    responseTone: "PROFESSIONAL",
    autoReplyEnabled: false,
    autoReplyMinRating: 4,
    customSignature: "",
    alertEmailEnabled: true,
    language: "fr",
    gbpConnectedAt: null,
    gbpLocationName: null,
    gbpLocationId: null,
    tripAdvisorUrl: null,
    bookingUrl: null,
    trustpilotUrl: null,
    offerEnabled: false,
    offerText: null,
    offerType: "FIXED",
    spinPrizes: null,
    reputationPageEnabled: false,
    socialLinks: null,
    logoDataUrl: null,
    pageTheme: "dark",
    pageTagline: null,
    pageAccentColor: null,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [stripeConnect, setStripeConnect] = useState<{ connected: boolean; active?: boolean } | null>(null)
  const [connectLoading, setConnectLoading] = useState(false)
  const [vapiStatus, setVapiStatus] = useState<{ enabled: boolean; phoneNumber: string | null; assistantId: string | null } | null>(null)
  const [vapiLoading, setVapiLoading] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)

  useEffect(() => {
    if (bizId) {
      fetch(`/api/stripe/connect?biz=${bizId}`).then(r => r.json()).then(setStripeConnect)
      fetch(`/api/vapi/status?biz=${bizId}`).then(r => r.json()).then(d => {
        setVapiStatus({ enabled: d.vapiEnabled ?? false, phoneNumber: d.vapiPhoneNumber ?? null, assistantId: d.vapiAssistantId ?? null })
      }).catch(() => {})
    }
    fetch(`/api/settings${bizParam}`)
      .then(r => r.json())
      .then(data => {
        if (data.business) setForm({
          ...data.business,
          id: data.business.id,
          customSignature: data.business.customSignature ?? "",
          reputationPageEnabled: data.business.reputationPageEnabled ?? false,
          socialLinks: data.business.socialLinks ?? null,
        })
        setLoading(false)
      })
  }, [bizId, bizParam])

  async function handleSave() {
    setSaving(true)
    const res = await fetch(`/api/settings${bizParam}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        customSignature: form.customSignature || null,
        offerText: form.offerText || null,
        spinPrizes: form.offerType === "SPIN_WHEEL" ? (form.spinPrizes ?? DEFAULT_SPIN_PRIZES) : null,
        socialLinks: form.socialLinks,
        reputationPageEnabled: form.reputationPageEnabled,
      }),
    })
    if (res.ok) {
      toast({ title: "Sauvegardé", description: "Vos paramètres ont été mis à jour.", variant: "success" })
    } else {
      toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" })
    }
    setSaving(false)
  }

  async function handleStripeConnect() {
    setConnectLoading(true)
    const res = await fetch("/api/stripe/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bizId }) })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    setConnectLoading(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-sky-500 animate-spin" /></div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
        <p className="text-slate-500 text-sm mt-0.5">Configurez votre établissement</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── TAB: GÉNÉRAL ─── */}
      {tab === "general" && (
        <div className="space-y-5">
          {/* Établissement */}
          <Card>
            <CardHeader>
              <CardTitle>Votre établissement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nom</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Le Jardin de Paris"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RESTAURANT">Restaurant</SelectItem>
                    <SelectItem value="HOTEL">Hôtel</SelectItem>
                    <SelectItem value="BAR">Bar</SelectItem>
                    <SelectItem value="CAFE">Café / Brasserie</SelectItem>
                    <SelectItem value="SPA">Spa / Bien-être</SelectItem>
                    <SelectItem value="HAIR_SALON">Coiffeur</SelectItem>
                    <SelectItem value="BEAUTY">Beauté / Esthétique</SelectItem>
                    <SelectItem value="RETAIL">Commerce / Boutique</SelectItem>
                    <SelectItem value="SERVICE">Prestataire de service</SelectItem>
                    <SelectItem value="OTHER">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Logo</Label>
                <div className="flex items-center gap-4">
                  {form.logoDataUrl ? (
                    <div className="relative">
                      <img src={form.logoDataUrl} alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-slate-200" />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, logoDataUrl: null })}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50">
                      <Upload className="w-5 h-5 text-slate-400" />
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      {form.logoDataUrl ? "Changer" : "Importer"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        if (!["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"].includes(file.type)) {
                          toast({ title: "Format non supporté", description: "Importez une image JPG, PNG, WebP ou SVG.", variant: "destructive" })
                          return
                        }
                        if (file.size > 500 * 1024) {
                          toast({ title: "Image trop lourde", description: "Maximum 500 Ko. Compressez l'image avant de l'importer.", variant: "destructive" })
                          return
                        }
                        const reader = new FileReader()
                        reader.onload = ev => setForm({ ...form, logoDataUrl: ev.target?.result as string })
                        reader.readAsDataURL(file)
                      }}
                    />
                  </label>
                </div>
                <p className="text-xs text-slate-400">Affiché sur votre page réputation publique</p>
              </div>
            </CardContent>
          </Card>

          {/* Thème de la page de réservation */}
          <Card>
            <CardHeader>
              <CardTitle>Thème de la page de réservation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {([
                  { key: "default",    emoji: "🌊", label: "Standard",    primary: "#0ea5e9", pageBg: "#f8fafc" },
                  { key: "hello_kitty",emoji: "🎀", label: "Hello Kitty", primary: "#f472b6", pageBg: "#fff0f6" },
                  { key: "barber",     emoji: "✂️", label: "Barber Shop", primary: "#f59e0b", pageBg: "#0f172a" },
                  { key: "manga",      emoji: "⚡", label: "Manga",       primary: "#dc2626", pageBg: "#ffffff" },
                ] as { key: string; emoji: string; label: string; primary: string; pageBg: string }[]).map(theme => {
                  const isSelected = (form.pageTheme ?? "default") === theme.key
                  return (
                    <button
                      key={theme.key}
                      type="button"
                      onClick={() => setForm({ ...form, pageTheme: theme.key })}
                      className="flex flex-col items-center gap-2 p-2 rounded-xl transition-all"
                      style={{
                        border: isSelected ? `2px solid ${theme.primary}` : "2px solid #e2e8f0",
                        background: isSelected ? `${theme.primary}10` : "transparent",
                      }}
                    >
                      {/* Color preview */}
                      <div className="w-full rounded-lg overflow-hidden" style={{ height: 48 }}>
                        <div style={{ height: "50%", background: theme.primary }} />
                        <div style={{ height: "50%", background: theme.pageBg, border: `1px solid #e2e8f0` }} />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium text-slate-700">{theme.label}</span>
                        {isSelected && (
                          <svg className="w-3.5 h-3.5 ml-0.5" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="7" fill={theme.primary} />
                            <path d="M5 8l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Accroche */}
              <div className="mt-5 space-y-1.5">
                <label className="text-sm font-medium text-slate-900 block">Accroche <span className="text-slate-400 font-normal">(optionnelle)</span></label>
                <input
                  value={form.pageTagline ?? ""}
                  onChange={e => setForm({ ...form, pageTagline: e.target.value || null })}
                  placeholder="Ex : Votre coiffeur de confiance à Paris"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <p className="text-xs text-slate-400">Affichée sous votre nom sur la page de réservation</p>
              </div>

              {/* Couleur personnalisée */}
              <div className="mt-4 space-y-1.5">
                <label className="text-sm font-medium text-slate-900 block">Couleur principale <span className="text-slate-400 font-normal">(remplace celle du thème)</span></label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.pageAccentColor ?? "#0ea5e9"}
                    onChange={e => setForm({ ...form, pageAccentColor: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                  />
                  <span className="text-sm text-slate-500 font-mono">{form.pageAccentColor ?? "Couleur du thème"}</span>
                  {form.pageAccentColor && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, pageAccentColor: null })}
                      className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                    >
                      Réinitialiser
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Google */}
          <Card>
            <CardHeader>
              <CardTitle>Connexion Google Business</CardTitle>
              <CardDescription>Nécessaire pour synchroniser vos avis Google</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.gbpConnectedAt ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">Connecté</p>
                      {form.gbpLocationName && <p className="text-xs text-slate-500">{form.gbpLocationName}</p>}
                    </div>
                  </div>
                  {confirmDisconnect ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Confirmer ?</span>
                      <Button variant="outline" size="sm" onClick={() => setConfirmDisconnect(false)}>Annuler</Button>
                      <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white border-0" onClick={() => { window.location.href = `/api/google/disconnect${bizParam}` }}>
                        Oui, déconnecter
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" className="gap-2 text-red-500 hover:text-red-600 hover:border-red-300" onClick={() => setConfirmDisconnect(true)}>
                      <Unlink className="w-3.5 h-3.5" /> Déconnecter
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">Non connecté</p>
                  <Button variant="outline" size="sm" className="gap-2" asChild>
                    <a href={`/api/google/connect${bizParam}`}>
                      <Globe className="w-3.5 h-3.5" /> Connecter
                    </a>
                  </Button>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600">Place ID Google Maps</Label>
                <Input
                  value={form.gbpLocationId ?? ""}
                  onChange={e => setForm({ ...form, gbpLocationId: e.target.value || null })}
                  placeholder="ChIJ... (trouvable sur Google Maps)"
                  className="text-sm font-mono"
                />
                <p className="text-xs text-slate-400">Recherchez votre établissement sur <a href="https://maps.google.com" target="_blank" rel="noreferrer" className="underline">Google Maps</a>, clic droit sur le pin → copier le Place ID</p>
              </div>
            </CardContent>
          </Card>

          {/* Alertes */}
          <Card>
            <CardHeader>
              <CardTitle>Alertes email</CardTitle>
              <CardDescription>Soyez prévenu des avis négatifs en temps réel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">Avis négatifs (≤ 2 étoiles)</p>
                  <p className="text-xs text-slate-500 mt-0.5">Recevoir un email immédiatement</p>
                </div>
                <Switch checked={form.alertEmailEnabled} onCheckedChange={v => setForm({ ...form, alertEmailEnabled: v })} />
              </div>
              <PushNotificationToggle />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── TAB: AVIS & IA ─── */}
      {tab === "reviews" && (
        <div className="space-y-5">
          {/* Ton */}
          <Card>
            <CardHeader>
              <CardTitle>Ton des réponses IA</CardTitle>
              <CardDescription>Style utilisé pour générer vos réponses aux avis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "PROFESSIONAL", label: "Professionnel", desc: "Formel et soigné" },
                  { value: "FRIENDLY",     label: "Chaleureux",    desc: "Amical et sincère" },
                  { value: "LUXURY",       label: "Luxe",          desc: "Raffiné et premium" },
                  { value: "CASUAL",       label: "Décontracté",   desc: "Naturel et moderne" },
                ].map(tone => (
                  <button
                    key={tone.value}
                    onClick={() => setForm({ ...form, responseTone: tone.value })}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      form.responseTone === tone.value
                        ? "border-sky-500 bg-sky-50"
                        : "border-slate-200 hover:border-sky-200"
                    }`}
                  >
                    <div className="text-sm font-medium text-slate-900">{tone.label}</div>
                    <div className="text-xs text-slate-500">{tone.desc}</div>
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label>Signature personnalisée <span className="text-slate-400 font-normal">(optionnelle)</span></Label>
                <Input
                  value={form.customSignature ?? ""}
                  onChange={e => setForm({ ...form, customSignature: e.target.value })}
                  placeholder={`L'équipe ${form.name || "de votre établissement"}`}
                />
                <p className="text-xs text-slate-400">Laissez vide pour utiliser le nom de l&apos;établissement</p>
              </div>
            </CardContent>
          </Card>

          {/* Plateformes d'avis */}
          <Card>
            <CardHeader>
              <CardTitle>Autres plateformes d&apos;avis</CardTitle>
              <CardDescription>Collez l&apos;URL de votre page sur chaque plateforme pour synchroniser vos avis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2">
                  <span className="text-base">🦉</span> TripAdvisor
                </Label>
                <Input
                  value={form.tripAdvisorUrl ?? ""}
                  onChange={e => setForm({ ...form, tripAdvisorUrl: e.target.value || null })}
                  placeholder="https://www.tripadvisor.fr/Restaurant_Review-..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2">
                  <span className="text-base">🏨</span> Booking.com
                </Label>
                <Input
                  value={form.bookingUrl ?? ""}
                  onChange={e => setForm({ ...form, bookingUrl: e.target.value || null })}
                  placeholder="https://www.booking.com/hotel/fr/..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2">
                  <span className="text-base">⭐</span> Trustpilot
                </Label>
                <Input
                  value={form.trustpilotUrl ?? ""}
                  onChange={e => setForm({ ...form, trustpilotUrl: e.target.value || null })}
                  placeholder="https://fr.trustpilot.com/review/..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Auto-réponse */}
          <Card>
            <CardHeader>
              <CardTitle>Auto-réponse</CardTitle>
              <CardDescription>Publie automatiquement les réponses sans validation manuelle</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">Activer l&apos;auto-réponse</p>
                  <p className="text-xs text-slate-500 mt-0.5">Les réponses sont publiées directement sur Google</p>
                </div>
                <Switch checked={form.autoReplyEnabled} onCheckedChange={v => setForm({ ...form, autoReplyEnabled: v })} />
              </div>
              {form.autoReplyEnabled && (
                <div className="space-y-1.5">
                  <Label>Note minimale pour auto-répondre</Label>
                  <Select value={String(form.autoReplyMinRating)} onValueChange={v => setForm({ ...form, autoReplyMinRating: parseInt(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 étoiles uniquement</SelectItem>
                      <SelectItem value="4">4 étoiles et plus</SelectItem>
                      <SelectItem value="3">3 étoiles et plus</SelectItem>
                      <SelectItem value="1">Tous les avis</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-400">Les avis en dessous du seuil restent en validation manuelle</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* IA Vocale */}
          <Card className="border-violet-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Mic className="w-4 h-4 text-violet-600" />
                </div>
                IA Vocale
              </CardTitle>
              <CardDescription>Un assistant IA répond à vos appels et prend les rendez-vous automatiquement</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!vapiStatus ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
                </div>
              ) : vapiStatus.enabled ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-violet-50 rounded-xl border border-violet-200">
                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-violet-900 text-sm">IA Vocale active ✓</p>
                      <p className="text-violet-700 text-sm font-mono mt-0.5">
                        {vapiStatus.phoneNumber ?? "Numéro en cours d'attribution…"}
                      </p>
                    </div>
                  </div>
                  {vapiStatus.phoneNumber && (
                    <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Où mettre ce numéro</p>
                      {["Fiche Google My Business", "Bio Instagram et Facebook", "Votre site web"].map(item => (
                        <div key={item} className="flex items-center gap-2 text-sm text-slate-600">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> {item}
                        </div>
                      ))}
                    </div>
                  )}
                  <Button variant="outline" className="gap-2 text-red-500 border-red-200 hover:bg-red-50" disabled={vapiLoading}
                    onClick={async () => {
                      if (!bizId) return
                      setVapiLoading(true)
                      await fetch(`/api/vapi/setup?biz=${bizId}`, { method: "DELETE" })
                      setVapiStatus(v => v ? { ...v, enabled: false } : null)
                      setVapiLoading(false)
                      toast({ title: "IA Vocale désactivée", variant: "success" })
                    }}>
                    {vapiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MicOff className="w-4 h-4" />}
                    Désactiver l&apos;IA Vocale
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { icon: "📞", title: "Répond à vos appels", desc: "Même quand vous êtes occupé" },
                      { icon: "📅", title: "Vérifie vos dispos", desc: "En temps réel depuis votre agenda" },
                      { icon: "✅", title: "Confirme le RDV", desc: "Directement dans votre dashboard" },
                    ].map(item => (
                      <div key={item.title} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <span className="text-xl">{item.icon}</span>
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{item.title}</p>
                          <p className="text-slate-500 text-xs">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button className="gap-2 bg-violet-600 hover:bg-violet-700 text-white w-full" disabled={vapiLoading || !bizId}
                    onClick={async () => {
                      if (!bizId) return
                      setVapiLoading(true)
                      const res = await fetch(`/api/vapi/setup?biz=${bizId}`, { method: "POST" })
                      const data = await res.json()
                      if (res.ok) {
                        setVapiStatus({ enabled: true, phoneNumber: null, assistantId: data.assistantId })
                        toast({ title: "IA Vocale activée !", description: "Votre assistant IA est prêt.", variant: "success" })
                      } else {
                        toast({ title: data.error ?? "Erreur", variant: "destructive" })
                      }
                      setVapiLoading(false)
                    }}>
                    {vapiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                    {vapiLoading ? "Configuration en cours…" : "Activer l'IA Vocale"}
                  </Button>
                  <p className="text-xs text-slate-400 text-center">Nécessite une clé Vapi.ai configurée</p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      )}

      {/* ─── TAB: PAIEMENTS ─── */}
      {tab === "advanced" && (
        <div className="space-y-5">

          {/* Stripe Connect */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-violet-500" /> Paiement en ligne
              </CardTitle>
              <CardDescription>Connectez Stripe pour recevoir les paiements de réservations</CardDescription>
            </CardHeader>
            <CardContent>
              {!stripeConnect ? (
                <p className="text-sm text-slate-400 animate-pulse">Chargement…</p>
              ) : stripeConnect.connected && stripeConnect.active ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">Compte Stripe actif</p>
                      <p className="text-xs text-slate-500">Paiements et virements activés</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={handleStripeConnect} disabled={connectLoading}>
                    {connectLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                    Gérer
                  </Button>
                </div>
              ) : stripeConnect.connected ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">En attente de vérification</p>
                      <p className="text-xs text-slate-500">Finalisez votre inscription Stripe</p>
                    </div>
                  </div>
                  <Button size="sm" className="gap-1.5" onClick={handleStripeConnect} disabled={connectLoading}>
                    {connectLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                    Finaliser
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">Aucun compte Stripe connecté</p>
                  <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-500" onClick={handleStripeConnect} disabled={connectLoading}>
                    {connectLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                    Connecter Stripe
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      )}

      {/* Save */}
      <div className="flex justify-end pb-6">
        <Button className="gap-2" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Sauvegarde..." : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}
