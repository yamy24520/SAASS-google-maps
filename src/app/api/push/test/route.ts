import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendPushNotification } from "@/lib/push"

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const subs = await prisma.pushSubscription.findMany({ where: { userId: session.user.id } })
  if (subs.length === 0) return NextResponse.json({ error: "Aucune subscription enregistrée" }, { status: 404 })

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
}
