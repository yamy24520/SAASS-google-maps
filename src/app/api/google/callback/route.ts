import { NextRequest, NextResponse } from "next/server"
import { exchangeCodeForTokens, listAccounts } from "@/lib/google-business"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { verifyGoogleState } from "@/lib/google-oauth-state"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const session = await getServerSession(authOptions)
  const businessId = session?.user?.id ? verifyGoogleState(searchParams.get("state") ?? "", req.cookies.get("google_oauth_state")?.value, session.user.id) : null
  const error = searchParams.get("error")

  if (error || !code || !businessId || !session?.user?.id) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/onboarding?error=google_denied`)
  }

  try {
    const owned = await prisma.business.findFirst({ where: { id: businessId, userId: session.user.id } })
    if (!owned) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 })
    const tokens = await exchangeCodeForTokens(code)

    // Get first GBP account
    const accounts = await listAccounts(tokens.access_token)
    const gbpAccountId = accounts[0]?.name ?? null

    await prisma.business.update({
      where: { id: businessId },
      data: {
        gbpAccountId,
        gbpAccessToken: tokens.access_token,
        gbpRefreshToken: tokens.refresh_token ?? owned.gbpRefreshToken,
        gbpReviewLocationId: null,
        gbpTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        gbpConnectedAt: new Date(),
      },
    })

    const response = NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?biz=${encodeURIComponent(businessId)}&google=connected`)
    response.cookies.set("google_oauth_state", "", { path: "/api/google", maxAge: 0 })
    return response
  } catch (err) {
    console.error("[google/callback] error:", err)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/onboarding?error=token_failed`)
  }
}
