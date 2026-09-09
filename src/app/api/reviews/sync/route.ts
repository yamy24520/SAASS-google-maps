import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { synchronizeReviews } from "@/lib/review-sync"

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const id = req.nextUrl.searchParams.get("biz")
  const business = await prisma.business.findFirst({
    where: id ? { id, ...(session.user.role === "ADMIN" ? {} : { userId: session.user.id }) } : { userId: session.user.id },
  })
  if (!business) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 })
  try {
    return NextResponse.json(await synchronizeReviews(business, "manual"))
  } catch {
    return NextResponse.json({ error: "La synchronisation a échoué. Réessayez plus tard." }, { status: 500 })
  }
}
