export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAvailability } from "@/lib/booking-availability"

export async function GET(req: NextRequest) {
  // Vérifier le secret Vapi
  const secret = req.headers.get("x-vapi-secret")
  if (!process.env.VAPI_WEBHOOK_SECRET || secret !== process.env.VAPI_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get("businessId")
  const date = searchParams.get("date")
  const serviceId = searchParams.get("serviceId")

  if (!businessId || !date) {
    return NextResponse.json({ error: "businessId et date requis" }, { status: 400 })
  }

  const business = await prisma.business.findFirst({ where: { id: businessId, vapiEnabled: true }, select: { id: true } })
  if (!business) return NextResponse.json({ error: "Service vocal indisponible" }, { status: 404 })
  const data = await getAvailability({ businessId, date, serviceId })

  return NextResponse.json({
    slots: data.slots ?? [],
    date,
    businessId
  })
}
