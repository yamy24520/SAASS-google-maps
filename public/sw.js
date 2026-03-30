self.addEventListener("install", () => {
  console.log("[SW] install")
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  console.log("[SW] activate")
  event.waitUntil(clients.claim())
})

self.addEventListener("push", (event) => {
  console.log("[SW] push reçu", event.data?.text())
  if (!event.data) return
  let data
  try { data = event.data.json() } catch { return }
  event.waitUntil(
    self.registration.showNotification(data.title || "Reputix", {
      body: data.body || "",
      icon: "/logo.png",
      badge: "/logo.png",
      data: { url: data.url || "/" },
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url || "/"
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
