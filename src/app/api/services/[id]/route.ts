import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params
  const service = await prisma.service.findFirst({
    where: { id },
    include: { business: { select: { userId: true } } },
  })
  if (!service || service.business.userId !== session.user.id) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 })
  }

  const { name, description, duration, price, active, category, sortOrder } = await req.json()
  const updated = await prisma.service.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(duration !== undefined && { duration: Number(duration) }),
      ...(price !== undefined && { price: Number(price) }),
      ...(active !== undefined && { active }),
      ...(category !== undefined && { category: category || null }),
      ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
    },
  })

  return NextResponse.json({ service: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params
  const service = await prisma.service.findFirst({
    where: { id },
    include: { business: { select: { userId: true } } },
  })
  if (!service || service.business.userId !== session.user.id) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 })
  }

  await prisma.service.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
