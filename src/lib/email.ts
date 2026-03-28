import { Resend } from "resend"

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "placeholder")
}

export async function sendPasswordResetEmail(params: {
  userEmail: string
  userName: string
  token: string
}) {
  const appUrl = process.env.NEXTAUTH_URL ?? "https://reputix.net"
  const resetUrl = `${appUrl}/reset-password?token=${params.token}`

  await getResend().emails.send({
    from: process.env.EMAIL_FROM ?? "Reputix <alertes@reputix.net>",
    to: params.userEmail,
    subject: "Réinitialisation de votre mot de passe Reputix",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, sans-serif; background: #f8fafc; padding: 40px 20px; margin: 0;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #0ea5e9, #06b6d4); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">Reputix</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Réinitialisation du mot de passe</p>
    </div>
    <div style="padding: 32px;">
      <p style="color: #64748b; margin: 0 0 24px;">Bonjour ${params.userName},</p>
      <p style="color: #1e293b; margin: 0 0 24px; font-size: 16px;">
        Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
      </p>
      <a href="${resetUrl}"
         style="display: block; background: linear-gradient(135deg, #0ea5e9, #06b6d4); color: white; text-decoration: none; text-align: center; padding: 14px 24px; border-radius: 10px; font-weight: 600; font-size: 15px; margin-bottom: 24px;">
        Réinitialiser mon mot de passe →
      </a>
      <p style="color: #94a3b8; font-size: 13px; margin: 0;">
        Ce lien expire dans <strong>1 heure</strong>. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
      </p>
    </div>
    <div style="padding: 16px 32px; background: #f8fafc; text-align: center;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">Reputix — Gérez votre réputation en ligne</p>
    </div>
  </div>
</body>
</html>
    `,
  })
}

export async function sendVerificationEmail(params: {
  userEmail: string
  userName: string
  token: string
}) {
  const appUrl = process.env.NEXTAUTH_URL ?? "https://reputix.net"
  const verifyUrl = `${appUrl}/api/auth/verify-email?token=${params.token}`

  await getResend().emails.send({
    from: process.env.EMAIL_FROM ?? "Reputix <alertes@reputix.net>",
    to: params.userEmail,
    subject: "Confirmez votre adresse email Reputix",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, sans-serif; background: #f8fafc; padding: 40px 20px; margin: 0;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #0ea5e9, #06b6d4); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">Reputix</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Confirmation d'email</p>
    </div>
    <div style="padding: 32px;">
      <p style="color: #64748b; margin: 0 0 24px;">Bonjour ${params.userName},</p>
      <p style="color: #1e293b; margin: 0 0 24px; font-size: 16px;">
        Bienvenue sur Reputix ! Confirmez votre adresse email pour activer votre compte.
      </p>
      <a href="${verifyUrl}"
         style="display: block; background: linear-gradient(135deg, #0ea5e9, #06b6d4); color: white; text-decoration: none; text-align: center; padding: 14px 24px; border-radius: 10px; font-weight: 600; font-size: 15px; margin-bottom: 24px;">
        Confirmer mon email →
      </a>
      <p style="color: #94a3b8; font-size: 13px; margin: 0;">
        Ce lien expire dans <strong>24 heures</strong>.
      </p>
    </div>
    <div style="padding: 16px 32px; background: #f8fafc; text-align: center;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">Reputix — Gérez votre réputation en ligne</p>
    </div>
  </div>
</body>
</html>
    `,
  })
}

export async function sendNegativeReviewAlert(params: {
  userEmail: string
  userName: string
  businessName: string
  reviewerName: string
  rating: number
  comment: string
  reviewId: string
}) {
  const stars = "⭐".repeat(params.rating)
  const appUrl = process.env.NEXTAUTH_URL ?? "https://reputix.net"

  await getResend().emails.send({
    from: process.env.EMAIL_FROM ?? "Reputix <alertes@reputix.net>",
    to: params.userEmail,
    subject: `⚠️ Nouvel avis négatif sur ${params.businessName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, sans-serif; background: #f8fafc; padding: 40px 20px; margin: 0;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #0ea5e9, #06b6d4); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">Reputix</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Alerte réputation</p>
    </div>
    <div style="padding: 32px;">
      <p style="color: #64748b; margin: 0 0 24px;">Bonjour ${params.userName},</p>
      <p style="color: #1e293b; margin: 0 0 24px; font-size: 16px;">
        Un nouvel avis négatif a été posté sur <strong>${params.businessName}</strong>.
      </p>
      <div style="background: #f8fafc; border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <strong style="color: #1e293b;">${params.reviewerName}</strong>
          <span style="margin-left: 8px; color: #f59e0b;">${stars}</span>
        </div>
        <p style="color: #475569; margin: 0; font-style: italic;">"${params.comment}"</p>
      </div>
      <a href="${appUrl}/reviews/${params.reviewId}"
         style="display: block; background: linear-gradient(135deg, #0ea5e9, #06b6d4); color: white; text-decoration: none; text-align: center; padding: 14px 24px; border-radius: 10px; font-weight: 600; font-size: 15px;">
        Répondre maintenant →
      </a>
    </div>
    <div style="padding: 16px 32px; background: #f8fafc; text-align: center;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        Vous recevez cet email car vous utilisez Reputix.
        <a href="${appUrl}/settings" style="color: #0ea5e9;">Gérer vos préférences</a>
      </p>
    </div>
  </div>
</body>
</html>
    `,
  })
}

