"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Save, Loader2, Globe, Unlink, Gift, Plus, Trash2, ExternalLink, Star, CreditCard, CheckCircle2, AlertCircle, Phone, Mic, MicOff } from "lucide-react"
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
  offerEnabled: boolean
  offerText: string | null
  offerType: "FIXED" | "SPIN_WHEEL"
  spinPrizes: SpinPrize[] | null
  reputationPageEnabled: boolean
  socialLinks: { facebook?: string; instagram?: string; website?: string; tripadvisor?: string } | null
  logoDataUrl: string | null
  pageTheme: string
  pageTagline: string | null
  id?: string
}

const DEFAULT_SPIN_PRIZES: SpinPrize[] = [
  { emoji: "🍷", label: "Verre offert", probability: 30 },
  { emoji: "🍮", label: "Dessert offert", probability: 25 },
  { emoji: "💸", label: "-10% sur l'addition", probability: 30 },
  { emoji: "🙏", label: "Merci !", probability: 15 },
]

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const bizId = searchParams.get("biz")
  const bizParam = bizId ? `?biz=${bizId}` : ""

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
    offerEnabled: false,
    offerText: null,
    offerType: "FIXED",
    spinPrizes: null,
    reputationPageEnabled: false,
    socialLinks: null,
    logoDataUrl: null,
    pageTheme: "dark",
    pageTagline: null,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [stripeConnect, setStripeConnect] = useState<{ connected: boolean; active?: boolean; chargesEnabled?: boolean; payoutsEnabled?: boolean } | null>(null)
  const [connectLoading, setConnectLoading] = useState(false)
  const [vapiStatus, setVapiStatus] = useState<{ enabled: boolean; phoneNumber: string | null; assistantId: string | null } | null>(null)
  const [vapiLoading, setVapiLoading] = useState(false)

  useEffect(() => {
    if (bizId) {
      fetch(`/api/stripe/connect?biz=${bizId}`).then(r => r.json()).then(setStripeConnect)
      fetch(`/api/vapi/status?biz=${bizId}`).then(r => r.json()).then(d => {
        setVapiStatus({ enabled: d.vapiEnabled ?? false, phoneNumber: d.vapiPhoneNumber ?? null, assistantId: d.vapiAssistantId ?? null })
      }).catch(() => {})
    }
    fetch(`/api/settings${bizParam}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.business) setForm({
          ...data.business,
          id: data.business.id,
          customSignature: data.business.customSignature ?? "",
          reputationPageEnabled: data.business.reputationPageEnabled ?? false,
          socialLinks: data.business.socialLinks ?? null,
        })
        setLoading(false)
      })
  }, [bizParam])

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

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-sky-500 animate-spin" /></div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
        <p className="text-slate-500 text-sm mt-0.5">Configurez Reputix pour votre établissement</p>
      </div>

      {/* Business info */}
      <Card>
        <CardHeader>
          <CardTitle>Votre établissement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nom de l&apos;établissement</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Le Jardin de Paris"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Type d&apos;établissement</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="RESTAURANT">Restaurant</SelectItem>
                <SelectItem value="HOTEL">Hôtel</SelectItem>
                <SelectItem value="BAR">Bar</SelectItem>
                <SelectItem value="CAFE">Café / Brasserie</SelectItem>
                <SelectItem value="SPA">Spa / Bien-être</SelectItem>
                <SelectItem value="RETAIL">Commerce / Boutique</SelectItem>
                <SelectItem value="SERVICE">Prestataire de service</SelectItem>
                <SelectItem value="OTHER">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Response preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Préférences de réponse</CardTitle>
          <CardDescription>Personnalisez le style des réponses générées par l&apos;IA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Ton des réponses</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "PROFESSIONAL", label: "Professionnel", desc: "Formel et soigné" },
                { value: "FRIENDLY", label: "Chaleureux", desc: "Amical et sincère" },
                { value: "LUXURY", label: "Luxe", desc: "Raffiné et premium" },
                { value: "CASUAL", label: "Décontracté", desc: "Naturel et moderne" },
              ].map((tone) => (
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
          </div>

          <div className="space-y-1.5">
            <Label>Signature personnalisée</Label>
            <Input
              value={form.customSignature ?? ""}
              onChange={(e) => setForm({ ...form, customSignature: e.target.value })}
              placeholder={`L'équipe ${form.name || "de votre établissement"}`}
            />
            <p className="text-xs text-slate-400">Laissez vide pour utiliser le nom de l&apos;établissement</p>
          </div>
        </CardContent>
      </Card>

      {/* Auto-reply */}
      <Card>
        <CardHeader>
          <CardTitle>Auto-réponse</CardTitle>
          <CardDescription>Répondre automatiquement sans validation manuelle</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900 text-sm">Activer l&apos;auto-réponse</p>
              <p className="text-xs text-slate-500 mt-0.5">Répondre automatiquement aux avis</p>
            </div>
            <Switch
              checked={form.autoReplyEnabled}
              onCheckedChange={(v) => setForm({ ...form, autoReplyEnabled: v })}
            />
          </div>

          {form.autoReplyEnabled && (
            <div className="space-y-1.5">
              <Label>Note minimale pour auto-répondre</Label>
              <Select
                value={String(form.autoReplyMinRating)}
                onValueChange={(v) => setForm({ ...form, autoReplyMinRating: parseInt(v) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 étoiles uniquement</SelectItem>
                  <SelectItem value="4">4 étoiles et plus</SelectItem>
                  <SelectItem value="3">3 étoiles et plus</SelectItem>
                  <SelectItem value="1">Tous les avis</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400">Les avis en dessous de ce seuil nécessiteront une validation manuelle</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Alertes email</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900 text-sm">Alertes avis négatifs</p>
              <p className="text-xs text-slate-500 mt-0.5">Recevoir un email pour les avis ≤ 2 étoiles</p>
            </div>
            <Switch
              checked={form.alertEmailEnabled}
              onCheckedChange={(v) => setForm({ ...form, alertEmailEnabled: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Offer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-sky-500" />
            Offre client
          </CardTitle>
          <CardDescription>Proposez une offre pour inciter vos clients à laisser un avis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900 text-sm">Activer l&apos;offre</p>
              <p className="text-xs text-slate-500 mt-0.5">Vos clients reçoivent l&apos;offre par email et sont invités à laisser un avis</p>
            </div>
            <Switch
              checked={form.offerEnabled}
              onCheckedChange={(v) => setForm({ ...form, offerEnabled: v })}
            />
          </div>
          {form.offerEnabled && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Type d&apos;offre</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "FIXED", label: "Offre fixe", desc: "Un cadeau défini à l'avance" },
                    { value: "SPIN_WHEEL", label: "Roulette des cadeaux", desc: "Le client tourne une roue" },
                  ].map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm({ ...form, offerType: t.value as "FIXED" | "SPIN_WHEEL" })}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        form.offerType === t.value
                          ? "border-sky-500 bg-sky-50"
                          : "border-slate-200 hover:border-sky-200"
                      }`}
                    >
                      <div className="text-sm font-medium text-slate-900">{t.label}</div>
                      <div className="text-xs text-slate-500">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {form.offerType === "FIXED" && (
                <div className="space-y-1.5">
                  <Label>Texte de l&apos;offre</Label>
                  <Input
                    value={form.offerText ?? ""}
                    onChange={(e) => setForm({ ...form, offerText: e.target.value })}
                    placeholder="Ex: Un verre offert à votre prochaine visite"
                  />
                  <p className="text-xs text-slate-400">Ce texte sera affiché dans l&apos;email envoyé à vos clients</p>
                </div>
              )}

              {form.offerType === "SPIN_WHEEL" && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Texte de présentation de l&apos;offre</Label>
                    <Input
                      value={form.offerText ?? ""}
                      onChange={(e) => setForm({ ...form, offerText: e.target.value })}
                      placeholder="Ex: Tentez votre chance !"
                    />
                    <p className="text-xs text-slate-400">Affiché dans l&apos;email d&apos;invitation</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Prix de la roulette</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1 h-7 text-xs"
                        onClick={() => {
                          const prizes = form.spinPrizes ?? DEFAULT_SPIN_PRIZES
                          setForm({ ...form, spinPrizes: [...prizes, { emoji: "🎁", label: "Surprise", probability: 10 }] })
                        }}
                      >
                        <Plus className="w-3 h-3" />
                        Ajouter
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {(form.spinPrizes ?? DEFAULT_SPIN_PRIZES).map((prize, i) => {
                        const prizes = form.spinPrizes ?? DEFAULT_SPIN_PRIZES
                        return (
                          <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                            <Input
                              value={prize.emoji}
                              onChange={(e) => {
                                const updated = [...prizes]
                                updated[i] = { ...updated[i], emoji: e.target.value }
                                setForm({ ...form, spinPrizes: updated })
                              }}
                              className="w-14 text-center px-1"
                              placeholder="🎁"
                            />
                            <Input
                              value={prize.label}
                              onChange={(e) => {
                                const updated = [...prizes]
                                updated[i] = { ...updated[i], label: e.target.value }
                                setForm({ ...form, spinPrizes: updated })
                              }}
                              className="flex-1"
                              placeholder="Nom du prix"
                            />
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min={1}
                                max={100}
                                value={prize.probability}
                                onChange={(e) => {
                                  const updated = [...prizes]
                                  updated[i] = { ...updated[i], probability: parseInt(e.target.value) || 1 }
                                  setForm({ ...form, spinPrizes: updated })
                                }}
                                className="w-16 text-center px-1"
                              />
                              <span className="text-xs text-slate-400">%</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-400 hover:text-red-600"
                              onClick={() => {
                                const updated = prizes.filter((_, idx) => idx !== i)
                                setForm({ ...form, spinPrizes: updated.length > 0 ? updated : null })
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-xs text-slate-400">Les probabilités sont relatives — elles n&apos;ont pas besoin de totaliser 100.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reputation page */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            Page de réputation publique
          </CardTitle>
          <CardDescription>Une belle page partageable avec votre note, vos avis et vos réseaux sociaux</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900 text-sm">Activer la page publique</p>
              <p className="text-xs text-slate-500 mt-0.5">Vos clients peuvent la voir via le QR code ou le lien partageable</p>
            </div>
            <Switch
              checked={form.reputationPageEnabled}
              onCheckedChange={(v) => setForm({ ...form, reputationPageEnabled: v })}
            />
          </div>

          {form.reputationPageEnabled && (
            <>
              {form.id && (
                <a
                  href={`/r/${form.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-sky-600 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Prévisualiser ma page publique
                </a>
              )}

              {/* Logo */}
              <div className="space-y-2">
                <Label>Logo de l&apos;établissement</Label>
                <div className="flex items-center gap-4">
                  {form.logoDataUrl ? (
                    <img src={form.logoDataUrl} alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-slate-200" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-2xl font-bold">
                      {form.name ? form.name.charAt(0).toUpperCase() : "?"}
                    </div>
                  )}
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="logo-upload"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const reader = new FileReader()
                        reader.onload = (ev) => {
                          const img = new window.Image()
                          img.onload = () => {
                            const canvas = document.createElement("canvas")
                            const size = 256
                            canvas.width = size
                            canvas.height = size
                            const ctx = canvas.getContext("2d")!
                            const scale = Math.max(size / img.width, size / img.height)
                            const w = img.width * scale
                            const h = img.height * scale
                            ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
                            setForm({ ...form, logoDataUrl: canvas.toDataURL("image/jpeg", 0.85) })
                          }
                          img.src = ev.target?.result as string
                        }
                        reader.readAsDataURL(file)
                        e.target.value = ""
                      }}
                    />
                    <Label htmlFor="logo-upload" className="cursor-pointer inline-flex items-center gap-2 text-xs text-sky-600 border border-sky-300 rounded-lg px-3 py-1.5 hover:bg-sky-50 transition-colors">
                      <Star className="w-3 h-3" />
                      {form.logoDataUrl ? "Changer le logo" : "Uploader un logo"}
                    </Label>
                    {form.logoDataUrl && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, logoDataUrl: null })}
                        className="block text-xs text-red-400 hover:text-red-600"
                      >
                        Supprimer
                      </button>
                    )}
                    <p className="text-xs text-slate-400">PNG, JPG — redimensionné à 256×256</p>
                  </div>
                </div>
              </div>

              {/* Tagline */}
              <div className="space-y-1.5">
                <Label>Accroche / description courte</Label>
                <Input
                  value={form.pageTagline ?? ""}
                  onChange={(e) => setForm({ ...form, pageTagline: e.target.value || null })}
                  placeholder="Ex : Restaurant gastronomique au cœur de Bergerac"
                />
                <p className="text-xs text-slate-400">Affichée sous le nom de votre établissement</p>
              </div>

              {/* Theme */}
              <div className="space-y-2">
                <Label>Thème de la page</Label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { key: "dark",   label: "Sombre",   bg: "#1e293b", accent: "#f59e0b" },
                    { key: "light",  label: "Clair",    bg: "#f1f5f9", accent: "#6366f1" },
                    { key: "warm",   label: "Chaleur",  bg: "#7c2d12", accent: "#fbbf24" },
                    { key: "ocean",  label: "Océan",    bg: "#0e7490", accent: "#38bdf8" },
                    { key: "forest", label: "Forêt",    bg: "#14532d", accent: "#4ade80" },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setForm({ ...form, pageTheme: t.key })}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                        form.pageTheme === t.key ? "border-sky-500 scale-105" : "border-transparent hover:border-slate-300"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: t.bg }}>
                        <div className="w-3 h-3 rounded-full" style={{ background: t.accent }} />
                      </div>
                      <span className="text-xs text-slate-600">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Social links */}
              <div className="space-y-3 pt-1">
                <p className="text-sm font-medium text-slate-700">Liens réseaux sociaux <span className="text-xs font-normal text-slate-400">(optionnels)</span></p>
                {[
                  { key: "facebook",    label: "Facebook",    placeholder: "https://facebook.com/votretablissement" },
                  { key: "instagram",   label: "Instagram",   placeholder: "https://instagram.com/votretablissement" },
                  { key: "tripadvisor", label: "TripAdvisor", placeholder: "https://tripadvisor.fr/..." },
                  { key: "website",     label: "Site web",    placeholder: "https://votresite.fr" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <Input
                      value={(form.socialLinks as Record<string, string> | null)?.[key] ?? ""}
                      onChange={(e) => setForm({
                        ...form,
                        socialLinks: { ...(form.socialLinks ?? {}), [key]: e.target.value },
                      })}
                      placeholder={placeholder}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Google connection */}
      <Card>
        <CardHeader>
          <CardTitle>Connexion Google</CardTitle>
        </CardHeader>
        <CardContent>
          {form.gbpConnectedAt ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-medium text-slate-900">Connecté</span>
                </div>
                {form.gbpLocationName && (
                  <p className="text-xs text-slate-500 mt-0.5">{form.gbpLocationName}</p>
                )}
              </div>
              <Button variant="outline" size="sm" className="gap-2 text-red-500 hover:text-red-600 hover:border-red-300" asChild>
                <a href={`/api/google/disconnect${bizParam}`}>
                  <Unlink className="w-3.5 h-3.5" />
                  Déconnecter
                </a>
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Google Business Profile non connecté</p>
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <a href={`/api/google/connect${bizParam}`}>
                  <Globe className="w-3.5 h-3.5" />
                  Connecter
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stripe Connect */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-violet-500" /> Paiement en ligne (Stripe Connect)
          </CardTitle>
          <CardDescription>Connectez votre compte Stripe pour recevoir les paiements de réservations directement.</CardDescription>
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
                  <p className="text-xs text-slate-500 mt-0.5">Paiements et virements activés</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={async () => {
                setConnectLoading(true)
                const res = await fetch("/api/stripe/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bizId }) })
                const data = await res.json()
                if (data.url) window.location.href = data.url
                setConnectLoading(false)
              }} disabled={connectLoading}>
                {connectLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                Gérer le compte
              </Button>
            </div>
          ) : stripeConnect.connected && !stripeConnect.active ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Compte en attente de vérification</p>
                  <p className="text-xs text-slate-500 mt-0.5">Finalisez votre inscription Stripe pour activer les paiements</p>
                </div>
              </div>
              <Button size="sm" className="gap-2" onClick={async () => {
                setConnectLoading(true)
                const res = await fetch("/api/stripe/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bizId }) })
                const data = await res.json()
                if (data.url) window.location.href = data.url
                setConnectLoading(false)
              }} disabled={connectLoading}>
                {connectLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                Finaliser l&apos;inscription
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Aucun compte Stripe connecté</p>
              <Button size="sm" className="gap-2 bg-violet-600 hover:bg-violet-500" onClick={async () => {
                setConnectLoading(true)
                const res = await fetch("/api/stripe/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bizId }) })
                const data = await res.json()
                if (data.url) window.location.href = data.url
                setConnectLoading(false)
              }} disabled={connectLoading}>
                {connectLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                Connecter Stripe
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications push */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            🔔 Notifications push
          </CardTitle>
          <CardDescription>Recevez une alerte instantanée sur cet appareil à chaque nouveau RDV</CardDescription>
        </CardHeader>
        <CardContent>
          <PushNotificationToggle />
        </CardContent>
      </Card>

      {/* IA Vocale */}
      <Card className="border-violet-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
              <Mic className="w-4 h-4 text-violet-600" />
            </div>
            IA Vocale — Répondeur automatique
          </CardTitle>
          <CardDescription>
            Un assistant IA répond à vos appels, vérifie vos disponibilités et prend les rendez-vous automatiquement — même quand vous êtes occupé.
          </CardDescription>
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
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-violet-900 text-sm">IA Vocale active ✓</p>
                  {vapiStatus.phoneNumber ? (
                    <p className="text-violet-700 text-sm font-mono mt-0.5">{vapiStatus.phoneNumber}</p>
                  ) : (
                    <p className="text-violet-600 text-xs mt-0.5">Numéro en cours d&apos;attribution…</p>
                  )}
                </div>
              </div>
              {vapiStatus.phoneNumber && (
                <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Où mettre ce numéro</p>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    Fiche Google My Business (numéro de contact)
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    Bio Instagram et Facebook
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    Votre site web
                  </div>
                </div>
              )}
              <Button
                variant="outline"
                className="gap-2 text-red-500 border-red-200 hover:bg-red-50"
                disabled={vapiLoading}
                onClick={async () => {
                  if (!bizId) return
                  setVapiLoading(true)
                  await fetch(`/api/vapi/setup?biz=${bizId}`, { method: "DELETE" })
                  setVapiStatus(v => v ? { ...v, enabled: false } : null)
                  setVapiLoading(false)
                  toast({ title: "IA Vocale désactivée", variant: "success" })
                }}
              >
                {vapiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MicOff className="w-4 h-4" />}
                Désactiver l&apos;IA Vocale
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 text-sm">
                {[
                  { icon: "📞", title: "Répond à vos appels", desc: "Même quand vous êtes en train de travailler" },
                  { icon: "📅", title: "Vérifie vos dispos", desc: "En temps réel depuis votre agenda Reputix" },
                  { icon: "✅", title: "Confirme le RDV", desc: "Directement dans votre dashboard" },
                ].map(item => (
                  <div key={item.title} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <span className="text-xl">{item.icon}</span>
                    <div>
                      <p className="font-medium text-slate-900">{item.title}</p>
                      <p className="text-slate-500 text-xs">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                className="gap-2 bg-violet-600 hover:bg-violet-700 text-white w-full"
                disabled={vapiLoading || !bizId}
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
                }}
              >
                {vapiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                {vapiLoading ? "Configuration en cours…" : "Activer l'IA Vocale"}
              </Button>
              <p className="text-xs text-slate-400 text-center">Nécessite une clé Vapi.ai configurée</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button className="gap-2" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Sauvegarde..." : "Enregistrer les modifications"}
        </Button>
      </div>
    </div>
  )
}
