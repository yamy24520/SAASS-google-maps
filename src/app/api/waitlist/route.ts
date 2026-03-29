import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Resend } from "resend"

const APP_URL = process.env.NEXTAUTH_URL ?? "https://reputix.net"

// GET — dashboard: liste d'attente (authentifié)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const bizId = new URL(req.url).searchParams.get("biz")
  const business = bizId
    ? await prisma.business.findFirst({ where: { id: bizId, userId: session.user.id } })
    : await prisma.business.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" } })

  if (!business) return NextResponse.json({ entries: [] })

  const entries = await prisma.waitlistEntry.findMany({
    where: { businessId: business.id },
    include: { service: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ entries })
}

// POST — public: rejoindre la liste d'attente
export async function POST(req: NextRequest) {
  const { businessId, serviceId, clientName, clientEmail, clientPhone, preferredDate } = await req.json()

  if (!businessId || !clientName || !clientEmail) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 })
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { name: true },
  })
  if (!business) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 })

  const entry = await prisma.waitlistEntry.create({
    data: {
      businessId,
      serviceId: serviceId || null,
      clientName,
      clientEmail,
      clientPhone: clientPhone || null,
      preferredDate: preferredDate || null,
    },
  })

  // Archiver le lead
  prisma.leadEmail.upsert({
    where: { businessId_email: { businessId, email: clientEmail } } as never,
    update: { name: clientName, phone: clientPhone || null },
    create: { businessId, email: clientEmail, name: clientName, phone: clientPhone || null, source: "waitlist" },
  }).catch(() => null)

  // Email de confirmation liste d'attente
  try {
    const resend = new Resend(process.env.RESEND_API_KEY ?? "placeholder")
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "Reputix <alertes@reputix.net>",
      to: clientEmail,
      subject: `📋 Liste d'attente — ${business.name}`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#f8fafc;padding:40px 20px;margin:0;">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#0ea5e9,#06b6d4);padding:28px 32px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:22px;font-weight:700;">Reputix</h1>
      <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">${business.name}</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#64748b;margin:0 0 16px;">Bonjour <strong>${clientName}</strong>,</p>
      <p style="color:#1e293b;margin:0 0 20px;">Vous avez bien été ajouté(e) à la liste d'attente de <strong>${business.name}</strong>. Nous vous contacterons dès qu'un créneau se libère.</p>
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:14px 16px;">
        <p style="color:#0369a1;font-size:13px;margin:0;">📋 Vous êtes sur liste d'attente${preferredDate ? ` pour le ${new Date(preferredDate + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}` : ""}</p>
      </div>
    </div>
    <div style="padding:14px 32px;background:#f8fafc;text-align:center;">
      <p style="color:#94a3b8;font-size:11px;margin:0;">Propulsé par <strong>Reputix</strong></p>
    </div>
  </div>
</body></html>`,
    })
  } catch { /* non bloquant */ }

  return NextResponse.json({ entry })
}
