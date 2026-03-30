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

// SVG icons inline (email-safe, no external deps)
const ICO = {
  cal: `<img src="https://reputix.net/email-icons/calendar.png" width="16" height="16" alt="" style="vertical-align:middle;opacity:0.5;" />`,
  clock: `<img src="https://reputix.net/email-icons/clock.png" width="16" height="16" alt="" style="vertical-align:middle;opacity:0.5;" />`,
  scissors: `<img src="https://reputix.net/email-icons/scissors.png" width="16" height="16" alt="" style="vertical-align:middle;opacity:0.5;" />`,
  users: `<img src="https://reputix.net/email-icons/users.png" width="16" height="16" alt="" style="vertical-align:middle;opacity:0.5;" />`,
}

// Clean separator row
const SEP = `<tr><td colspan="3" style="padding:0 20px;"><div style="height:1px;background:#f3f4f6;"></div></td></tr>`

function infoRow(label: string, value: string) {
  return `<tr>
    <td style="padding:14px 20px;color:#6b7280;font-size:13px;white-space:nowrap;width:1%;">${label}</td>
    <td style="padding:14px 0;"></td>
    <td style="padding:14px 20px;color:#111827;font-size:13px;font-weight:600;text-align:right;">${value}</td>
  </tr>`
}

function bookingInfoBlock(params: {
  serviceName: string; date: string; timeSlot: string
  duration: number; price: number; isRestaurant?: boolean; partySize?: number | null
}) {
  const covers = params.partySize ?? 1
  const rows = [
    infoRow("Date", `<strong>${params.date}</strong>`),
    SEP,
    infoRow("Heure", params.timeSlot),
    ...(params.isRestaurant ? [SEP, infoRow("Couverts", `${covers} personne${covers > 1 ? "s" : ""}`)] : [
      SEP,
      infoRow("Prestation", params.serviceName),
      SEP,
      infoRow("Durée", `${params.duration} min`),
      ...(params.price > 0 ? [SEP, infoRow("Prix", `${params.price.toFixed(2)} €`)] : []),
    ]),
  ].join("")

  return `
    <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin:24px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        ${rows}
      </table>
    </div>`
}

function clientInfoBlock(name: string, email: string, phone?: string | null, notes?: string | null) {
  return `
    <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin:16px 0 20px;">
      <div style="background:#f9fafb;padding:10px 20px;border-bottom:1px solid #e5e7eb;">
        <span style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;">Client</span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        ${infoRow("Nom", name)}
        ${SEP}
        ${infoRow("Email", email)}
        ${phone ? SEP + infoRow("Téléphone", phone) : ""}
        ${notes ? SEP + infoRow("Notes", notes) : ""}
      </table>
    </div>`
}

function emailShell(bizName: string, statusLine: string, statusColor: string, body: string) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${bizName}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <!-- Logo / Brand -->
        <tr><td style="text-align:center;padding-bottom:20px;">
          <span style="font-size:13px;font-weight:600;color:#9ca3af;letter-spacing:0.5px;">REPUTIX</span>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.06);">

          <!-- Status header -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:28px 32px 24px;text-align:center;border-bottom:1px solid #f3f4f6;">
              <div style="width:44px;height:44px;border-radius:10px;background:#f3f4f6;margin:0 auto 14px;display:inline-block;text-align:center;line-height:44px;font-size:20px;font-weight:800;color:#374151;">
                ${bizName.charAt(0).toUpperCase()}
              </div>
              <div style="font-size:16px;font-weight:700;color:#111827;margin-bottom:4px;">${bizName}</div>
              <div style="display:inline-block;background:${statusColor};color:white;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;letter-spacing:0.3px;">${statusLine}</div>
            </td></tr>
          </table>

          <!-- Body -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:24px 28px 28px;">
              ${body}
            </td></tr>
          </table>

        </td></tr>

        <!-- Footer -->
        <tr><td style="text-align:center;padding-top:20px;">
          <p style="color:#9ca3af;font-size:11px;margin:0;">
            Propulsé par <a href="https://reputix.net" style="color:#9ca3af;text-decoration:underline;">Reputix</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function ctaButton(label: string, url: string, style: "primary" | "secondary" = "primary") {
  if (style === "secondary") {
    return `<a href="${url}" style="display:block;text-align:center;padding:10px;font-size:12px;color:#9ca3af;text-decoration:underline;">${label}</a>`
  }
  return `<a href="${url}" style="display:block;background:#111827;color:#ffffff;text-decoration:none;text-align:center;padding:13px 24px;border-radius:10px;font-weight:600;font-size:14px;margin-top:20px;">${label} →</a>`
}

