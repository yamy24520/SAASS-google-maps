import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: {
      clientName: true, date: true, timeSlot: true, status: true, paymentStatus: true,
      business: { select: { name: true } },
      service: { select: { name: true, duration: true } },
    },
  })
  if (!booking) return NextResponse.json({ error: "Introuvable" }, { status: 404 })
  return NextResponse.json({ booking })
}
