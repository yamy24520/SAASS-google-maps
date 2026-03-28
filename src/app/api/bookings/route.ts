import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET — dashboard: liste des RDV du business (authentifié)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const url = new URL(req.url)
  const bizId = url.searchParams.get("biz")
  const dateFilter = url.searchParams.get("date") // optionnel: "2026-03-28"

  const business = bizId
    ? await prisma.business.findFirst({ where: { id: bizId, userId: session.user.id } })
    : await prisma.business.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" } })

  if (!business) return NextResponse.json({ bookings: [] })

  const bookings = await prisma.booking.findMany({
    where: {
      businessId: business.id,
      ...(dateFilter && { date: dateFilter }),
    },
    include: { service: { select: { name: true, duration: true, price: true } } },
    orderBy: [{ date: "asc" }, { timeSlot: "asc" }],
  })

  return NextResponse.json({ bookings })
}

// POST — public: créer une réservation
export async function POST(req: NextRequest) {
  const { businessId, serviceId, clientName, clientEmail, clientPhone, date, timeSlot, notes } = await req.json()

  if (!businessId || !serviceId || !clientName || !clientEmail || !date || !timeSlot) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 })
  }

  // Vérifier que le business et le service existent
  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId, active: true },
  })
  if (!service) return NextResponse.json({ error: "Service introuvable" }, { status: 404 })

  // Vérifier que le créneau n'est pas déjà pris
  const conflict = await prisma.booking.findFirst({
    where: { businessId, date, timeSlot, status: { not: "CANCELLED" } },
  })
  if (conflict) return NextResponse.json({ error: "Ce créneau n'est plus disponible" }, { status: 409 })

  const booking = await prisma.booking.create({
    data: { businessId, serviceId, clientName, clientEmail, clientPhone: clientPhone || null, date, timeSlot, notes: notes || null },
  })

  return NextResponse.json({ booking })
}
