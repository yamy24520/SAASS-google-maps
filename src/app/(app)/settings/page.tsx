"use client"

import { useEffect, useState } from "react"
import { Save, Loader2, Globe, Unlink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "@/components/ui/toaster"

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
}

export default function SettingsPage() {
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
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.business) setForm({ ...data.business, customSignature: data.business.customSignature ?? "" })
        setLoading(false)
      })
  }, [])

  async function handleSave() {
    setSaving(true)
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, customSignature: form.customSignature || null }),
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
                <a href="/api/google/disconnect">
                  <Unlink className="w-3.5 h-3.5" />
                  Déconnecter
                </a>
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Google Business Profile non connecté</p>
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <a href="/api/google/connect">
                  <Globe className="w-3.5 h-3.5" />
                  Connecter
                </a>
              </Button>
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
