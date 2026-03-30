import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token")
  if (!token) return NextResponse.json({ error: "Token manquant" }, { status: 400 })

  const session = await prisma.clientSession.findUnique({
    where: { token },
    include: { business: { select: { id: true, name: true, pageSlug: true, bookingType: true } } },
  })

  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: "Lien expiré ou invalide" }, { status: 401 })
  }

  const bookings = await prisma.booking.findMany({
    where: { businessId: session.businessId, clientEmail: session.clientEmail },
    include: {
      service: { select: { id: true, name: true, duration: true, price: true } },
      staff: { select: { id: true, name: true, color: true } },
    },
    orderBy: [{ date: "desc" }, { timeSlot: "desc" }],
  })

  const today = new Date().toISOString().split("T")[0]
  const upcoming = bookings.filter(b => b.date >= today && b.status !== "CANCELLED")
  const past = bookings.filter(b => b.date < today || b.status === "CANCELLED")

  return NextResponse.json({
    email: session.clientEmail,
    business: session.business,
    upcoming,
    past,
  })
}
