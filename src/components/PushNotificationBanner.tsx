"use client"

import { Bell, BellOff, X, Send } from "lucide-react"
import { usePushNotifications } from "@/hooks/usePushNotifications"
import { useState } from "react"

export function PushNotificationBanner() {
  const { state, subscribe, unsubscribe } = usePushNotifications()
  const [dismissed, setDismissed] = useState(false)

  // Ne rien afficher si : chargement, pas supporté, déjà abonné, refusé par l'user, ou fermé
  if (state === "loading" || state === "unsupported" || state === "subscribed" || dismissed) return null
  if (state === "denied") return null

  return (
    <div className="flex items-center gap-3 bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 mb-4">
      <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
        <Bell className="w-4 h-4 text-sky-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-sky-900">Activez les notifications</p>
        <p className="text-xs text-sky-600 mt-0.5">Soyez alerté instantanément à chaque nouvelle réservation, même si l&apos;onglet est fermé.</p>
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

// Bouton compact pour les settings
export function PushNotificationToggle() {
  const { state, subscribe, unsubscribe } = usePushNotifications()
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  async function sendTest() {
    setTesting(true)
    setTestResult(null)
    const res = await fetch("/api/push/test", { method: "POST" })
    const data = await res.json()
    setTestResult(res.ok ? `✅ Notification envoyée (${data.sent}/${data.total})` : `❌ ${data.error}`)
    setTesting(false)
  }

  if (state === "unsupported") return (
    <p className="text-xs text-slate-400">Notifications push non supportées par ce navigateur</p>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">Notifications push</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {state === "subscribed" ? "✅ Activées sur cet appareil" :
             state === "denied" ? "❌ Bloquées — autorisez dans les réglages du navigateur" :
             "Alertes instantanées pour chaque nouveau RDV"}
          </p>
        </div>
        {state !== "denied" && (
          <button
            onClick={state === "subscribed" ? unsubscribe : subscribe}
            disabled={state === "loading"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              state === "subscribed"
                ? "bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600"
                : "bg-sky-500 text-white hover:bg-sky-600"
            }`}
          >
            {state === "subscribed"
              ? <><BellOff className="w-3 h-3" /> Désactiver</>
              : <><Bell className="w-3 h-3" /> {state === "loading" ? "..." : "Activer"}</>
            }
          </button>
        )}
      </div>
      {state === "subscribed" && (
        <div className="flex items-center gap-3">
          <button onClick={sendTest} disabled={testing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
            <Send className="w-3 h-3" /> {testing ? "Envoi..." : "Tester les notifications"}
          </button>
          {testResult && <p className="text-xs text-slate-500">{testResult}</p>}
        </div>
      )}
    </div>
  )
}
