import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const bizId = req.nextUrl.searchParams.get("biz")

  const leads = await prisma.leadEmail.findMany({
    where: bizId ? { businessId: bizId } : undefined,
    include: { business: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  })

  return NextResponse.json({ leads })
}
