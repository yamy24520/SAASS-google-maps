"use client"

import { useState, useEffect } from "react"

export type PushState = "unsupported" | "denied" | "subscribed" | "unsubscribed" | "loading"

export function usePushNotifications() {
  const [state, setState] = useState<PushState>("loading")

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported")
      return
    }
    if (Notification.permission === "denied") {
      setState("denied")
      return
    }
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setState(sub ? "subscribed" : "unsubscribed")
      })
    })
  }, [])

  async function subscribe() {
    setState("loading")
    try {
      const reg = await navigator.serviceWorker.register("/sw.js")
      await navigator.serviceWorker.ready

      const permission = await Notification.requestPermission()
      if (permission !== "granted") { setState("denied"); return }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })

      await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      })

      setState("subscribed")
    } catch {
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

  return { state, subscribe, unsubscribe }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}
