import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { generateUniqueSlug } from "@/lib/page-slug"

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const body = await req.json()
  const { pageConfig, logoDataUrl, pageTagline, pageTheme, reputationPageEnabled } = body

  const business = await prisma.business.findFirst({ where: { userId: session.user.id } })
  if (!business) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 })

  // Auto-generate slug if not set
  let pageSlug = business.pageSlug
  if (!pageSlug) {
    pageSlug = await generateUniqueSlug(business.name, prisma)
  }

  const updated = await prisma.business.update({
    where: { id: business.id },
    data: {
      pageSlug,
      pageConfig: pageConfig as Prisma.InputJsonValue,
      logoDataUrl: logoDataUrl ?? business.logoDataUrl,
      pageTagline: pageTagline ?? business.pageTagline,
      pageTheme: pageTheme ?? business.pageTheme,
      reputationPageEnabled: reputationPageEnabled ?? business.reputationPageEnabled,
    },
    select: { pageSlug: true, pageTheme: true, reputationPageEnabled: true },
  })

  return NextResponse.json({ ok: true, pageSlug: updated.pageSlug })
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const business = await prisma.business.findFirst({
    where: { userId: session.user.id },
    select: { id: true, pageSlug: true, reputationPageEnabled: true },
  })
  if (!business) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 })

  // Ensure slug exists
  if (!business.pageSlug) {
    const full = await prisma.business.findUnique({ where: { id: business.id }, select: { name: true } })
    const pageSlug = await generateUniqueSlug(full!.name, prisma)
    await prisma.business.update({ where: { id: business.id }, data: { pageSlug } })
    return NextResponse.json({ ...business, pageSlug })
  }

  return NextResponse.json(business)
}
