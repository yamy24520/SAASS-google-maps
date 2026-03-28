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
  if (!business) return NextResponse.json({ staffs: [] })

  const staffs = await prisma.staff.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ staffs })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const bizId = new URL(req.url).searchParams.get("biz")
  const business = await getBusiness(session.user.id, bizId)
  if (!business) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 })

  const { name, color } = await req.json()
  if (!name) return NextResponse.json({ error: "Nom requis" }, { status: 400 })

  const staff = await prisma.staff.create({
    data: { businessId: business.id, name, color: color ?? "#0ea5e9" },
  })

  return NextResponse.json({ staff })
}
