import { NextRequest, NextResponse } from "next/server"
import { exchangeCodeForTokens, listAccounts } from "@/lib/google-business"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const userId = searchParams.get("state")
  const error = searchParams.get("error")

  if (error || !code || !userId) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/onboarding?error=google_denied`)
  }

  try {
    const tokens = await exchangeCodeForTokens(code)

    // Get first GBP account
    const accounts = await listAccounts(tokens.access_token)
    const gbpAccountId = accounts[0]?.name ?? null

    await prisma.business.upsert({
      where: { userId },
      create: {
        userId,
        name: "Mon établissement",
        gbpAccountId,
        gbpAccessToken: tokens.access_token,
        gbpRefreshToken: tokens.refresh_token,
        gbpTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        gbpConnectedAt: new Date(),
      },
      update: {
        gbpAccountId,
        gbpAccessToken: tokens.access_token,
        gbpRefreshToken: tokens.refresh_token,
        gbpTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        gbpConnectedAt: new Date(),
      },
    })

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/onboarding?step=2`)
  } catch (err) {
    console.error("[google/callback] error:", err)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/onboarding?error=token_failed`)
  }
}
