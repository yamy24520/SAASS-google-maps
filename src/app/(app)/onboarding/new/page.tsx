"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Globe, CheckCircle2, MapPin, Palette, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/toaster"

const steps = [
  { id: 1, title: "Connectez Google", icon: Globe },
  { id: 2, title: "Votre établissement", icon: MapPin },
  { id: 3, title: "Personnalisez", icon: Palette },
]

export default function NewBusinessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [step, setStep] = useState(parseInt(searchParams.get("step") ?? "1"))
  const [bizId, setBizId] = useState<string | null>(searchParams.get("biz"))
  const [creatingBiz, setCreatingBiz] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: "",
    category: "RESTAURANT",
    responseTone: "PROFESSIONAL",
    customSignature: "",
  })

  useEffect(() => {
    const error = searchParams.get("error")
    if (error === "google_denied") toast({ title: "Annulé", description: "La connexion Google a été annulée.", variant: "destructive" })
    if (error === "token_failed") toast({ title: "Erreur", description: "Impossible de connecter Google. Réessayez.", variant: "destructive" })
    const stepParam = searchParams.get("step")
    if (stepParam) setStep(parseInt(stepParam))
    const bizParam = searchParams.get("biz")
    if (bizParam) setBizId(bizParam)
  }, [searchParams])

  async function handleConnectGoogle() {
    setCreatingBiz(true)
    // Create business first, then redirect to Google OAuth
    const res = await fetch("/api/business", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Nouvel établissement" }),
    })
    if (!res.ok) {
      toast({ title: "Erreur", description: "Impossible de créer l'établissement.", variant: "destructive" })
      setCreatingBiz(false)
      return
    }
    const { business } = await res.json()
    window.location.href = `/api/google/connect?biz=${business.id}`
  }

  async function saveSettings() {
    if (!bizId) return
    setSaving(true)
    const res = await fetch(`/api/settings?biz=${bizId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      router.push(`/dashboard?biz=${bizId}`)
    } else {
      toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" })
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-cyan-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <p className="text-sm font-medium text-sky-600 bg-sky-50 border border-sky-200 rounded-full px-4 py-1 inline-block">
            Ajout d&apos;un établissement
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                step === s.id
                  ? "gradient-bg text-white shadow-md shadow-sky-500/20"
                  : step > s.id
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-400"
              }`}>
                {step > s.id ? <CheckCircle2 className="w-3 h-3" /> : <s.icon className="w-3 h-3" />}
                {s.title}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-6 h-px ${step > s.id ? "bg-emerald-300" : "bg-slate-200"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
          {step === 1 && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6 shadow-lg shadow-sky-500/25">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Connectez Google Business</h2>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                Autorisez Reputix à accéder aux avis de ce nouvel établissement.
              </p>
              <Button size="lg" className="w-full gap-2" onClick={handleConnectGoogle} disabled={creatingBiz}>
                {creatingBiz ? <Loader2 className="w-5 h-5 animate-spin" /> : <Globe className="w-5 h-5" />}
                {creatingBiz ? "Préparation..." : "Connecter mon compte Google"}
              </Button>
              <p className="text-xs text-slate-400 mt-4">
                Accès sécurisé via OAuth2 · Révocable à tout moment
              </p>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Votre établissement</h2>
              <p className="text-slate-500 text-sm mb-6">Ces informations servent à personnaliser vos réponses.</p>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Nom de l&apos;établissement</Label>
                  <Input
                    placeholder="Le Jardin de Paris"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                <Button className="w-full gap-2" onClick={() => setStep(3)} disabled={!form.name.trim()}>
                  Continuer <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Personnalisez votre ton</h2>
              <p className="text-slate-500 text-sm mb-6">Comment souhaitez-vous vous adresser à vos clients ?</p>
              <div className="space-y-4">
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

                <div className="space-y-1.5">
                  <Label>Signature (optionnelle)</Label>
                  <Input
                    placeholder={`L'équipe ${form.name || "de votre établissement"}`}
                    value={form.customSignature}
                    onChange={(e) => setForm({ ...form, customSignature: e.target.value })}
                  />
                </div>

                <Button className="w-full gap-2" onClick={saveSettings} disabled={saving}>
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Sauvegarde...</> : <>Terminer la configuration <ArrowRight className="w-4 h-4" /></>}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
