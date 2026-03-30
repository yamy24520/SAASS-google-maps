import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Resend } from "resend"

const APP_URL = process.env.NEXTAUTH_URL ?? "https://reputix.net"

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "placeholder")
}

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

  await getResend().emails.send({
    from: process.env.EMAIL_FROM ?? "Reputix <alertes@reputix.net>",
    to: normalizedEmail,
    subject: `${code} — Votre code de connexion ${business.name}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#f8fafc;padding:40px 20px;margin:0;">
  <div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#0ea5e9,#06b6d4);padding:28px 32px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:20px;font-weight:700;">${business.name}</h1>
      <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">Espace client</p>
    </div>
    <div style="padding:36px 32px;text-align:center;">
      <p style="color:#64748b;margin:0 0 24px;font-size:14px;">Votre code de connexion :</p>
      <div style="background:#f1f5f9;border-radius:14px;padding:20px 32px;display:inline-block;margin-bottom:24px;">
        <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#0f172a;font-family:monospace;">${code}</span>
      </div>
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        Ce code expire dans <strong>10 minutes</strong>.<br>Ne le partagez avec personne.
      </p>
    </div>
    <div style="padding:14px 32px;background:#f8fafc;text-align:center;">
      <p style="color:#94a3b8;font-size:11px;margin:0;">Propulsé par Reputix</p>
    </div>
  </div>
</body>
</html>
    `,
  })

  return NextResponse.json({ ok: true })
}
