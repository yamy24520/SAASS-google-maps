import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendPushNotification } from "@/lib/push"

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const privateKey = process.env.VAPID_PRIVATE_KEY
    if (!publicKey || !privateKey) {
      return NextResponse.json({ error: "Variables VAPID non configurées sur le serveur" }, { status: 500 })
    }

    const subs = await prisma.pushSubscription.findMany({ where: { userId: session.user.id } })
    if (subs.length === 0) return NextResponse.json({ error: "Aucune subscription enregistrée — activez les notifications d'abord" }, { status: 404 })

    const results = await Promise.all(
      subs.map(sub => sendPushNotification(sub, {
        title: "🔔 Test Reputix",
        body: "Les notifications fonctionnent correctement !",
        url: "/dashboard",
      }))
    )

    const expired = subs.filter((_, i) => results[i] === "expired")
    if (expired.length > 0) {
      await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: expired.map(s => s.endpoint) } } })
    }

    const sent = results.filter(r => r === true).length
    return NextResponse.json({ sent, total: subs.length })
  } catch (err) {
    console.error("[push/test] Erreur inattendue:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
