"use client"

import { useEffect, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Copy, CheckCircle2, Users, Send, TrendingUp, Gift, ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default function CampaignsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
  }, [])

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

  if (!business?.offerEnabled) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campagne d&apos;avis</h1>
          <p className="text-slate-500 mt-1">Invitez vos clients avec une offre exclusive</p>
        </div>
        <Card className="border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-50">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
              <Gift className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Activez votre offre client</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
              Configurez une offre (verre offert, réduction...) dans les paramètres. Vos clients laissent leur email, reçoivent l&apos;offre, et sont invités à laisser un avis Google.
            </p>
            <Link href="/settings">
              <Button className="gap-2">
                <Gift className="w-4 h-4" />
                Configurer mon offre
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Campagne d&apos;avis</h1>
        <p className="text-slate-500 mt-1">Suivez vos inscriptions et partagez votre lien</p>
      </div>

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
                    </div>
                  </div>
                  <Badge className={r.status === "SENT" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600"}>
                    {r.status === "SENT" ? "✓ Envoyé" : "En attente"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
