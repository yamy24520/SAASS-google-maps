"use client"

import { useEffect, useState, useRef } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Copy, Download, ExternalLink, QrCode, CheckCircle2, MapPin } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function QRCodePage() {
  const [data, setData] = useState<{ reviewUrl: string; mapsUrl: string; businessName: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const qrRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    fetch("/api/qrcode")
      .then((r) => r.json())
      .then((d) => { setData(d.reviewUrl ? d : null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function handleCopy() {
    if (!data) return
    navigator.clipboard.writeText(data.reviewUrl)
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
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgStr)))
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
          <p className="text-sm text-sky-700">Liez votre fiche dans la page <strong>Réputation</strong> pour générer votre QR code.</p>
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
                value={data.reviewUrl}
                size={200}
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="H"
              />
            </div>
            <p className="text-xs text-slate-500 text-center">
              Scannez pour laisser un avis sur <strong>{data.businessName}</strong>
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
          {/* Review link */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Lien direct vers le formulaire d&apos;avis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <p className="text-xs text-slate-500 font-mono break-all leading-relaxed">{data.reviewUrl}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={handleCopy}>
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copié !" : "Copier le lien"}
                </Button>
                <a href={data.reviewUrl} target="_blank" rel="noopener noreferrer">
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
                Lien vers votre fiche Google Maps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <p className="text-xs text-slate-500 font-mono break-all leading-relaxed">{data.mapsUrl}</p>
              </div>
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
