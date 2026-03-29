"use client"

import { useState, useEffect } from "react"

export type PushState = "unsupported" | "denied" | "subscribed" | "unsubscribed" | "loading"

export function usePushNotifications() {
  const [state, setState] = useState<PushState>("loading")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported")
      return
    }
    if (Notification.permission === "denied") {
      setState("denied")
      return
    }
    // getRegistration() retourne undefined si pas encore de SW — pas de blocage
    navigator.serviceWorker.getRegistration().then(reg => {
      if (!reg) { setState("unsubscribed"); return }
      reg.pushManager.getSubscription().then(sub => {
        setState(sub ? "subscribed" : "unsubscribed")
      })
    })
  }, [])

  async function subscribe() {
    setState("loading")
    setError(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") { setState("denied"); return }

      await navigator.serviceWorker.register("/sw.js")
      const reg = await navigator.serviceWorker.ready

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) throw new Error("Clé VAPID publique manquante dans le bundle")

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      setState("subscribed")
    } catch (err) {
      console.error("[push] subscribe error:", err)
      setError(err instanceof Error ? err.message : String(err))
      setState("unsubscribed")
    }
  }

  async function unsubscribe() {
    setState("loading")
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch("/api/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setState("unsubscribed")
    } catch {
      setState("unsubscribed")
    }
  }

  return { state, error, subscribe, unsubscribe }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}
