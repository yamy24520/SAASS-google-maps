import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const bizId = new URL(req.url).searchParams.get("biz")
  const business = bizId
    ? await prisma.business.findFirst({ where: { id: bizId, userId: session.user.id } })
    : await prisma.business.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" } })

  if (!business) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth() + 1
  const todayStr = `${y}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`

  // Début et fin du mois en cours (UTC)
  const monthStart = `${y}-${String(m).padStart(2, "0")}-01`
  const nextM = m === 12 ? 1 : m + 1
  const nextY = m === 12 ? y + 1 : y
  const monthEnd = `${nextY}-${String(nextM).padStart(2, "0")}-01`

  // Semaine courante (7 derniers jours, UTC)
  const weekAgoD = new Date(now)
  weekAgoD.setUTCDate(now.getUTCDate() - 7)
  const weekAgoStr = weekAgoD.toISOString().split("T")[0]

  const [allBookings, monthBookings, weekBookings, upcomingBookings] = await Promise.all([
    // Tous les RDV (pour taux annulation global)
    prisma.booking.count({ where: { businessId: business.id } }),
    // RDV du mois
    prisma.booking.findMany({
      where: { businessId: business.id, date: { gte: monthStart, lt: monthEnd } },
      select: { status: true, service: { select: { price: true } }, depositAmount: true, paymentStatus: true },
    }),
    // RDV des 7 derniers jours
    prisma.booking.count({
      where: { businessId: business.id, date: { gte: weekAgoStr, lte: todayStr }, status: { not: "CANCELLED" } },
    }),
    // RDV à venir (confirmés ou en attente)
    prisma.booking.count({
      where: { businessId: business.id, date: { gte: todayStr }, status: { in: ["PENDING", "CONFIRMED"] } },
    }),
  ])

  const monthCancelled = monthBookings.filter(b => b.status === "CANCELLED").length
  const monthConfirmed = monthBookings.filter(b => b.status === "CONFIRMED")
  const monthTotal = monthBookings.length

  // Valeur d'un RDV : service.price en priorité, sinon depositAmount si payé
  function bookingValue(b: { service: { price: number } | null; depositAmount: number | null; paymentStatus: string }): number {
    if (b.service?.price) return b.service.price
    if (b.paymentStatus === "PAID" && b.depositAmount) return b.depositAmount
    return 0
  }

  // CA prévisionnel = somme des prix des RDV confirmés ou en attente du mois
  const caMonth = monthBookings
    .filter(b => b.status !== "CANCELLED")
    .reduce((sum, b) => sum + bookingValue(b), 0)

  // CA confirmé uniquement
  const caConfirmed = monthConfirmed.reduce((sum, b) => sum + bookingValue(b), 0)

  const cancellationRate = monthTotal > 0 ? Math.round((monthCancelled / monthTotal) * 100) : 0

  return NextResponse.json({
    caMonth: Math.round(caMonth * 100) / 100,
    caConfirmed: Math.round(caConfirmed * 100) / 100,
    cancellationRate,
    bookingsThisWeek: weekBookings,
    upcomingBookings,
    monthTotal,
    monthCancelled,
  })
}
