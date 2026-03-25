import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  await prisma.business.updateMany({
    where: { userId: session.user.id },
    data: {
      gbpAccessToken: null,
      gbpRefreshToken: null,
      gbpTokenExpiresAt: null,
      gbpConnectedAt: null,
      gbpAccountId: null,
      gbpLocationId: null,
      gbpLocationName: null,
    },
  })

  return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?disconnected=true`)
}
