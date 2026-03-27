import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendPasswordResetEmail } from "@/lib/email"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: "Email requis." }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { email } })

    // Toujours retourner 200 pour ne pas divulguer si l'email existe
    if (!user || !user.password) {
      return NextResponse.json({ success: true })
    }

    // Supprimer les anciens tokens
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })

    // Créer un nouveau token
    const token = crypto.randomBytes(32).toString("hex")
    const expires = new Date(Date.now() + 1000 * 60 * 60) // 1 heure

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expires },
    })

    try {
      await sendPasswordResetEmail({ userEmail: user.email!, userName: user.name ?? "Utilisateur", token })
    } catch (emailErr) {
      console.error("[forgot-password] email error:", emailErr)
      // On ne bloque pas — le token est créé, l'email a juste échoué
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[forgot-password]", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}
