export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  // Vérifier le secret Vapi
  const secret = req.headers.get("x-vapi-secret")
  if (secret !== process.env.VAPI_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get("businessId")
  const date = searchParams.get("date")
  const serviceId = searchParams.get("serviceId")

  if (!businessId || !date) {
    return NextResponse.json({ error: "businessId et date requis" }, { status: 400 })
  }

  // Réutiliser la logique d'availability existante via fetch interne
  const params = new URLSearchParams({ businessId, date })
  if (serviceId) params.set("serviceId", serviceId)

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  const res = await fetch(`${baseUrl}/api/availability?${params}`)
  const data = await res.json()

  return NextResponse.json({
    slots: data.slots ?? [],
    date,
    businessId
  })
}
