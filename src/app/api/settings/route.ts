import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
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
  offerEnabled: z.boolean().optional(),
  offerText: z.string().nullable().optional(),
  offerType: z.enum(["FIXED", "SPIN_WHEEL"]).optional(),
  spinPrizes: z.array(z.object({
    emoji: z.string(),
    label: z.string(),
    probability: z.number().min(0).max(100),
  })).nullable().optional(),
  reputationPageEnabled: z.boolean().optional(),
  socialLinks: z.object({
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    website: z.string().optional(),
    tripadvisor: z.string().optional(),
  }).nullable().optional(),
  logoDataUrl: z.string().nullable().optional(),
  pageTheme: z.string().optional(),
  pageStyle: z.string().optional(),
  pageTagline: z.string().nullable().optional(),
  pageAccentColor: z.string().nullable().optional(),
  pageCoverDataUrl: z.string().nullable().optional(),
  pageDescription: z.string().nullable().optional(),
  pageLegalText: z.string().nullable().optional(),
  pageLabels: z.record(z.string(), z.string()).nullable().optional(),
  pageServiceOrder: z.array(z.string()).nullable().optional(),
  pageShowHours: z.boolean().optional(),
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

  let data
  try {
    data = schema.parse(body)
  } catch (err) {
    console.error("[settings PUT] validation error:", err)
    return NextResponse.json({ error: "Données invalides." }, { status: 400 })
  }

  try {
    let business = await getBusinessForUser(session.user.id, bizId)

    // Prisma requires Prisma.JsonNull (not JS null) for nullable JSON fields
    const { spinPrizes, socialLinks, pageLabels, pageServiceOrder, ...restData } = data

    function jsonField(val: unknown) {
      if (val === null) return Prisma.JsonNull
      if (val !== undefined) return val as Prisma.InputJsonValue
      return undefined
    }

    const prismaData = {
      ...restData,
      spinPrizes: jsonField(spinPrizes),
      socialLinks: jsonField(socialLinks),
      pageLabels: jsonField(pageLabels),
      pageServiceOrder: jsonField(pageServiceOrder),
    }

    if (!business) {
      business = await prisma.business.create({
        data: { userId: session.user.id, name: data.name ?? "Mon établissement", ...prismaData },
      })
    } else {
      business = await prisma.business.update({
        where: { id: business.id },
        data: prismaData,
      })
    }

    return NextResponse.json({ business })
  } catch (err) {
    console.error("[settings PUT] db error:", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}
