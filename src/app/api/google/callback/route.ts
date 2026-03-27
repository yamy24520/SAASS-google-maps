import { NextRequest, NextResponse } from "next/server"
import { exchangeCodeForTokens, listAccounts } from "@/lib/google-business"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const businessId = searchParams.get("state")
  const error = searchParams.get("error")

  if (error || !code || !businessId) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/onboarding?error=google_denied`)
  }

  try {
    const tokens = await exchangeCodeForTokens(code)

    // Get first GBP account
    const accounts = await listAccounts(tokens.access_token)
    const gbpAccountId = accounts[0]?.name ?? null

    await prisma.business.update({
      where: { id: businessId },
      data: {
        gbpAccountId,
        gbpAccessToken: tokens.access_token,
        gbpRefreshToken: tokens.refresh_token,
        gbpTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        gbpConnectedAt: new Date(),
      },
    })

    // Determine redirect: original onboarding or multi-business new flow
    const business = await prisma.business.findUnique({ where: { id: businessId }, select: { name: true } })
    const isAddFlow = business?.name === "Nouvel établissement"
    const redirect = isAddFlow
      ? `${process.env.NEXTAUTH_URL}/onboarding/new?step=2&biz=${businessId}`
      : `${process.env.NEXTAUTH_URL}/onboarding?step=2`

    return NextResponse.redirect(redirect)
  } catch (err) {
    console.error("[google/callback] error:", err)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/onboarding?error=token_failed`)
  }
}
