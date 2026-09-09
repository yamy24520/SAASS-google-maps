import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto"
import { rateLimit } from "@/lib/rate-limit"
import { z } from "zod"

export async function POST(req: NextRequest) {
  const parsed = z.object({ email: z.string().trim().toLowerCase().email().max(254), businessId: z.string().min(1), code: z.string().regex(/^\d{6}$/) }).safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Code ou adresse invalide." }, { status: 400 })
  const { email, businessId, code } = parsed.data
  const quota = await rateLimit(`otp-verify:${businessId}:${email}`, 5, 10 * 60_000)
  if (!quota.ok) return NextResponse.json({ error: "Trop de tentatives. Réessayez dans quelques minutes." }, { status: 429 })

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
  const consumed = await prisma.clientOtp.updateMany({ where: { id: otp.id, used: false, expiresAt: { gt: new Date() } }, data: { used: true } })
  if (!consumed.count) return NextResponse.json({ error: "Code déjà utilisé ou expiré." }, { status: 401 })

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
