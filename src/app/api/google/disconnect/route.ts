import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const bizId = new URL(req.url).searchParams.get("biz")
  const where = bizId
    ? { id: bizId, userId: session.user.id }
    : { userId: session.user.id }

  await prisma.business.updateMany({
    where,
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

  const redirectBiz = bizId ? `?biz=${bizId}&disconnected=true` : "?disconnected=true"
  return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings${redirectBiz}`)
}
