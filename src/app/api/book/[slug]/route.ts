import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const business = await prisma.business.findFirst({
    where: { OR: [{ pageSlug: slug }, { id: slug }] },
    select: { id: true, bookingEnabled: true },
  })

  if (!business) return NextResponse.json({ error: "Introuvable" }, { status: 404 })
  if (!business.bookingEnabled) return NextResponse.json({ bookingEnabled: false, services: [] })

  const services = await prisma.service.findMany({
    where: { businessId: business.id, active: true },
    select: { id: true, name: true, description: true, duration: true, price: true },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ bookingEnabled: true, services })
}
