import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getGBPAuthUrl } from "@/lib/google-business"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  let businessId = searchParams.get("biz")

  // If no businessId provided, find or create the first business for this user
  if (!businessId) {
    let business = await prisma.business.findFirst({ where: { userId: session.user.id } })
    if (!business) {
      business = await prisma.business.create({
        data: { userId: session.user.id, name: "Mon établissement" },
      })
    }
    businessId = business.id
  }

  const url = getGBPAuthUrl(businessId)
  return NextResponse.redirect(url)
}
