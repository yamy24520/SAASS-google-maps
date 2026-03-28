import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Resend } from "resend"

const APP_URL = process.env.NEXTAUTH_URL ?? "https://reputix.net"

// DELETE — supprimer une entrée liste d'attente (dashboard)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params
  const entry = await prisma.waitlistEntry.findFirst({
    where: { id },
    include: { business: { select: { userId: true } } },
  })
  if (!entry || entry.business.userId !== session.user.id) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 })
  }

  await prisma.waitlistEntry.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

// POST — notifier un client liste d'attente qu'un créneau est dispo
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params
  const entry = await prisma.waitlistEntry.findFirst({
    where: { id },
    include: {
      business: { select: { userId: true, name: true, pageSlug: true } },
      service: { select: { name: true } },
    },
  })
  if (!entry || entry.business.userId !== session.user.id) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 })
  }

  const bookUrl = entry.business.pageSlug ? `${APP_URL}/book/${entry.business.pageSlug}` : APP_URL

  try {
    const resend = new Resend(process.env.RESEND_API_KEY ?? "placeholder")
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "Reputix <alertes@reputix.net>",
      to: entry.clientEmail,
      subject: `🎉 Un créneau vient de se libérer — ${entry.business.name}`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#f8fafc;padding:40px 20px;margin:0;">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#0ea5e9,#06b6d4);padding:28px 32px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:22px;font-weight:700;">${entry.business.name}</h1>
    </div>
    <div style="padding:32px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:40px;margin-bottom:8px;">🎉</div>
        <p style="color:#1e293b;font-size:18px;font-weight:700;margin:0;">Un créneau vient de se libérer !</p>
      </div>
      <p style="color:#64748b;margin:0 0 20px;">Bonjour <strong>${entry.clientName}</strong>, une place vient de se libérer${entry.service ? ` pour <strong>${entry.service.name}</strong>` : ""} chez <strong>${entry.business.name}</strong>.</p>
      <p style="color:#475569;font-size:14px;margin:0 0 24px;">Réservez vite, les créneaux partent rapidement !</p>
      <a href="${bookUrl}" style="display:block;background:linear-gradient(135deg,#0ea5e9,#06b6d4);color:white;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-weight:600;font-size:15px;">
        Réserver maintenant →
      </a>
    </div>
    <div style="padding:14px 32px;background:#f8fafc;text-align:center;">
      <p style="color:#94a3b8;font-size:11px;margin:0;">Propulsé par <strong>Reputix</strong></p>
    </div>
  </div>
</body></html>`,
    })
  } catch { return NextResponse.json({ error: "Échec envoi email" }, { status: 500 }) }

  await prisma.waitlistEntry.update({ where: { id }, data: { notifiedAt: new Date() } })
  return NextResponse.json({ ok: true })
}
