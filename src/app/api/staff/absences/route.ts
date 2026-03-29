import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function getBusiness(userId: string, bizId?: string | null) {
  return bizId
    ? prisma.business.findFirst({ where: { id: bizId, userId } })
    : prisma.business.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } })
}

// GET — toutes les absences de l'établissement
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const bizId = new URL(req.url).searchParams.get("biz")
  const business = await getBusiness(session.user.id, bizId)
  if (!business) return NextResponse.json({ absences: [] })

  const staffs = await prisma.staff.findMany({
    where: { businessId: business.id },
    select: { id: true, absences: { orderBy: { startDate: "asc" } } },
  })

  const absences = staffs.flatMap(s => s.absences.map(a => ({ ...a, staffId: s.id })))
  return NextResponse.json({ absences })
}

// POST — créer une absence
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const bizId = new URL(req.url).searchParams.get("biz")
  const business = await getBusiness(session.user.id, bizId)
  if (!business) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 })

  const { staffId, startDate, endDate, reason, type } = await req.json()
  if (!staffId || !startDate || !endDate) return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 })

  // Vérifier que le staff appartient bien à cet établissement
  const staff = await prisma.staff.findFirst({ where: { id: staffId, businessId: business.id } })
  if (!staff) return NextResponse.json({ error: "Employé introuvable" }, { status: 404 })

  const absence = await prisma.staffAbsence.create({
    data: { staffId, startDate, endDate, reason: reason || null, type: type ?? "VACATION" },
  })

  return NextResponse.json({ absence })
}

// DELETE — supprimer une absence
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 })

  // Vérifier l'ownership via le staff → business
  const absence = await prisma.staffAbsence.findUnique({
    where: { id },
    include: { staff: { select: { business: { select: { userId: true } } } } },
  })
  if (!absence || absence.staff.business.userId !== session.user.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  await prisma.staffAbsence.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
