import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto"

export async function POST(req: NextRequest) {
  const { email, businessId, code } = await req.json()

  if (!email || !businessId || !code) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()

  const otp = await prisma.clientOtp.findFirst({
    where: {
      businessId,
      clientEmail: normalizedEmail,
      code,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  })

  if (!otp) {
    return NextResponse.json({ error: "Code invalide ou expiré" }, { status: 401 })
  }

  // Marquer l'OTP comme utilisé
  await prisma.clientOtp.update({ where: { id: otp.id }, data: { used: true } })

  // Créer la session (30 jours)
  const token = randomUUID()
  await prisma.clientSession.create({
    data: {
      businessId,
      clientEmail: normalizedEmail,
      token,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  return NextResponse.json({ token })
}
