import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendClientOtpEmail } from "@/lib/email"

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function POST(req: NextRequest) {
  const { email, businessId } = await req.json()

  if (!email || !businessId) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, name: true },
  })
  if (!business) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 })

  const hasBooking = await prisma.booking.findFirst({
    where: { businessId, clientEmail: normalizedEmail },
    select: { id: true },
  })
  if (!hasBooking) {
    return NextResponse.json({ error: "Aucune réservation trouvée pour cet email" }, { status: 404 })
  }

  // Invalider les anciens OTPs non utilisés
  await prisma.clientOtp.updateMany({
    where: { businessId, clientEmail: normalizedEmail, used: false },
    data: { used: true },
  })

  const code = generateOtp()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 min

  await prisma.clientOtp.create({
    data: { businessId, clientEmail: normalizedEmail, code, expiresAt },
  })

  await sendClientOtpEmail({ clientEmail: normalizedEmail, businessName: business.name, code })

  return NextResponse.json({ ok: true })
}
