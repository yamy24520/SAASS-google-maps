import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { name } = await req.json()
  const business = await prisma.business.create({
    data: { userId: session.user.id, name: name ?? "Nouvel établissement" },
  })

  return NextResponse.json({ business }, { status: 201 })
}
