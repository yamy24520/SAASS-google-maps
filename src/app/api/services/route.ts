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
  if (!business) return NextResponse.json({ services: [] })

  const services = await prisma.service.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ services, bookingEnabled: business.bookingEnabled, bookingHours: business.bookingHours })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const bizId = new URL(req.url).searchParams.get("biz")
  const business = await getBusiness(session.user.id, bizId)
  if (!business) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 })

  const { name, description, duration, price } = await req.json()
  if (!name || !duration || price === undefined) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 })
  }

  const service = await prisma.service.create({
    data: { businessId: business.id, name, description: description || null, duration: Number(duration), price: Number(price) },
  })

  return NextResponse.json({ service })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const bizId = new URL(req.url).searchParams.get("biz")
  const business = await getBusiness(session.user.id, bizId)
  if (!business) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 })

  const { bookingEnabled, bookingHours } = await req.json()

  await prisma.business.update({
    where: { id: business.id },
    data: {
      ...(bookingEnabled !== undefined && { bookingEnabled }),
      ...(bookingHours !== undefined && { bookingHours }),
    },
  })

  return NextResponse.json({ ok: true })
}
