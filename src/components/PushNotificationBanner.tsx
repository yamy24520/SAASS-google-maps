"use client"

import { Bell, BellOff, X, Send, Loader2 } from "lucide-react"
import { usePushNotifications } from "@/hooks/usePushNotifications"
import { useState } from "react"

export function PushNotificationBanner() {
  const { state, subscribe } = usePushNotifications()
  const [dismissed, setDismissed] = useState(false)

  if (state === "loading" || state === "unsupported" || state === "subscribed" || state === "denied" || dismissed) return null

  return (
    <div className="flex items-center gap-3 bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 mb-4">
      <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
        <Bell className="w-4 h-4 text-sky-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-sky-900">Activez les notifications</p>
        <p className="text-xs text-sky-600 mt-0.5">Soyez alerté instantanément à chaque nouvelle réservation.</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={subscribe}
          className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
        >
          <Bell className="w-3 h-3" /> Activer
        </button>
        <button onClick={() => setDismissed(true)} className="p-1 text-sky-400 hover:text-sky-600 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// Bloc complet pour l'onglet Paramètres
export function PushNotificationToggle() {
  const { state, error, subscribe, unsubscribe } = usePushNotifications()
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  async function sendTest() {
    setTesting(true)
    setTestResult(null)
    const res = await fetch("/api/push/test", { method: "POST" })
    const data = await res.json()
    setTestResult(res.ok ? `Notification envoyée (${data.sent}/${data.total})` : `Erreur : ${data.error}`)
    setTesting(false)
  }

  const statusText = () => {
    if (state === "unsupported") return "Non supporté par ce navigateur"
    if (state === "denied") return "Bloquées — autorisez dans les réglages du navigateur"
    if (state === "subscribed") return "Activées sur cet appareil"
    if (state === "loading") return "Vérification..."
    return "Désactivées"
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">Notifications push</p>
          <p className="text-xs text-slate-500 mt-0.5">{statusText()}</p>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
        {state !== "unsupported" && state !== "denied" && (
          <button
            onClick={state === "subscribed" ? unsubscribe : subscribe}
            disabled={state === "loading"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
              state === "subscribed"
                ? "bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600"
                : "bg-sky-500 text-white hover:bg-sky-600"
            }`}
          >
            {state === "loading" ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> Chargement</>
            ) : state === "subscribed" ? (
              <><BellOff className="w-3 h-3" /> Désactiver</>
            ) : (
              <><Bell className="w-3 h-3" /> Activer</>
            )}
          </button>
        )}
      </div>

      {state === "subscribed" && (
        <div className="flex items-center gap-3">
          <button
            onClick={sendTest}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            {testing ? "Envoi..." : "Envoyer une notification test"}
          </button>
          {testResult && (
            <p className={`text-xs ${testResult.startsWith("Erreur") ? "text-red-500" : "text-emerald-600"}`}>
              {testResult.startsWith("Erreur") ? "❌" : "✅"} {testResult}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
