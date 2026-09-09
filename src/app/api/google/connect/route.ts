import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getGBPAuthUrl } from "@/lib/google-business"
import { createGoogleState } from "@/lib/google-oauth-state"

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

  const owned = await prisma.business.findFirst({ where: { id: businessId, userId: session.user.id } })
  if (!owned) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 })
  const state = createGoogleState(session.user.id, businessId)
  const response = NextResponse.redirect(getGBPAuthUrl(state))
  response.cookies.set("google_oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/google", maxAge: 600 })
  return response
}
