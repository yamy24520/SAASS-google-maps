import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Resend } from "resend"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { subject, message, targetRole } = await req.json()
  if (!subject || !message) {
    return NextResponse.json({ error: "Sujet et message requis" }, { status: 400 })
  }

  const users = await prisma.user.findMany({
    where: targetRole === "ALL" ? {} : { role: targetRole ?? "USER" },
    select: { email: true, name: true },
  })

  const resend = new Resend(process.env.RESEND_API_KEY ?? "placeholder")
  const FROM = process.env.EMAIL_FROM ?? "Reputix <alertes@reputix.net>"

  const results = await Promise.allSettled(
    users.map(u =>
      resend.emails.send({
        from: FROM,
        to: u.email ?? "",
        subject,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#f8fafc;padding:40px 20px;margin:0;">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:28px 32px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:22px;font-weight:700;">Reputix</h1>
      <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">Message de l'équipe</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#64748b;margin:0 0 16px;">Bonjour ${u.name ?? ""},</p>
      <div style="color:#1e293b;line-height:1.7;white-space:pre-wrap;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
    </div>
    <div style="padding:14px 32px;background:#f8fafc;text-align:center;">
      <p style="color:#94a3b8;font-size:11px;margin:0;">Vous recevez cet email car vous êtes inscrit sur <strong>Reputix</strong></p>
    </div>
  </div>
</body></html>`,
      })
    )
  )

  const sent = results.filter(r => r.status === "fulfilled").length
  const failed = results.filter(r => r.status === "rejected").length

  return NextResponse.json({ sent, failed, total: users.length })
}
