"use client"

import { useEffect, useState, useRef } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Copy, Download, ExternalLink, QrCode, CheckCircle2, MapPin, Sparkles, Settings } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

type QRData = {
  reviewUrl: string
  mapsUrl: string
  reputationPageUrl: string
  reputationPageEnabled: boolean
  businessName: string
  businessId: string
}

export default function QRCodePage() {
  const [data, setData] = useState<QRData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [mode, setMode] = useState<"direct" | "page">("direct")
  const qrRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    fetch("/api/qrcode")
      .then((r) => r.json())
      .then((d) => {
        if (d.reviewUrl) {
          setData(d)
          if (d.reputationPageEnabled) setMode("page")
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const activeUrl = mode === "page" ? data?.reputationPageUrl : data?.reviewUrl

  function handleCopy() {
    if (!activeUrl) return
    navigator.clipboard.writeText(activeUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    if (!qrRef.current) return
    const svg = qrRef.current
    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svg)
    const canvas = document.createElement("canvas")
    canvas.width = 400
    canvas.height = 400
    const ctx = canvas.getContext("2d")!
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = "white"
      ctx.fillRect(0, 0, 400, 400)
      ctx.drawImage(img, 0, 0, 400, 400)
      const a = document.createElement("a")
      a.download = `qrcode-avis-${data?.businessName ?? "etablissement"}.png`
      a.href = canvas.toDataURL("image/png")
      a.click()
    }
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!data) return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">QR Code & Lien d&apos;avis</h1>
        <p className="text-slate-500 mt-1">Invitez vos clients à laisser un avis Google</p>
      </div>
      <Card className="border-sky-200 bg-sky-50">
        <CardContent className="pt-6 text-center py-12">
          <QrCode className="w-12 h-12 mx-auto mb-3 text-sky-300" />
          <p className="font-semibold text-sky-900 mb-1">Aucune fiche Google liée</p>
          <p className="text-sm text-sky-700">
            Liez votre fiche dans la page <strong>Réputation</strong> pour générer votre QR code.
          </p>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">QR Code & Lien d&apos;avis</h1>
        <p className="text-slate-500 mt-1">Invitez vos clients à laisser un avis Google en un scan</p>
      </div>

      {/* Mode selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mode de redirection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMode("direct")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                mode === "direct" ? "border-sky-500 bg-sky-50" : "border-slate-200 hover:border-sky-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-sky-500" />
                <span className="text-sm font-semibold text-slate-900">Direct Google</span>
              </div>
              <p className="text-xs text-slate-500">Ouvre directement le formulaire d&apos;avis Google</p>
            </button>
            <button
              onClick={() => setMode("page")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                mode === "page" ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-indigo-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-semibold text-slate-900">Page de réputation</span>
              </div>
              <p className="text-xs text-slate-500">Belle page avec avis, note et réseaux sociaux</p>
            </button>
          </div>

          {mode === "page" && !data.reputationPageEnabled && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <span className="text-amber-500 text-base mt-0.5">⚠️</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-amber-800">Page de réputation désactivée</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Activez-la dans les{" "}
                  <Link href="/settings" className="underline font-semibold">Paramètres</Link>
                  {" "}pour que vos clients puissent y accéder.
                </p>
              </div>
            </div>
          )}

          {mode === "page" && data.reputationPageEnabled && (
            <div className="mt-3 flex gap-2">
              <a
                href={data.reputationPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Prévisualiser la page
                </Button>
              </a>
              <Link href="/settings">
                <Button variant="outline" size="sm" className="gap-2 text-xs">
                  <Settings className="w-3.5 h-3.5" />
                  Configurer
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* QR Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <QrCode className="w-4 h-4 text-sky-500" />
              QR Code imprimable
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="p-6 bg-white rounded-2xl border-2 border-slate-100 shadow-sm">
              <QRCodeSVG
                ref={qrRef}
                value={activeUrl ?? ""}
                size={200}
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="H"
              />
            </div>
            <p className="text-xs text-slate-500 text-center">
              {mode === "page"
                ? <>Scannez pour voir la page de <strong>{data.businessName}</strong></>
                : <>Scannez pour laisser un avis sur <strong>{data.businessName}</strong></>
              }
            </p>
            <Button onClick={handleDownload} className="w-full gap-2">
              <Download className="w-4 h-4" />
              Télécharger en PNG
            </Button>
            <p className="text-xs text-slate-400 text-center">
              Imprimez et posez sur vos tables, comptoir ou tickets de caisse
            </p>
          </CardContent>
        </Card>

        {/* Links */}
        <div className="space-y-4">
          {/* Active URL */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {mode === "page" ? "Lien de votre page de réputation" : "Lien direct vers le formulaire d'avis"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <p className="text-xs text-slate-500 font-mono break-all leading-relaxed">{activeUrl}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={handleCopy}>
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copié !" : "Copier le lien"}
                </Button>
                <a href={activeUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="icon">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Maps link */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="w-4 h-4 text-sky-500" />
                Fiche Google Maps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <a href={data.mapsUrl} target="_blank" rel="noopener noreferrer" className="block">
                <Button variant="outline" className="w-full gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Voir ma fiche Google Maps
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-4 pb-4">
              <p className="text-sm font-semibold text-amber-900 mb-2">💡 Conseils d&apos;utilisation</p>
              <ul className="space-y-1.5 text-xs text-amber-800">
                <li className="flex items-start gap-2"><span>•</span> Posez le QR code sur chaque table</li>
                <li className="flex items-start gap-2"><span>•</span> Ajoutez le lien dans votre signature email</li>
                <li className="flex items-start gap-2"><span>•</span> Partagez sur vos réseaux sociaux après service</li>
                <li className="flex items-start gap-2"><span>•</span> Imprimez sur le ticket de caisse avec un message</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Usage ideas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { emoji: "🍽️", title: "Tables", desc: "Support cartonné ou stand" },
          { emoji: "🧾", title: "Tickets", desc: "Imprimé en bas du reçu" },
          { emoji: "📱", title: "Réseaux", desc: "Stories & posts clients" },
          { emoji: "📧", title: "Emails", desc: "Signature ou newsletter" },
        ].map((tip) => (
          <Card key={tip.title} className="text-center">
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl mb-1">{tip.emoji}</div>
              <p className="text-sm font-semibold text-slate-900">{tip.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{tip.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
