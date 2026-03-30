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
  const monthStart = `${y}-${String(m).padStart(2, "0")}-01`
  const prevM = m === 1 ? 12 : m - 1
  const prevY = m === 1 ? y - 1 : y
  const prevMonthStart = `${prevY}-${String(prevM).padStart(2, "0")}-01`

  const staffList = await prisma.staff.findMany({
    where: { businessId: business.id, active: true },
    select: { id: true, name: true, color: true },
    orderBy: { createdAt: "asc" },
  })

  const stats = await Promise.all(staffList.map(async (staff) => {
    // All-time bookings for this staff
    const [allBookings, monthBookings, prevMonthBookings] = await Promise.all([
      prisma.booking.findMany({
        where: { businessId: business.id, staffId: staff.id },
        select: { status: true, service: { select: { name: true, price: true } } },
      }),
      prisma.booking.findMany({
        where: { businessId: business.id, staffId: staff.id, date: { gte: monthStart } },
        select: { status: true, service: { select: { name: true, price: true } } },
      }),
      prisma.booking.findMany({
        where: { businessId: business.id, staffId: staff.id, date: { gte: prevMonthStart, lt: monthStart } },
        select: { status: true, service: { select: { name: true, price: true } } },
      }),
    ])

    const confirmed = (list: typeof allBookings) => list.filter(b => b.status === "CONFIRMED")
    const cancelled = (list: typeof allBookings) => list.filter(b => b.status === "CANCELLED")
    const ca = (list: typeof allBookings) => confirmed(list).reduce((s, b) => s + (b.service?.price ?? 0), 0)

    // Top service this month
    const serviceCount = new Map<string, number>()
    for (const b of monthBookings.filter(b => b.status !== "CANCELLED")) {
      if (b.service?.name) serviceCount.set(b.service.name, (serviceCount.get(b.service.name) ?? 0) + 1)
    }
    const topService = [...serviceCount.entries()].sort((a, b) => b[1] - a[1])[0] ?? null

    const totalAll = allBookings.length
    const cancelRate = totalAll > 0 ? Math.round((cancelled(allBookings).length / totalAll) * 100) : 0

    return {
      id: staff.id,
      name: staff.name,
      color: staff.color,
      allTime: {
        total: allBookings.length,
        confirmed: confirmed(allBookings).length,
        cancelled: cancelled(allBookings).length,
        ca: Math.round(ca(allBookings) * 100) / 100,
        cancellationRate: cancelRate,
      },
      thisMonth: {
        total: monthBookings.length,
        confirmed: confirmed(monthBookings).length,
        ca: Math.round(ca(monthBookings) * 100) / 100,
      },
      prevMonth: {
        total: prevMonthBookings.length,
        confirmed: confirmed(prevMonthBookings).length,
        ca: Math.round(ca(prevMonthBookings) * 100) / 100,
      },
      topService: topService ? { name: topService[0], count: topService[1] } : null,
    }
  }))

  return NextResponse.json({ stats, month: `${y}-${String(m).padStart(2, "0")}` })
}
