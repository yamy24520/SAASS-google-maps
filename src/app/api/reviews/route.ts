import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const bizId = searchParams.get("biz")
  const status = searchParams.get("status")
  const rating = searchParams.get("rating")
  const pageRaw = parseInt(searchParams.get("page") ?? "1")
  const limitRaw = parseInt(searchParams.get("limit") ?? "20")
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 100 ? limitRaw : 20

  const business = bizId
    ? await prisma.business.findFirst({ where: { id: bizId, userId: session.user.id } })
    : await prisma.business.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" } })

  if (!business) return NextResponse.json({ reviews: [], total: 0 })

  const where = {
    businessId: business.id,
    ...(status ? { status: status as never } : {}),
    ...(rating ? (() => { const r = parseInt(rating); return Number.isFinite(r) && r >= 1 && r <= 5 ? { rating: r } : {} })() : {}),
  }

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { reviewPublishedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.review.count({ where }),
  ])

  return NextResponse.json({ reviews, total, page, limit })
}
