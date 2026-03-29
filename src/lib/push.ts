import webpush from "web-push"

webpush.setVapidDetails(
  "mailto:contact@reputix.net",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

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
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
    )
    return true
  } catch (err: unknown) {
    // 410 Gone = subscription expirée, à supprimer
    if (err && typeof err === "object" && "statusCode" in err && (err as { statusCode: number }).statusCode === 410) {
      return "expired"
    }
    return false
  }
}