export async function sendBookingRequestClient(params: {
  clientEmail: string; clientName: string; businessName: string
  serviceName: string; date: string; timeSlot: string; duration: number; price: number
  cancelUrl?: string; portalUrl?: string; isRestaurant?: boolean; partySize?: number | null
}) {
  await getResend().emails.send({
    from: process.env.EMAIL_FROM ?? "Reputix <alertes@reputix.net>",
    to: params.clientEmail,
    subject: `Demande de réservation reçue — ${params.businessName}`,
    html: emailShell(params.businessName, "En attente de confirmation", "#f59e0b", `
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 4px;">
        Bonjour <strong>${params.clientName}</strong>,
      </p>
      <p style="color:#6b7280;font-size:14px;line-height:1.7;margin:0 0 0;">
        Votre demande ${params.isRestaurant ? "de table" : "de rendez-vous"} chez <strong style="color:#111827;">${params.businessName}</strong> a bien été reçue.
        Vous recevrez une confirmation dès validation par l'établissement.
      </p>
      ${bookingInfoBlock(params)}
      ${params.portalUrl ? ctaButton("Gérer mes réservations", params.portalUrl) : ""}
      ${params.cancelUrl ? ctaButton("Annuler cette réservation", params.cancelUrl, "secondary") : ""}
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
    subject: `Nouvelle demande — ${params.clientName}`,
    html: emailShell(params.businessName, "Nouvelle réservation", "#3b82f6", `
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0;">
        Vous avez une nouvelle demande de ${params.isRestaurant ? "table" : "rendez-vous"} de <strong>${params.clientName}</strong>.
      </p>
      ${bookingInfoBlock(params)}
      ${clientInfoBlock(params.clientName, params.clientEmail, params.clientPhone)}
      ${ctaButton("Confirmer ou refuser", params.dashboardUrl)}
    `),
  })
}

export async function sendBookingConfirmedClient(params: {
  clientEmail: string; clientName: string; businessName: string
  serviceName: string; date: string; timeSlot: string; duration: number; price: number
  cancelUrl?: string; isRestaurant?: boolean; partySize?: number | null
}) {
  await getResend().emails.send({
    from: process.env.EMAIL_FROM ?? "Reputix <alertes@reputix.net>",
    to: params.clientEmail,
    subject: `Réservation confirmée — ${params.businessName}`,
    html: emailShell(params.businessName, "Réservation confirmée", "#10b981", `
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0;">
        Bonjour <strong>${params.clientName}</strong>,<br>
        votre ${params.isRestaurant ? "réservation" : "rendez-vous"} chez <strong style="color:#111827;">${params.businessName}</strong> est confirmé.
        À bientôt !
      </p>
      ${bookingInfoBlock(params)}
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin:16px 0 0;">
        En cas d'empêchement, merci de prévenir l'établissement.
      </p>
      ${params.cancelUrl ? ctaButton("Annuler ma réservation", params.cancelUrl, "secondary") : ""}
    `),
  })
}

export async function sendBookingReminderClient(params: {
  clientEmail: string; clientName: string; businessName: string
  serviceName: string; date: string; timeSlot: string; duration: number; price: number
  cancelUrl?: string; isRestaurant?: boolean; partySize?: number | null
}) {
  await getResend().emails.send({
    from: process.env.EMAIL_FROM ?? "Reputix <alertes@reputix.net>",
    to: params.clientEmail,
    subject: `Rappel — Votre rendez-vous demain chez ${params.businessName}`,
    html: emailShell(params.businessName, "Rappel · Demain", "#f59e0b", `
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0;">
        Bonjour <strong>${params.clientName}</strong>,<br>
        n'oubliez pas votre ${params.isRestaurant ? "réservation" : "rendez-vous"} chez <strong style="color:#111827;">${params.businessName}</strong> demain.
      </p>
      ${bookingInfoBlock(params)}
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin:16px 0 0;">
        En cas d'empêchement, merci de prévenir l'établissement le plus tôt possible.
      </p>
      ${params.cancelUrl ? ctaButton("Annuler ma réservation", params.cancelUrl, "secondary") : ""}
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
    subject: `Réservation annulée — ${params.businessName}`,
    html: emailShell(params.businessName, "Réservation annulée", "#ef4444", `
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0;">
        Bonjour <strong>${params.clientName}</strong>,<br>
        votre réservation du <strong>${params.date} à ${params.timeSlot}</strong> chez <strong style="color:#111827;">${params.businessName}</strong> a été annulée.
      </p>
      <p style="color:#6b7280;font-size:13px;margin:16px 0 0;">
        N'hésitez pas à reprendre rendez-vous quand vous le souhaitez.
      </p>
    `),
  })
}

// ─── OWNER NOTIFICATIONS ─────────────────────────────────────────────────────

function ownerBookingBlock(params: {
  clientName: string; clientEmail: string; clientPhone?: string | null
  serviceName: string; date: string; timeSlot: string
  duration: number; price: number; isRestaurant?: boolean; partySize?: number | null
  notes?: string | null; dashboardUrl: string
}) {
  return `
    ${bookingInfoBlock(params)}
    ${clientInfoBlock(params.clientName, params.clientEmail, params.clientPhone, params.notes)}
    ${ctaButton("Voir dans le dashboard", params.dashboardUrl)}
  `
}

export async function sendBookingConfirmedOwner(params: {
  ownerEmail: string; businessName: string; clientName: string; clientEmail: string; clientPhone?: string | null
  serviceName: string; date: string; timeSlot: string; duration: number; price: number
  isRestaurant?: boolean; partySize?: number | null; notes?: string | null; dashboardUrl: string
}) {
  await getResend().emails.send({
    from: process.env.EMAIL_FROM ?? "Reputix <alertes@reputix.net>",
    to: params.ownerEmail,
    subject: `RDV confirmé — ${params.clientName}`,
    html: emailShell(params.businessName, "Réservation confirmée", "#10b981", `
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0;">
        Vous avez confirmé le rendez-vous de <strong>${params.clientName}</strong>.
      </p>
      ${ownerBookingBlock(params)}
    `),
  })
}

export async function sendBookingCancelledOwner(params: {
  ownerEmail: string; businessName: string; clientName: string; clientEmail: string; clientPhone?: string | null
  serviceName: string; date: string; timeSlot: string; duration: number; price: number
  isRestaurant?: boolean; partySize?: number | null; cancelledBy: "owner" | "client"; dashboardUrl: string
}) {
  const byLabel = params.cancelledBy === "client"
    ? `Le client <strong>${params.clientName}</strong> a annulé ce rendez-vous.`
    : `Vous avez annulé le rendez-vous de <strong>${params.clientName}</strong>.`
  await getResend().emails.send({
    from: process.env.EMAIL_FROM ?? "Reputix <alertes@reputix.net>",
    to: params.ownerEmail,
    subject: `RDV annulé — ${params.clientName}`,
    html: emailShell(params.businessName, "Réservation annulée", "#ef4444", `
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0;">${byLabel}</p>
      ${ownerBookingBlock(params)}
    `),
  })
}

export async function sendBookingModifiedOwner(params: {
  ownerEmail: string; businessName: string; clientName: string; clientEmail: string; clientPhone?: string | null
  serviceName: string; date: string; timeSlot: string; duration: number; price: number
  isRestaurant?: boolean; partySize?: number | null; notes?: string | null
  changes: string[]; dashboardUrl: string
}) {
  const changesHtml = params.changes.map(c =>
    `<tr><td style="padding:8px 16px;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">${c}</td></tr>`
  ).join("")
  await getResend().emails.send({
    from: process.env.EMAIL_FROM ?? "Reputix <alertes@reputix.net>",
    to: params.ownerEmail,
    subject: `RDV modifié — ${params.clientName}`,
    html: emailShell(params.businessName, "Réservation modifiée", "#6366f1", `
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 16px;">
        Le rendez-vous de <strong>${params.clientName}</strong> a été modifié.
      </p>
      <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:4px;">
        <div style="background:#f9fafb;padding:8px 16px;border-bottom:1px solid #e5e7eb;">
          <span style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;">Modifications</span>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0">${changesHtml}</table>
      </div>
      ${ownerBookingBlock(params)}
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
