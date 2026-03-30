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

// Inline SVG icons (email-safe, no img tags needed)
const SVG = {
  cal:      `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  clock:    `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  scissors: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>`,
  users:    `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  timer:    `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  euro:     `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><path d="M4 10h12M4 14h12M19.5 8.5A7 7 0 1 0 19.5 15.5"/></svg>`,
  user:     `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  mail:     `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
  phone:    `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.08 6.08l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  note:     `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
}

function infoRow(icon: string, label: string, value: string, last = false) {
  const border = last ? "" : `border-bottom:1px solid #f3f4f6;`
  return `<tr style="${border}">
    <td style="padding:13px 20px;width:36px;color:#9ca3af;vertical-align:middle;">${icon}</td>
    <td style="padding:13px 0;color:#6b7280;font-size:13px;vertical-align:middle;">${label}</td>
    <td style="padding:13px 20px;color:#111827;font-size:13px;font-weight:600;text-align:right;vertical-align:middle;">${value}</td>
  </tr>`
}

function bookingInfoBlock(params: {
  serviceName: string; date: string; timeSlot: string
  duration: number; price: number; isRestaurant?: boolean; partySize?: number | null
}) {
  const covers = params.partySize ?? 1
  const rows = params.isRestaurant ? [
    infoRow(SVG.cal,   "Date",     `<strong>${params.date}</strong>`),
    infoRow(SVG.clock, "Heure",    params.timeSlot),
    infoRow(SVG.users, "Couverts", `${covers} personne${covers > 1 ? "s" : ""}`, true),
  ] : [
    infoRow(SVG.cal,      "Date",       `<strong>${params.date}</strong>`),
    infoRow(SVG.clock,    "Heure",      params.timeSlot),
    infoRow(SVG.scissors, "Prestation", params.serviceName),
    infoRow(SVG.timer,    "Durée",      `${params.duration} min`,
      params.price <= 0),
    ...(params.price > 0 ? [infoRow(SVG.euro, "Prix", `${params.price.toFixed(2)} €`, true)] : []),
  ]

  return `
    <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin:20px 0 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        ${rows.join("")}
      </table>
    </div>`
}

function clientInfoBlock(name: string, email: string, phone?: string | null, notes?: string | null) {
  const rows = [
    infoRow(SVG.user,  "Nom",       name),
    infoRow(SVG.mail,  "Email",     email, !phone && !notes),
    ...(phone  ? [infoRow(SVG.phone, "Tél.",  phone,  !notes)] : []),
    ...(notes  ? [infoRow(SVG.note,  "Notes", notes,  true)]   : []),
  ]
  return `
    <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin:16px 0 0;">
      <div style="background:#f9fafb;padding:9px 20px;border-bottom:1px solid #e5e7eb;">
        <span style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.8px;">Client</span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        ${rows.join("")}
      </table>
    </div>`
}

function emailShell(bizName: string, statusLine: string, accentColor: string, body: string) {
  // Top accent bar + clean white card
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px 48px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;">

        <!-- Card -->
        <tr><td style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.07),0 8px 32px rgba(0,0,0,0.05);">

          <!-- Top accent bar -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background:${accentColor};height:5px;font-size:0;line-height:0;">&nbsp;</td></tr>
          </table>

          <!-- Header: biz name + status -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:28px 32px 24px;text-align:center;border-bottom:1px solid #f3f4f6;">
              <div style="width:48px;height:48px;border-radius:12px;background:${accentColor};margin:0 auto 14px;text-align:center;line-height:48px;font-size:22px;font-weight:800;color:#ffffff;">
                ${bizName.charAt(0).toUpperCase()}
              </div>
              <div style="font-size:17px;font-weight:700;color:#111827;letter-spacing:-0.3px;margin-bottom:8px;">${bizName}</div>
              <div style="display:inline-block;background:${accentColor}18;color:${accentColor};font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;letter-spacing:0.4px;text-transform:uppercase;">${statusLine}</div>
            </td></tr>
          </table>

          <!-- Body -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:24px 28px 32px;">
              ${body}
            </td></tr>
          </table>

        </td></tr>

        <!-- Footer -->
        <tr><td style="text-align:center;padding-top:20px;">
          <p style="color:#9ca3af;font-size:11px;margin:0;letter-spacing:0.2px;">
            Propulsé par <a href="https://reputix.net" style="color:#6b7280;font-weight:600;text-decoration:none;">Reputix</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function ctaButton(label: string, url: string, color: string, style: "primary" | "secondary" = "primary") {
  if (style === "secondary") {
    return `<div style="text-align:center;margin-top:12px;">
      <a href="${url}" style="font-size:12px;color:#9ca3af;text-decoration:underline;">${label}</a>
    </div>`
  }
  return `<a href="${url}" style="display:block;background:${color};color:#ffffff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-weight:700;font-size:14px;margin-top:24px;letter-spacing:0.2px;">${label} →</a>`
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
      ${params.portalUrl ? ctaButton("Gérer mes réservations", params.portalUrl, "#f59e0b") : ""}
      ${params.cancelUrl ? ctaButton("Annuler cette réservation", params.cancelUrl, "#f59e0b", "secondary") : ""}
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
      ${ctaButton("Confirmer ou refuser", params.dashboardUrl, "#3b82f6")}
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
      ${params.cancelUrl ? ctaButton("Annuler ma réservation", params.cancelUrl, "#10b981", "secondary") : ""}
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
      ${params.cancelUrl ? ctaButton("Annuler ma réservation", params.cancelUrl, "#f59e0b", "secondary") : ""}
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

export async function sendClientOtpEmail(params: {
  clientEmail: string
  businessName: string
  code: string
}) {
  await getResend().emails.send({
    from: process.env.EMAIL_FROM ?? "Reputix <alertes@reputix.net>",
    to: params.clientEmail,
    subject: `${params.code} — Votre code de connexion`,
    html: emailShell(params.businessName, "Code de connexion", "#6366f1", `
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;text-align:center;">
        Voici votre code pour accéder à votre espace client :
      </p>
      <div style="background:#f3f4f6;border-radius:14px;padding:22px 32px;text-align:center;margin:0 0 20px;">
        <span style="font-size:38px;font-weight:800;letter-spacing:14px;color:#111827;font-family:monospace;">${params.code}</span>
      </div>
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">
        Ce code expire dans <strong>10 minutes</strong>. Ne le partagez avec personne.
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
    ${ctaButton("Voir dans le dashboard", params.dashboardUrl, "#6366f1")}
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
