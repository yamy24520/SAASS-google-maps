export interface PushPayload {
  title: string
  body: string
  icon?: string
  url?: string
}

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    console.error("[push] VAPID keys manquantes (NEXT_PUBLIC_VAPID_PUBLIC_KEY ou VAPID_PRIVATE_KEY)")
    return false
  }

  try {
    // Import dynamique pour éviter le crash à l'import sur Vercel
    const webpush = (await import("web-push")).default
    webpush.setVapidDetails("mailto:contact@reputix.net", publicKey, privateKey)
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
    )
    return true
  } catch (err: unknown) {
    const status = err && typeof err === "object" && "statusCode" in err ? (err as { statusCode: number }).statusCode : null
    console.error("[push] Erreur envoi notification:", status, err)
    if (status === 410) return "expired"
    return false
  }
}
