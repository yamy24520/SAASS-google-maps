"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { QRCodeSVG } from "qrcode.react"
import { Copy, CheckCircle2, Users, Send, TrendingUp, Gift, ExternalLink, Trash2, Settings2, Save, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/toaster"

interface SpinPrize {
  emoji: string
  label: string
  probability: number
}

const DEFAULT_SPIN_PRIZES: SpinPrize[] = [
  { emoji: "🍷", label: "Verre offert", probability: 30 },
  { emoji: "🍮", label: "Dessert offert", probability: 25 },
  { emoji: "💸", label: "-10% sur l'addition", probability: 30 },
  { emoji: "🙏", label: "Merci !", probability: 15 },
]

export default function CampaignsPage() {
  const searchParams = useSearchParams()
  const bizId = searchParams.get("biz")
  const bizParam = bizId ? `?biz=${bizId}` : ""

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [saving, setSaving] = useState(false)
  const [offerEnabled, setOfferEnabled] = useState(false)
  const [offerType, setOfferType] = useState<"FIXED" | "SPIN_WHEEL">("FIXED")
  const [offerText, setOfferText] = useState("")
  const [spinPrizes, setSpinPrizes] = useState<SpinPrize[]>(DEFAULT_SPIN_PRIZES)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/campaigns${bizParam}`)
    const json = await res.json()
    setData(json)
    if (json?.business) {
      setOfferEnabled(json.business.offerEnabled ?? false)
      setOfferType(json.business.offerType ?? "FIXED")
      setOfferText(json.business.offerText ?? "")
      setSpinPrizes(json.business.spinPrizes ?? DEFAULT_SPIN_PRIZES)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [bizParam]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveOffer() {
    setSaving(true)
    const res = await fetch(`/api/settings${bizParam}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        offerEnabled,
        offerType,
        offerText: offerText || null,
        spinPrizes: offerType === "SPIN_WHEEL" ? spinPrizes : null,
      }),
    })
    if (res.ok) {
      toast({ title: "Offre sauvegardée", variant: "success" })
      setShowConfig(false)
      await load()
    } else {
      toast({ title: "Erreur lors de la sauvegarde", variant: "destructive" })
    }
    setSaving(false)
  }

  async function handleReset() {
    if (!confirm("Réinitialiser la campagne ? Toutes les inscriptions seront supprimées.")) return
    setResetting(true)
    await fetch(`/api/campaigns${bizParam}`, { method: "DELETE" })
    await load()
    setResetting(false)
  }

  function handleCopy() {
    if (!data?.business?.collectUrl) return
    navigator.clipboard.writeText(data.business.collectUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const { business, stats, requests } = data ?? {}

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campagne d&apos;avis</h1>
          <p className="text-slate-500 mt-1">Invitez vos clients avec une offre exclusive</p>
        </div>
        <div className="flex items-center gap-2">
          {(stats?.total ?? 0) > 0 && (
            <Button variant="outline" size="sm" onClick={handleReset} disabled={resetting} className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
              {resetting ? "Réinitialisation..." : "Réinitialiser"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowConfig(v => !v)} className="gap-2">
            <Settings2 className="w-4 h-4" />
            Configurer
          </Button>
        </div>
      </div>

      {/* ─── Configuration offre ─── */}
      {showConfig && (
        <Card className="border-sky-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-sky-500" /> Configuration de l&apos;offre
            </CardTitle>
            <CardDescription>Définissez ce que vous offrez à vos clients en échange d&apos;un avis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">Activer la campagne</p>
                <p className="text-xs text-slate-500 mt-0.5">Affiche la page de collecte d&apos;emails</p>
              </div>
              <Switch checked={offerEnabled} onCheckedChange={setOfferEnabled} />
            </div>
            {offerEnabled && (
              <>
                <div className="space-y-1.5">
                  <Label>Type d&apos;offre</Label>
                  <Select value={offerType} onValueChange={v => setOfferType(v as "FIXED" | "SPIN_WHEEL")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIXED">Offre fixe</SelectItem>
                      <SelectItem value="SPIN_WHEEL">Roue de la chance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {offerType === "FIXED" && (
                  <div className="space-y-1.5">
                    <Label>Description de l&apos;offre</Label>
                    <Input
                      value={offerText}
                      onChange={e => setOfferText(e.target.value)}
                      placeholder="Ex: Un verre offert pour tout avis laissé"
                    />
                  </div>
                )}
                {offerType === "SPIN_WHEEL" && (
                  <div className="space-y-2">
                    <Label>Lots de la roue</Label>
                    {spinPrizes.map((prize, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          value={prize.emoji}
                          onChange={e => {
                            const p = [...spinPrizes]; p[i] = { ...p[i], emoji: e.target.value }; setSpinPrizes(p)
                          }}
                          className="w-16 text-center"
                        />
                        <Input
                          value={prize.label}
                          onChange={e => {
                            const p = [...spinPrizes]; p[i] = { ...p[i], label: e.target.value }; setSpinPrizes(p)
                          }}
                          placeholder="Lot"
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          value={prize.probability}
                          onChange={e => {
                            const p = [...spinPrizes]; p[i] = { ...p[i], probability: parseInt(e.target.value) || 0 }; setSpinPrizes(p)
                          }}
                          className="w-20"
                          placeholder="%"
                        />
                        <span className="text-xs text-slate-400">%</span>
                      </div>
                    ))}
                    <p className="text-xs text-slate-400">Total : {spinPrizes.reduce((s, p) => s + p.probability, 0)}%</p>
                  </div>
                )}
              </>
            )}
            <Button className="gap-2 w-full" onClick={handleSaveOffer} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Sauvegarde..." : "Enregistrer"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ─── Pas d'offre active ─── */}
      {!business?.offerEnabled && !showConfig && (
        <Card className="border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-50">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
              <Gift className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Activez votre offre client</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
              Configurez une offre (verre offert, réduction...) pour collecter des emails. Vos clients reçoivent l&apos;offre et sont invités à laisser un avis Google.
            </p>
            <Button className="gap-2" onClick={() => setShowConfig(true)}>
              <Gift className="w-4 h-4" />
              Configurer mon offre
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ─── Offre active ─── */}
      {business?.offerEnabled && (
        <>
          {/* Active offer banner */}
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🎁</div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">Offre active</p>
                    <p className="text-sm text-emerald-700">{business.offerText}</p>
                  </div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total inscrits", value: stats?.total ?? 0, icon: Users, color: "text-sky-500" },
              { label: "Emails envoyés", value: stats?.sent ?? 0, icon: Send, color: "text-emerald-500" },
              { label: "Cette semaine", value: stats?.thisWeek ?? 0, icon: TrendingUp, color: "text-amber-500" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500">{s.label}</p>
                      <p className="text-2xl font-bold text-slate-900 mt-0.5">{s.value}</p>
                    </div>
                    <s.icon className={`w-7 h-7 ${s.color}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* QR + Link */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">QR Code de la campagne</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <div className="p-5 bg-white rounded-2xl border-2 border-slate-100">
                  <QRCodeSVG value={business.collectUrl} size={160} bgColor="#ffffff" fgColor="#0f172a" level="H" />
                </div>
                <p className="text-xs text-slate-500 text-center">Scannez pour recevoir l&apos;offre <strong>{business.offerText}</strong></p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lien à partager</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-xs text-slate-500 font-mono break-all">{business.collectUrl}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-2" onClick={handleCopy}>
                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copié !" : "Copier"}
                  </Button>
                  <a href={business.collectUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="icon"><ExternalLink className="w-4 h-4" /></Button>
                  </a>
                </div>
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-medium text-slate-700">Idées de partage :</p>
                  {["Partagez en story Instagram", "Envoyez par WhatsApp à vos habitués", "Affichez le QR code en caisse"].map((tip) => (
                    <div key={tip} className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="text-sky-400">•</span> {tip}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent signups */}
          {requests?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dernières inscriptions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {requests.slice(0, 10).map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 text-sm font-bold">
                          {r.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm text-slate-700">{r.email}</p>
                          <p className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString("fr-FR")}</p>
                          {r.prizeWon && (
                            <p className="text-xs text-purple-600 font-medium mt-0.5">{r.prizeWon}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={r.status === "SENT" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600"}>
                          {r.status === "SENT" ? "✓ Envoyé" : "En attente"}
                        </Badge>
                        {r.claimStatus === "CLAIMED" ? (
                          <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                            🎁 Réclamé
                          </Badge>
                        ) : r.status === "SENT" ? (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                            En attente
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
