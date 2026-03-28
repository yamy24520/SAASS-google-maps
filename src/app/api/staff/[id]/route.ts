import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params
  const staff = await prisma.staff.findFirst({
    where: { id },
    include: { business: { select: { userId: true } } },
  })
  if (!staff || staff.business.userId !== session.user.id) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 })
  }

  const body = await req.json()
  const updated = await prisma.staff.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.active !== undefined && { active: body.active }),
    },
  })

  return NextResponse.json({ staff: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params
  const staff = await prisma.staff.findFirst({
    where: { id },
    include: { business: { select: { userId: true } } },
  })
  if (!staff || staff.business.userId !== session.user.id) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 })
  }

  await prisma.staff.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
