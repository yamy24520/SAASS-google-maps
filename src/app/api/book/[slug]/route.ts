import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const business = await prisma.business.findFirst({
    where: { OR: [{ pageSlug: slug }, { id: slug }] },
    select: { id: true, bookingEnabled: true, bookingType: true, bookingMaxCovers: true, bookingSettings: true },
  })

  if (!business) return NextResponse.json({ error: "Introuvable" }, { status: 404 })
  if (!business.bookingEnabled) return NextResponse.json({ bookingEnabled: false, services: [], staffs: [] })

  const [services, staffs] = await Promise.all([
    prisma.service.findMany({
      where: { businessId: business.id, active: true },
      select: { id: true, name: true, description: true, duration: true, price: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.staff.findMany({
      where: { businessId: business.id, active: true },
      select: { id: true, name: true, color: true },
      orderBy: { createdAt: "asc" },
    }),
  ])

  return NextResponse.json({
    bookingEnabled: true,
    bookingType: business.bookingType,
    bookingMaxCovers: business.bookingMaxCovers,
    bookingSettings: business.bookingSettings,
    services,
    staffs,
  })
}
