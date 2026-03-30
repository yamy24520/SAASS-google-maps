import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto"
import { Resend } from "resend"

const APP_URL = process.env.NEXTAUTH_URL ?? "https://reputix.net"

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "placeholder")
}

export async function POST(req: NextRequest) {
  const { email, businessId } = await req.json()

  if (!email || !businessId) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 })
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, name: true },
  })
  if (!business) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 })

  // Check client has at least one booking with this business
  const hasBooking = await prisma.booking.findFirst({
    where: { businessId, clientEmail: email.toLowerCase() },
    select: { id: true },
  })
  if (!hasBooking) {
    return NextResponse.json({ error: "Aucune réservation trouvée pour cet email" }, { status: 404 })
  }

  const token = randomUUID()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

  await prisma.clientSession.create({
    data: {
      businessId,
      clientEmail: email.toLowerCase(),
      token,
      expiresAt,
    },
  })

  const portalUrl = `${APP_URL}/my/${token}`

  await getResend().emails.send({
    from: process.env.EMAIL_FROM ?? "Reputix <alertes@reputix.net>",
    to: email,
    subject: `🔗 Accéder à vos réservations — ${business.name}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#f8fafc;padding:40px 20px;margin:0;">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#0ea5e9,#06b6d4);padding:32px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:22px;font-weight:700;">${business.name}</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">Espace client</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#64748b;margin:0 0 20px;">Bonjour,</p>
      <p style="color:#1e293b;margin:0 0 24px;font-size:15px;">
        Voici votre lien d'accès à votre espace réservations chez <strong>${business.name}</strong>.
        Vous pourrez consulter vos rendez-vous à venir, les annuler ou reprendre le même service.
      </p>
      <a href="${portalUrl}"
         style="display:block;background:linear-gradient(135deg,#0ea5e9,#06b6d4);color:white;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-weight:600;font-size:15px;margin-bottom:24px;">
        Accéder à mes réservations →
      </a>
      <p style="color:#94a3b8;font-size:12px;margin:0;text-align:center;">
        Ce lien est valable <strong>24 heures</strong> et est personnel. Ne le partagez pas.
      </p>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">Propulsé par Reputix</p>
    </div>
  </div>
</body>
</html>
    `,
  })

  return NextResponse.json({ ok: true })
}
