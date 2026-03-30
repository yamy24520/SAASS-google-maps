import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto"

async function getBusiness(userId: string, bizId?: string | null) {
  return bizId
    ? prisma.business.findFirst({ where: { id: bizId, userId } })
    : prisma.business.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } })
}

// GET — obtenir (ou générer) le token business + les tokens par prestataire
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const bizId = new URL(req.url).searchParams.get("biz")
  let business = await getBusiness(session.user.id, bizId)
  if (!business) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 })

  // Générer le token business si absent
  if (!business.calendarToken) {
    business = await prisma.business.update({
      where: { id: business.id },
      data: { calendarToken: randomUUID() },
    })
  }

  // Charger les prestataires et générer leurs tokens si absents
  const staffs = await prisma.staff.findMany({
    where: { businessId: business.id, active: true },
    select: { id: true, name: true, color: true, calendarToken: true },
    orderBy: { createdAt: "asc" },
  })

  const staffTokens = await Promise.all(
    staffs.map(async s => {
      if (s.calendarToken) return { id: s.id, name: s.name, color: s.color, token: s.calendarToken }
      const updated = await prisma.staff.update({
        where: { id: s.id },
        data: { calendarToken: randomUUID() },
        select: { calendarToken: true },
      })
      return { id: s.id, name: s.name, color: s.color, token: updated.calendarToken! }
    })
  )

  return NextResponse.json({ token: business.calendarToken, staffTokens })
}

// POST — régénérer le token business (révocation)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const bizId = new URL(req.url).searchParams.get("biz")
  const business = await getBusiness(session.user.id, bizId)
  if (!business) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 })

  const updated = await prisma.business.update({
    where: { id: business.id },
    data: { calendarToken: randomUUID() },
  })

  return NextResponse.json({ token: updated.calendarToken })
}
