import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(2).optional(),
  category: z.enum(["RESTAURANT", "HOTEL", "BAR", "CAFE", "SPA", "RETAIL", "SERVICE", "OTHER"]).optional(),
  responseTone: z.enum(["PROFESSIONAL", "FRIENDLY", "LUXURY", "CASUAL"]).optional(),
  autoReplyEnabled: z.boolean().optional(),
  autoReplyMinRating: z.number().min(1).max(5).optional(),
  customSignature: z.string().nullable().optional(),
  alertEmailEnabled: z.boolean().optional(),
  language: z.string().optional(),
})

async function getBusinessForUser(userId: string, bizId: string | null) {
  if (bizId) {
    return prisma.business.findFirst({ where: { id: bizId, userId } })
  }
  return prisma.business.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } })
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const bizId = new URL(req.url).searchParams.get("biz")
  const business = await getBusinessForUser(session.user.id, bizId)
  return NextResponse.json({ business })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const bizId = new URL(req.url).searchParams.get("biz")
  const body = await req.json()
  const data = schema.parse(body)

  let business = await getBusinessForUser(session.user.id, bizId)

  if (!business) {
    business = await prisma.business.create({
      data: { userId: session.user.id, name: data.name ?? "Mon établissement", ...data },
    })
  } else {
    business = await prisma.business.update({
      where: { id: business.id },
      data,
    })
  }

  return NextResponse.json({ business })
}
