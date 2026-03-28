import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function getBusiness(userId: string, bizId?: string | null) {
  return bizId
    ? prisma.business.findFirst({ where: { id: bizId, userId } })
    : prisma.business.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } })
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const bizId = new URL(req.url).searchParams.get("biz")
  const business = await getBusiness(session.user.id, bizId)
  if (!business) return NextResponse.json({ closedDates: [] })

  const closedDates = await prisma.closedDate.findMany({
    where: { businessId: business.id },
    orderBy: { date: "asc" },
  })

  return NextResponse.json({ closedDates })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const bizId = new URL(req.url).searchParams.get("biz")
  const business = await getBusiness(session.user.id, bizId)
  if (!business) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 })

  const { date, reason } = await req.json()
  if (!date) return NextResponse.json({ error: "Date requise" }, { status: 400 })

  const closedDate = await prisma.closedDate.upsert({
    where: { businessId_date: { businessId: business.id, date } },
    create: { businessId: business.id, date, reason: reason || null },
    update: { reason: reason || null },
  })

  return NextResponse.json({ closedDate })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const bizId = new URL(req.url).searchParams.get("biz")
  const business = await getBusiness(session.user.id, bizId)
  if (!business) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 })

  const { date } = await req.json()
  await prisma.closedDate.deleteMany({ where: { businessId: business.id, date } })

  return NextResponse.json({ ok: true })
}
