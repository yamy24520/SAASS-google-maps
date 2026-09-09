import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sessionId = req.nextUrl.searchParams.get("session_id")
  if (!sessionId) return NextResponse.json({ error: "Lien de confirmation invalide." }, { status: 403 })
  const booking = await prisma.booking.findFirst({
    where: { id, paymentIntentId: sessionId },
    select: {
      clientName: true, date: true, timeSlot: true, status: true, paymentStatus: true,
      business: { select: { name: true } },
      service: { select: { name: true, duration: true } },
    },
  })
  if (!booking) return NextResponse.json({ error: "Introuvable" }, { status: 404 })
  return NextResponse.json({ booking })
}