export async function sendMonthlyReport(params: {
  userEmail: string
  userName: string
  businessName: string
  month: string
  rating: number
  totalReviews: number
  newReviews: number
  responseRate: number
  publishedReplies: number
  seoScore: number
  competitorRank: number
  totalCompetitors: number
}) {
  const appUrl = process.env.NEXTAUTH_URL ?? "https://reputix.net"

  const ratingStars = "⭐".repeat(Math.round(params.rating))
  const rankEmoji = params.competitorRank === 1 ? "🏆" : params.competitorRank <= 3 ? "🥈" : "📊"

  await getResend().emails.send({
    from: process.env.EMAIL_FROM ?? "Reputix <alertes@reputix.net>",
    to: params.userEmail,
    subject: `📊 Votre rapport mensuel Reputix — ${params.month}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, sans-serif; background: #f8fafc; padding: 40px 20px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0ea5e9, #06b6d4); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">Reputix</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Rapport mensuel — ${params.month}</p>
    </div>

    <div style="padding: 32px;">
      <p style="color: #64748b; margin: 0 0 8px;">Bonjour ${params.userName},</p>
      <p style="color: #1e293b; font-size: 16px; margin: 0 0 28px;">
        Voici le bilan de réputation de <strong>${params.businessName}</strong> pour le mois de ${params.month}.
      </p>

      <!-- Stats grid -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
        <tr>
          <td width="50%" style="padding: 0 8px 16px 0;">
            <div style="background: #f8fafc; border-radius: 12px; padding: 20px; text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #1e293b;">${params.rating.toFixed(1)}</div>
              <div style="font-size: 18px; margin: 4px 0;">${ratingStars}</div>
              <div style="font-size: 12px; color: #64748b;">Note moyenne</div>
            </div>
          </td>
          <td width="50%" style="padding: 0 0 16px 8px;">
            <div style="background: #f8fafc; border-radius: 12px; padding: 20px; text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #0ea5e9;">+${params.newReviews}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 8px;">Nouveaux avis</div>
              <div style="font-size: 11px; color: #94a3b8;">${params.totalReviews} au total</div>
            </div>
          </td>
        </tr>
        <tr>
          <td width="50%" style="padding: 0 8px 0 0;">
            <div style="background: #f8fafc; border-radius: 12px; padding: 20px; text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #10b981;">${Math.round(params.responseRate)}%</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 8px;">Taux de réponse</div>
              <div style="font-size: 11px; color: #94a3b8;">${params.publishedReplies} réponses publiées</div>
            </div>
          </td>
          <td width="50%" style="padding: 0 0 0 8px;">
            <div style="background: #f8fafc; border-radius: 12px; padding: 20px; text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #f59e0b;">${rankEmoji} #${params.competitorRank}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 8px;">Classement local</div>
              <div style="font-size: 11px; color: #94a3b8;">sur ${params.totalCompetitors} établissements</div>
            </div>
          </td>
        </tr>
      </table>

      <!-- SEO Score -->
      <div style="background: linear-gradient(135deg, #0ea5e9, #06b6d4); border-radius: 12px; padding: 20px; margin-bottom: 24px; color: white;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 13px; opacity: 0.8; margin-bottom: 4px;">Score SEO Local</div>
            <div style="font-size: 36px; font-weight: 700;">${params.seoScore}<span style="font-size: 18px; opacity: 0.7;">/100</span></div>
          </div>
          <div style="font-size: 40px;">⚡</div>
        </div>
        <div style="background: rgba(255,255,255,0.2); border-radius: 999px; height: 6px; margin-top: 12px;">
          <div style="background: white; border-radius: 999px; height: 6px; width: ${params.seoScore}%;"></div>
        </div>
      </div>

      <!-- CTA -->
      <a href="${appUrl}/dashboard"
         style="display: block; background: linear-gradient(135deg, #0ea5e9, #06b6d4); color: white; text-decoration: none; text-align: center; padding: 14px 24px; border-radius: 10px; font-weight: 600; font-size: 15px; margin-bottom: 16px;">
        Voir mon dashboard complet →
      </a>
    </div>

    <div style="padding: 16px 32px; background: #f8fafc; text-align: center;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        Reputix — Rapport automatique mensuel ·
        <a href="${appUrl}/settings" style="color: #0ea5e9;">Gérer mes préférences</a>
      </p>
    </div>
  </div>
</body>
</html>
    `,
  })
}
