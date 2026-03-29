export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const bizId = searchParams.get("biz")

  const business = await prisma.business.findFirst({
    where: { id: bizId ?? "", userId: session.user.id },
    select: { vapiEnabled: true, vapiPhoneNumber: true, vapiAssistantId: true }
  })

  if (!business) return NextResponse.json({ error: "Business non trouvé" }, { status: 404 })

  return NextResponse.json(business)
}
