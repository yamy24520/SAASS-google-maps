"use client"

import { useEffect, useState, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { Save, Loader2, Mail, Image as ImageIcon, Palette, Type, Eye, RotateCcw } from "lucide-react"
import { toast } from "@/components/ui/toaster"

const DEFAULT_HEADER = "https://reputix.net/2026-VDay-Email-Header.gif"
const DEFAULT_BG = "#F5F2EA"
const DEFAULT_BUTTON = "#1A1714"

interface EmailSettings {
  emailHeaderUrl: string | null
  emailBgColor: string | null
  emailButtonColor: string | null
  emailGreeting: string | null
  emailFooterMessage: string | null
  emailSenderName: string | null
  name: string
}

function buildPreviewHtml(settings: EmailSettings) {
  const bg = settings.emailBgColor || DEFAULT_BG
  const btn = settings.emailButtonColor || DEFAULT_BUTTON
  const headerUrl = settings.emailHeaderUrl !== undefined ? settings.emailHeaderUrl : DEFAULT_HEADER
  const footerMsg = settings.emailFooterMessage || `Cet email vous a été envoyé suite à votre réservation chez <strong>${settings.name || "votre établissement"}</strong>.`
  const greeting = settings.emailGreeting || `Votre demande de rendez-vous a bien été reçue. Vous recevrez une confirmation dès validation par l'établissement.`
  const bizName = settings.name || "Mon Établissement"

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${bg};font-family:-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${bg};padding:24px 12px 0;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr>
          <td style="background:#FDFAF4;border:1px solid #E8E4D9;">
            <!-- Top bar -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="background:${btn};padding:16px 40px;">
                <span style="font-family:sans-serif;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#F5F2EA;">${bizName}</span>
              </td></tr>
            </table>
            ${headerUrl ? `<img src="${headerUrl}" width="560" style="display:block;width:100%;height:auto;" alt=""/>` : ""}
            <!-- Hero -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:${headerUrl ? "32px" : "40px"} 40px 8px;">
                <p style="margin:0 0 8px;font-family:sans-serif;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#9C9589;">Votre réservation</p>
                <h1 style="margin:0;font-family:Georgia,serif;font-size:32px;line-height:40px;font-weight:400;color:#1A1714;">Réservation reçue.</h1>
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:0 40px;"><div style="height:1px;background:#E8E4D9;">&nbsp;</div></td></tr>
            </table>
            <!-- Body -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:24px 40px 40px;">
                <p style="font-family:sans-serif;font-size:15px;line-height:1.7;color:#1A1714;margin:0 0 6px;">Bonjour <strong>Marie Dupont</strong>,</p>
                <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#6B6358;margin:0 0 24px;">${greeting}</p>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr><td style="padding:12px 0;font-family:sans-serif;font-size:13px;color:#6B6358;border-bottom:1px solid #E8E4D9;">Date</td><td style="padding:12px 0;font-family:sans-serif;font-size:13px;font-weight:600;color:#1A1714;text-align:right;border-bottom:1px solid #E8E4D9;"><strong>mardi 14 avril 2026</strong></td></tr>
                  <tr><td style="padding:12px 0;font-family:sans-serif;font-size:13px;color:#6B6358;border-bottom:1px solid #E8E4D9;">Heure</td><td style="padding:12px 0;font-family:sans-serif;font-size:13px;font-weight:600;color:#1A1714;text-align:right;border-bottom:1px solid #E8E4D9;">14:30</td></tr>
                  <tr><td style="padding:12px 0;font-family:sans-serif;font-size:13px;color:#6B6358;">Prestation</td><td style="padding:12px 0;font-family:sans-serif;font-size:13px;font-weight:600;color:#1A1714;text-align:right;">Coupe + Brushing</td></tr>
                </table>
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                  <tr><td style="background:${btn};padding:15px 24px;text-align:center;">
                    <span style="font-family:sans-serif;font-size:14px;font-weight:600;color:#F5F2EA;">Gérer mes réservations</span>
                  </td></tr>
                </table>
              </td></tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:${btn};padding:24px 40px 20px;">
            <p style="margin:0 0 6px;font-family:sans-serif;font-size:12px;font-weight:300;color:#C8C2B6;line-height:18px;">${footerMsg}</p>
            <p style="margin:0;font-family:sans-serif;font-size:11px;color:#6B6358;">Propulsé par <span style="color:#9C9589;font-weight:600;">Reputix</span></p>
          </td>
        </tr>
        <tr><td style="padding-bottom:24px;"></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function EmailsPageInner() {
  const searchParams = useSearchParams()
  const bizId = searchParams.get("biz")

  const [settings, setSettings] = useState<EmailSettings>({
    emailHeaderUrl: null,
    emailBgColor: null,
    emailButtonColor: null,
    emailGreeting: null,
    emailFooterMessage: null,
    emailSenderName: null,
    name: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const url = bizId ? `/api/settings?biz=${bizId}` : "/api/settings"
    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (d.business) {
          setSettings({
            emailHeaderUrl: d.business.emailHeaderUrl ?? null,
            emailBgColor: d.business.emailBgColor ?? null,
            emailButtonColor: d.business.emailButtonColor ?? null,
            emailGreeting: d.business.emailGreeting ?? null,
            emailFooterMessage: d.business.emailFooterMessage ?? null,
            emailSenderName: d.business.emailSenderName ?? null,
            name: d.business.name ?? "",
          })
        }
      })
      .finally(() => setLoading(false))
  }, [bizId])

  // Update iframe preview on settings change
  useEffect(() => {
    if (!iframeRef.current) return
    const html = buildPreviewHtml(settings)
    const doc = iframeRef.current.contentDocument
    if (doc) {
      doc.open()
      doc.write(html)
      doc.close()
    }
  }, [settings])

  async function save() {
    setSaving(true)
    try {
      const url = bizId ? `/api/settings?biz=${bizId}` : "/api/settings"
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailHeaderUrl: settings.emailHeaderUrl,
          emailBgColor: settings.emailBgColor,
          emailButtonColor: settings.emailButtonColor,
          emailGreeting: settings.emailGreeting,
          emailFooterMessage: settings.emailFooterMessage,
          emailSenderName: settings.emailSenderName,
        }),
      })
      if (!res.ok) throw new Error()
      toast({ title: "Sauvegardé", description: "Paramètres email mis à jour.", variant: "success" })
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  function reset() {
    setSettings(s => ({
      ...s,
      emailHeaderUrl: null,
      emailBgColor: null,
      emailButtonColor: null,
      emailGreeting: null,
      emailFooterMessage: null,
      emailSenderName: null,
    }))
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Emails clients</h1>
          <p className="text-sm text-slate-500 mt-1">Personnalisez les emails envoyés à vos clients lors de leurs réservations.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reset} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <RotateCcw className="w-4 h-4" />
            Réinitialiser
          </button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Sauvegarder
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-4">

          {/* Image header */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="w-4 h-4 text-slate-500" />
              <h2 className="font-semibold text-slate-800 text-sm">Image en-tête</h2>
            </div>
            <p className="text-xs text-slate-500 mb-3">URL d'une image ou d'un GIF affiché en haut de l'email. Laissez vide pour supprimer.</p>
            <input
              type="url"
              value={settings.emailHeaderUrl ?? ""}
              onChange={e => setSettings(s => ({ ...s, emailHeaderUrl: e.target.value || null }))}
              placeholder={`${DEFAULT_HEADER} (défaut)`}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 placeholder:text-slate-300"
            />
            {settings.emailHeaderUrl && (
              <div className="mt-3 rounded-lg overflow-hidden border border-slate-100">
                <img src={settings.emailHeaderUrl} alt="Preview" className="w-full h-auto max-h-40 object-cover" />
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setSettings(s => ({ ...s, emailHeaderUrl: DEFAULT_HEADER }))}
                className="text-xs text-slate-500 hover:text-slate-900 underline"
              >
                Remettre le GIF par défaut
              </button>
              <span className="text-xs text-slate-300">·</span>
              <button
                onClick={() => setSettings(s => ({ ...s, emailHeaderUrl: null }))}
                className="text-xs text-slate-500 hover:text-red-600 underline"
              >
                Supprimer l'image
              </button>
            </div>
          </div>

          {/* Couleurs */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-4 h-4 text-slate-500" />
              <h2 className="font-semibold text-slate-800 text-sm">Couleurs</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Fond de l'email</label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="color"
                      value={settings.emailBgColor || DEFAULT_BG}
                      onChange={e => setSettings(s => ({ ...s, emailBgColor: e.target.value }))}
                      className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                    />
                  </div>
                  <input
                    type="text"
                    value={settings.emailBgColor || ""}
                    onChange={e => setSettings(s => ({ ...s, emailBgColor: e.target.value || null }))}
                    placeholder={DEFAULT_BG}
                    className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 placeholder:text-slate-300 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Couleur du bouton & header</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.emailButtonColor || DEFAULT_BUTTON}
                    onChange={e => setSettings(s => ({ ...s, emailButtonColor: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={settings.emailButtonColor || ""}
                    onChange={e => setSettings(s => ({ ...s, emailButtonColor: e.target.value || null }))}
                    placeholder={DEFAULT_BUTTON}
                    className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 placeholder:text-slate-300 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Textes */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Type className="w-4 h-4 text-slate-500" />
              <h2 className="font-semibold text-slate-800 text-sm">Textes personnalisés</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Message de confirmation</label>
                <p className="text-xs text-slate-400 mb-1.5">Affiché sous le prénom du client dans les emails de réservation reçue.</p>
                <textarea
                  value={settings.emailGreeting ?? ""}
                  onChange={e => setSettings(s => ({ ...s, emailGreeting: e.target.value || null }))}
                  placeholder="Votre demande de rendez-vous a bien été reçue. Vous recevrez une confirmation dès validation."
                  rows={3}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 placeholder:text-slate-300 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Message du pied de mail</label>
                <p className="text-xs text-slate-400 mb-1.5">Affiché dans le footer sombre en bas de l'email.</p>
                <textarea
                  value={settings.emailFooterMessage ?? ""}
                  onChange={e => setSettings(s => ({ ...s, emailFooterMessage: e.target.value || null }))}
                  placeholder={`Cet email vous a été envoyé suite à votre réservation chez ${settings.name || "votre établissement"}.`}
                  rows={2}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 placeholder:text-slate-300 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Nom d'expéditeur</label>
                <p className="text-xs text-slate-400 mb-1.5">Nom affiché dans la boîte de réception du client (ex: "Le Saint James").</p>
                <input
                  type="text"
                  value={settings.emailSenderName ?? ""}
                  onChange={e => setSettings(s => ({ ...s, emailSenderName: e.target.value || null }))}
                  placeholder={settings.name || "Nom de l'établissement"}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 placeholder:text-slate-300"
                />
              </div>
            </div>
          </div>

          {/* Info emails owner */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-1">Emails de notification (vous)</p>
                <p className="text-xs text-slate-500 leading-relaxed">Les emails que vous recevez (nouvelles demandes, annulations, modifications) ont un style sobre dédié — sans image, sans personnalisation. Ils sont conçus pour être clairs et rapides à lire.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="xl:sticky xl:top-4 self-start">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <Eye className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">Aperçu en temps réel</span>
              <span className="ml-auto text-xs text-slate-400">Email reçu par vos clients</span>
            </div>
            <div className="bg-slate-100 p-2">
              <iframe
                ref={iframeRef}
                className="w-full rounded-lg"
                style={{ height: "680px", border: "none" }}
                title="Email preview"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EmailsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>}>
      <EmailsPageInner />
    </Suspense>
  )
}
