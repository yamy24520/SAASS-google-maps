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

export async function sendReviewRequestWithOffer(params: {
  customerEmail: string
  businessName: string
  offerText: string
  offerType: "FIXED" | "SPIN_WHEEL"
  reviewUrl: string
  claimUrl: string
}) {
  const incentiveText = params.offerType === "SPIN_WHEEL"
    ? "Tentez votre chance à la roulette des cadeaux !"
    : params.offerText

  const incentiveEmoji = params.offerType === "SPIN_WHEEL" ? "🎰" : "🎁"

  await getResend().emails.send({
    from: process.env.EMAIL_FROM ?? "Reputix <alertes@reputix.net>",
    to: params.customerEmail,
    subject: `${incentiveEmoji} Votre récompense de ${params.businessName} vous attend`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, sans-serif; background: #f8fafc; padding: 40px 20px; margin: 0;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #0ea5e9, #06b6d4); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">${params.businessName}</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Merci pour votre visite !</p>
    </div>
    <div style="padding: 32px;">
      <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 2px solid #86efac; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 28px;">
        <div style="font-size: 40px; margin-bottom: 8px;">${incentiveEmoji}</div>
        <p style="color: #166534; font-size: 18px; font-weight: 700; margin: 0 0 6px;">Votre récompense :</p>
        <p style="color: #15803d; font-size: 18px; font-weight: 800; margin: 0;">${incentiveText}</p>
      </div>
      <p style="color: #1e293b; font-weight: 600; margin: 0 0 8px; font-size: 16px; text-align: center;">Étape 1 : Laissez-nous un avis Google ⭐</p>
      <p style="color: #64748b; font-size: 14px; text-align: center; margin: 0 0 16px;">Cela prend moins d'une minute et nous aide énormément !</p>
      <a href="${params.reviewUrl}" style="display: block; background: linear-gradient(135deg, #0ea5e9, #06b6d4); color: white; text-decoration: none; text-align: center; padding: 14px 24px; border-radius: 10px; font-weight: 600; font-size: 15px; margin-bottom: 24px;">
        Laisser mon avis Google →
      </a>
      <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center;">
        <p style="color: #64748b; font-size: 13px; margin: 0 0 12px;">Étape 2 : Une fois votre avis publié, réclamez votre récompense</p>
        <a href="${params.claimUrl}" style="display: inline-block; background: white; color: #0ea5e9; text-decoration: none; text-align: center; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 14px; border: 2px solid #0ea5e9;">
          ${params.offerType === "SPIN_WHEEL" ? "🎰 Tourner la roulette" : "🎁 Réclamer mon offre"}
        </a>
      </div>
    </div>
    <div style="padding: 16px 32px; background: #f8fafc; text-align: center;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">Propulsé par Reputix — Gérez votre réputation en ligne</p>
    </div>
  </div>
</body>
</html>
    `,
  })
}

// ─── BOOKING EMAILS ───────────────────────────────────────────────────────────

function bookingBlock(params: {
  serviceName: string; date: string; timeSlot: string
  duration: number; price: number; isRestaurant?: boolean; partySize?: number | null
}) {
  const rows = [
    { icon: "🗓️", label: "Date", value: params.date },
    { icon: "🕐", label: "Heure", value: params.timeSlot },
    ...(params.isRestaurant ? [
      { icon: "👥", label: "Couverts", value: `${params.partySize ?? 1} personne${(params.partySize ?? 1) > 1 ? "s" : ""}` },
    ] : [
      { icon: "✂️", label: "Prestation", value: params.serviceName },
      { icon: "⏱️", label: "Durée", value: `${params.duration} min` },
      ...(params.price > 0 ? [{ icon: "💶", label: "Prix", value: `${params.price.toFixed(2)} €` }] : []),
    ]),
  ]

  const rowsHtml = rows.map(r => `
    <tr>
      <td style="padding:10px 16px;width:40px;font-size:16px;vertical-align:middle;">${r.icon}</td>
      <td style="padding:10px 0;color:#64748b;font-size:13px;vertical-align:middle;">${r.label}</td>
      <td style="padding:10px 16px 10px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right;vertical-align:middle;">${r.value}</td>
    </tr>
  `).join(`<tr><td colspan="3" style="padding:0;"><div style="height:1px;background:#f1f5f9;margin:0 16px;"></div></td></tr>`)

  return `
    <div style="background:#f8fafc;border-radius:14px;overflow:hidden;margin:0 0 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        ${rowsHtml}
      </table>
    </div>`
}

function emailShell(bizName: string, subtitle: string, accentColor: string, body: string) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f1f5f9;padding:32px 16px;margin:0;">
  <div style="max-width:520px;margin:0 auto;">
    <!-- Card -->
    <div style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.10);">
      <!-- Header -->
      <div style="background:${accentColor};padding:32px 32px 28px;text-align:center;">
        <div style="width:52px;height:52px;background:rgba(255,255,255,0.2);border-radius:14px;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:white;line-height:52px;">
          ${bizName.charAt(0).toUpperCase()}
        </div>
        <h1 style="color:white;margin:0;font-size:20px;font-weight:700;letter-spacing:-0.3px;">${bizName}</h1>
        <p style="color:rgba(255,255,255,0.80);margin:6px 0 0;font-size:13px;">${subtitle}</p>
      </div>
      <!-- Body -->
      <div style="padding:28px 28px 24px;">${body}</div>
      <!-- Footer -->
      <div style="padding:14px 28px;background:#f8fafc;border-top:1px solid #f1f5f9;text-align:center;">
        <p style="color:#cbd5e1;font-size:11px;margin:0;">Propulsé par <strong style="color:#94a3b8;">Reputix</strong></p>
      </div>
    </div>
  </div>
</body></html>`
}

const BRAND_GRADIENT = "linear-gradient(135deg,#0ea5e9,#06b6d4)"

export async function sendBookingRequestClient(params: {
  clientEmail: string; clientName: string; businessName: string
  serviceName: string; date: string; timeSlot: string; duration: number; price: number
  cancelUrl?: string; portalUrl?: string; isRestaurant?: boolean; partySize?: number | null
}) {
  const actionsBlock = `
    <div style="margin-top:20px;display:flex;flex-direction:column;gap:10px;">
      ${params.portalUrl ? `
        <a href="${params.portalUrl}" style="display:block;background:${BRAND_GRADIENT};color:white;text-decoration:none;text-align:center;padding:13px 20px;border-radius:12px;font-weight:600;font-size:14px;">
          📋 Gérer mes réservations →
        </a>` : ""}
      ${params.cancelUrl ? `
        <a href="${params.cancelUrl}" style="display:block;color:#94a3b8;text-decoration:none;text-align:center;font-size:12px;padding:8px;">
          Annuler cette réservation
        </a>` : ""}
    </div>`

  await getResend().emails.send({
    from: process.env.EMAIL_FROM ?? "Reputix <alertes@reputix.net>",
    to: params.clientEmail,
    subject: `📅 Demande reçue — ${params.businessName}`,
    html: emailShell(params.businessName, "Réservation en attente", BRAND_GRADIENT, `
      <p style="color:#64748b;margin:0 0 4px;font-size:14px;">Bonjour <strong style="color:#1e293b;">${params.clientName}</strong>,</p>
      <p style="color:#475569;margin:0 0 22px;font-size:14px;line-height:1.6;">
        Votre demande ${params.isRestaurant ? "de table" : "de rendez-vous"} chez <strong>${params.businessName}</strong> a bien été reçue.
        Vous recevrez une confirmation dès validation.
      </p>
      ${bookingBlock(params)}
      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:10px;">
        <span style="font-size:18px;">⏳</span>
        <p style="color:#92400e;font-size:13px;margin:0;">En attente de confirmation par l'établissement</p>
      </div>
      ${actionsBlock}
    `),
  })
}

export async function sendBookingRequestOwner(params: {
  ownerEmail: string; businessName: string; clientName: string; clientEmail: string; clientPhone: string | null
  serviceName: string; date: string; timeSlot: string; duration: number; price: number
  dashboardUrl: string; isRestaurant?: boolean; partySize?: number | null
}) {
  await getResend().emails.send({
    from: process.env.EMAIL_FROM ?? "Reputix <alertes@reputix.net>",
    to: params.ownerEmail,
    subject: `🔔 Nouvelle demande — ${params.clientName}`,
    html: emailShell(params.businessName, "Nouvelle réservation", BRAND_GRADIENT, `
      <p style="color:#475569;margin:0 0 22px;font-size:14px;line-height:1.6;">
        Vous avez une nouvelle demande de ${params.isRestaurant ? "table" : "rendez-vous"} !
      </p>
      ${bookingBlock(params)}
      <div style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:20px;">
        <p style="font-weight:700;color:#1e293b;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 10px;">Client</p>
        <table cellpadding="0" cellspacing="0">
          <tr><td style="padding:0 10px 6px 0;font-size:15px;">👤</td><td style="color:#334155;font-size:13px;padding-bottom:6px;">${params.clientName}</td></tr>
          <tr><td style="padding:0 10px 6px 0;font-size:15px;">✉️</td><td style="color:#334155;font-size:13px;padding-bottom:6px;">${params.clientEmail}</td></tr>
          ${params.clientPhone ? `<tr><td style="padding:0 10px 0 0;font-size:15px;">📞</td><td style="color:#334155;font-size:13px;">${params.clientPhone}</td></tr>` : ""}
        </table>
      </div>
      <a href="${params.dashboardUrl}" style="display:block;background:${BRAND_GRADIENT};color:white;text-decoration:none;text-align:center;padding:14px 20px;border-radius:12px;font-weight:600;font-size:14px;">
        Confirmer ou refuser →
      </a>
    `),
  })
}

export async function sendBookingConfirmedClient(params: {
  clientEmail: string; clientName: string; businessName: string
  serviceName: string; date: string; timeSlot: string; duration: number; price: number
  cancelUrl?: string; isRestaurant?: boolean; partySize?: number | null
}) {
  const cancelBlock = params.cancelUrl ? `
    <a href="${params.cancelUrl}" style="display:block;color:#94a3b8;text-decoration:none;text-align:center;font-size:12px;padding:8px;margin-top:8px;">
      Annuler ma réservation
    </a>` : ""

  await getResend().emails.send({
    from: process.env.EMAIL_FROM ?? "Reputix <alertes@reputix.net>",
    to: params.clientEmail,
    subject: `✅ Confirmé — ${params.businessName}`,
    html: emailShell(params.businessName, "Rendez-vous confirmé", "linear-gradient(135deg,#10b981,#059669)", `
      <div style="text-align:center;margin-bottom:24px;">
        <div style="width:60px;height:60px;border-radius:50%;background:#dcfce7;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:28px;line-height:60px;">✅</div>
        <p style="color:#1e293b;font-size:18px;font-weight:700;margin:0;">C'est confirmé !</p>
      </div>
      <p style="color:#475569;margin:0 0 22px;font-size:14px;text-align:center;line-height:1.6;">
        Bonjour <strong>${params.clientName}</strong>, votre rendez-vous chez <strong>${params.businessName}</strong> est confirmé.
      </p>
      ${bookingBlock(params)}
      <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">En cas d'empêchement, merci de prévenir l'établissement le plus tôt possible.</p>
      ${cancelBlock}
    `),
  })
}

export async function sendBookingReminderClient(params: {
  clientEmail: string; clientName: string; businessName: string
  serviceName: string; date: string; timeSlot: string; duration: number; price: number
  cancelUrl?: string; isRestaurant?: boolean; partySize?: number | null
}) {
  const cancelBlock = params.cancelUrl ? `
    <a href="${params.cancelUrl}" style="display:block;color:#94a3b8;text-decoration:none;text-align:center;font-size:12px;padding:8px;margin-top:8px;">
      Annuler ma réservation
    </a>` : ""

  await getResend().emails.send({
    from: process.env.EMAIL_FROM ?? "Reputix <alertes@reputix.net>",
    to: params.clientEmail,
    subject: `⏰ Rappel — Demain chez ${params.businessName}`,
    html: emailShell(params.businessName, "Rappel de rendez-vous", "linear-gradient(135deg,#f59e0b,#d97706)", `
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:44px;margin-bottom:10px;">⏰</div>
        <p style="color:#1e293b;font-size:18px;font-weight:700;margin:0;">Votre RDV, c'est demain !</p>
      </div>
      <p style="color:#475569;margin:0 0 22px;font-size:14px;text-align:center;line-height:1.6;">
        Bonjour <strong>${params.clientName}</strong>, n'oubliez pas votre rendez-vous chez <strong>${params.businessName}</strong> demain.
      </p>
      ${bookingBlock(params)}
      <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">En cas d'empêchement, merci de prévenir l'établissement le plus tôt possible.</p>
      ${cancelBlock}
    `),
  })
}

export async function sendBookingCancelledClient(params: {
  clientEmail: string; clientName: string; businessName: string
  serviceName: string; date: string; timeSlot: string
}) {
  await getResend().emails.send({
    from: process.env.EMAIL_FROM ?? "Reputix <alertes@reputix.net>",
    to: params.clientEmail,
    subject: `❌ Annulé — ${params.businessName}`,
    html: emailShell(params.businessName, "Réservation annulée", "linear-gradient(135deg,#ef4444,#dc2626)", `
      <div style="text-align:center;margin-bottom:24px;">
        <div style="width:60px;height:60px;border-radius:50%;background:#fee2e2;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:28px;line-height:60px;">❌</div>
        <p style="color:#1e293b;font-size:18px;font-weight:700;margin:0;">Votre réservation a été annulée</p>
      </div>
      <p style="color:#475569;margin:0 0 22px;font-size:14px;text-align:center;line-height:1.6;">
        Bonjour <strong>${params.clientName}</strong>,<br>
        votre <strong>${params.serviceName}</strong> du <strong>${params.date} à ${params.timeSlot}</strong> chez <strong>${params.businessName}</strong> a été annulé.
      </p>
      <p style="color:#94a3b8;font-size:13px;text-align:center;">N'hésitez pas à reprendre rendez-vous.</p>
    `),
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
