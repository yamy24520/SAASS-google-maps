import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

async function findBusinessId(slug: string): Promise<string | null> {
  const bySlug = await prisma.business.findUnique({ where: { pageSlug: slug }, select: { id: true } })
  if (bySlug) return bySlug.id
  const byId = await prisma.business.findUnique({ where: { id: slug }, select: { id: true } })
  return byId?.id ?? null
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { type } = await req.json().catch(() => ({ type: "view" }))

  const businessId = await findBusinessId(slug)
  if (!businessId) return NextResponse.json({ ok: false })

  await prisma.pageEvent.create({ data: { businessId, type: type ?? "view" } })
  return NextResponse.json({ ok: true })
}
