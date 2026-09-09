import { NextRequest, NextResponse } from "next/server"
import { getAvailability } from "@/lib/booking-availability"
import { dateSchema } from "@/lib/booking-rules"

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const businessId = p.get("businessId")
  const date = p.get("date")
  const partySize = Number(p.get("partySize") ?? 1)
  if (!businessId || !dateSchema.safeParse(date).success || !Number.isInteger(partySize) || partySize < 1 || partySize > 500) return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 })
  const result = await getAvailability({ businessId, date: date!, serviceId: p.get("serviceId"), staffId: p.get("staffId"), partySize })
  return NextResponse.json({ slots: result.slots, reason: result.reason })
}
