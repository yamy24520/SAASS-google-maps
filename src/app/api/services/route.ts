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
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  })

  return NextResponse.json({ services, bookingEnabled: business.bookingEnabled, bookingHours: business.bookingHours, bookingSettings: business.bookingSettings, bookingType: business.bookingType, bookingMaxCovers: business.bookingMaxCovers })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const bizId = new URL(req.url).searchParams.get("biz")
  const business = await getBusiness(session.user.id, bizId)
  if (!business) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 })

  const { name, description, duration, price, category } = await req.json()
  if (!name || !duration || price === undefined) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 })
  }

  const service = await prisma.service.create({
    data: { businessId: business.id, name, description: description || null, category: category || null, duration: Number(duration), price: Number(price) },
  })

  return NextResponse.json({ service })
}

// Bulk import services (for templates)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorise" }, { status: 401 })

  const bizId = new URL(req.url).searchParams.get("biz")
  const business = await getBusiness(session.user.id, bizId)
  if (!business) return NextResponse.json({ error: "Etablissement introuvable" }, { status: 404 })

  const { services: items } = await req.json() as { services: { name: string; description?: string; category?: string; duration: number; price: number }[] }
  if (!Array.isArray(items) || items.length === 0) return NextResponse.json({ error: "Aucun service" }, { status: 400 })

  const created = await prisma.service.createMany({
    data: items.map((s, i) => ({
      businessId: business.id,
      name: s.name,
      description: s.description || null,
      category: s.category || null,
      duration: Number(s.duration),
      price: Number(s.price),
      sortOrder: i,
    })),
  })

  return NextResponse.json({ count: created.count })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const bizId = new URL(req.url).searchParams.get("biz")
  const business = await getBusiness(session.user.id, bizId)
  if (!business) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 })

  const { bookingEnabled, bookingHours, bookingSettings, bookingType, bookingMaxCovers } = await req.json()

  await prisma.business.update({
    where: { id: business.id },
    data: {
      ...(bookingEnabled !== undefined && { bookingEnabled }),
      ...(bookingHours !== undefined && { bookingHours }),
      ...(bookingSettings !== undefined && { bookingSettings }),
      ...(bookingType !== undefined && { bookingType }),
      ...(bookingMaxCovers !== undefined && { bookingMaxCovers }),
    },
  })

  return NextResponse.json({ ok: true })
}
