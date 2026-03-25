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

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const business = await prisma.business.findUnique({ where: { userId: session.user.id } })
  return NextResponse.json({ business })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const body = await req.json()
  const data = schema.parse(body)

  const business = await prisma.business.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, name: data.name ?? "Mon établissement", ...data },
    update: data,
  })

  return NextResponse.json({ business })
}
