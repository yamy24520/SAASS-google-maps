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

// OpenTable-inspired: warm cream bg, serif headline, black CTA, dark footer
// accentColor is used for the status dot and section divider only — never on buttons

function detailRow(label: string, value: string, last = false) {
  const border = last ? "" : "border-bottom:1px solid #E8E4D9;"
  return `<tr>
    <td style="padding:12px 0;font-family:sans-serif;font-size:13px;color:#6B6358;${border}">${label}</td>
    <td style="padding:12px 0;font-family:sans-serif;font-size:13px;font-weight:600;color:#1A1714;text-align:right;${border}">${value}</td>
  </tr>`
}

function bookingInfoBlock(params: {
  serviceName: string; date: string; timeSlot: string
  duration: number; price: number; isRestaurant?: boolean; partySize?: number | null
}) {
  const covers = params.partySize ?? 1
  const rows = params.isRestaurant ? [
    detailRow("Date", `<strong>${params.date}</strong>`),
    detailRow("Heure", params.timeSlot),
    detailRow("Couverts", `${covers} personne${covers > 1 ? "s" : ""}`, true),
  ] : [
    detailRow("Date", `<strong>${params.date}</strong>`),
    detailRow("Heure", params.timeSlot),
    detailRow("Prestation", params.serviceName),
    detailRow("Durée", `${params.duration} min`, params.price <= 0),
    ...(params.price > 0 ? [detailRow("Prix", `${params.price.toFixed(2)} €`, true)] : []),
  ]
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:24px 0 0;">
    ${rows.join("")}
  </table>`
}

function clientInfoBlock(name: string, email: string, phone?: string | null, notes?: string | null) {
  const rows = [
    detailRow("Nom", name),
    detailRow("Email", `<a href="mailto:${email}" style="color:#1A1714;text-decoration:none;">${email}</a>`, !phone && !notes),
    ...(phone ? [detailRow("Tél.", phone, !notes)] : []),
    ...(notes ? [detailRow("Notes", notes, true)] : []),
  ]
  return `<div style="margin-top:20px;border-top:2px solid #1A1714;padding-top:16px;">
    <p style="margin:0 0 4px;font-family:sans-serif;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#6B6358;">Client</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${rows.join("")}
    </table>
  </div>`
}

export type EmailBranding = {
  emailHeaderUrl?: string | null
  emailHeaderHeight?: number | null
  emailBgColor?: string | null
  emailButtonColor?: string | null
  emailGreeting?: string | null
  emailFooterMessage?: string | null
  emailSenderName?: string | null
}

const DEFAULT_HEADER = "https://reputix.net/2026-VDay-Email-Header.gif"
const DEFAULT_BG = "#F5F2EA"
const DEFAULT_BUTTON = "#1A1714"

// Client email — with custom branding (image, colors, messages)
function emailShell(bizName: string, headline: string, subline: string, _accentColor: string, body: string, branding: EmailBranding = {}) {
  const bg = branding.emailBgColor || DEFAULT_BG
  const btnColor = branding.emailButtonColor || DEFAULT_BUTTON
  const headerUrl = branding.emailHeaderUrl !== undefined ? branding.emailHeaderUrl : DEFAULT_HEADER
  const footerMsg = branding.emailFooterMessage || `Cet email vous a été envoyé suite à votre réservation chez <strong style="font-weight:600;">${bizName}</strong>.`

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body,#bodyTable{height:100%!important;width:100%!important;margin:0;padding:0;}
    img,a img{border:0;outline:none;text-decoration:none;}
    table,td{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;}
    body,table,td,p,a,li{-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%;}
    a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important;}
    @media only screen and (max-width:480px){
      .mpad{padding-left:24px!important;padding-right:24px!important;}
      .headline{font-size:28px!important;line-height:34px!important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${bg};" bgcolor="${bg}">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${bg}">
    <tr>
      <td align="center" valign="top" style="padding:40px 16px 0;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;">

          <!-- Card -->
          <tr>
            <td bgcolor="#FDFAF4" style="background-color:#FDFAF4;border:1px solid #E8E4D9;border-radius:2px;">

              <!-- Top bar -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="background:${btnColor};padding:18px 48px;" class="mpad">
                  <span style="font-family:sans-serif;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#F5F2EA;">${bizName}</span>
                </td></tr>
              </table>

              ${headerUrl ? `<!-- Header illustration -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:0;line-height:0;font-size:0;">
                  <img src="${headerUrl}" width="560" alt="" style="display:block;width:100%;height:${branding.emailHeaderHeight ? `${branding.emailHeaderHeight}px` : "auto"};max-width:560px;${branding.emailHeaderHeight ? "object-fit:cover;" : ""}" />
                </td></tr>
              </table>` : ""}

              <!-- Hero text -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:${headerUrl ? "36px" : "40px"} 48px 8px;" class="mpad">
                  <p style="margin:0 0 10px;font-family:sans-serif;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#9C9589;">${subline}</p>
                  <h1 class="headline" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:36px;line-height:42px;font-weight:400;color:#1A1714;">${headline}</h1>
                </td></tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:24px 48px 0;" class="mpad">
                  <div style="height:1px;background:#E8E4D9;font-size:0;line-height:0;">&nbsp;</div>
                </td></tr>
              </table>

              <!-- Body -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:28px 48px 48px;" class="mpad">
                  ${body}
                </td></tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="${btnColor}" style="background-color:${btnColor};border-radius:0 0 2px 2px;padding:28px 48px 24px;" class="mpad">
              <p style="margin:0 0 6px;font-family:sans-serif;font-size:12px;font-weight:300;color:#C8C2B6;line-height:18px;">
                ${footerMsg}
              </p>
              <p style="margin:0;font-family:sans-serif;font-size:11px;font-weight:300;color:#6B6358;line-height:16px;">
                Propulsé par <a href="https://reputix.net" style="color:#9C9589;text-decoration:none;font-weight:600;">Reputix</a>
              </p>
            </td>
          </tr>

          <tr><td style="padding-bottom:40px;"></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// Owner email — sobre, sans GIF, toujours dark
function emailShellOwner(bizName: string, headline: string, subline: string, body: string) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body,#bodyTable{height:100%!important;width:100%!important;margin:0;padding:0;}
    img,a img{border:0;outline:none;text-decoration:none;}
    table,td{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;}
    body,table,td,p,a,li{-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%;}
    @media only screen and (max-width:480px){
      .mpad{padding-left:24px!important;padding-right:24px!important;}
      .headline{font-size:24px!important;line-height:30px!important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F0EDE5;" bgcolor="#F0EDE5">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F0EDE5">
    <tr>
      <td align="center" valign="top" style="padding:32px 16px 0;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;">

          <!-- Card -->
          <tr>
            <td bgcolor="#FFFFFF" style="background-color:#FFFFFF;border:1px solid #E0DDD5;border-radius:2px;">

              <!-- Top bar with biz name + badge -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#1A1714;padding:14px 36px;" class="mpad">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-family:sans-serif;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#F5F2EA;">${bizName}</td>
                        <td style="text-align:right;font-family:sans-serif;font-size:10px;font-weight:600;letter-spacing:0.8px;color:#9C9589;text-transform:uppercase;">Dashboard</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Hero -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:32px 36px 8px;border-bottom:1px solid #F0EDE5;" class="mpad">
                  <p style="margin:0 0 8px;font-family:sans-serif;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#9C9589;">${subline}</p>
                  <h1 class="headline" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:34px;font-weight:400;color:#1A1714;">${headline}</h1>
                </td></tr>
              </table>

              <!-- Body -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:24px 36px 40px;" class="mpad">
                  ${body}
                </td></tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 36px 40px;" class="mpad">
              <p style="margin:0;font-family:sans-serif;font-size:11px;color:#9C9589;line-height:16px;">
                Propulsé par <a href="https://reputix.net" style="color:#6B6358;text-decoration:none;font-weight:600;">Reputix</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// Primary = colored button / secondary = small underlined link
function ctaButton(label: string, url: string, _color: string, style: "primary" | "secondary" = "primary", btnColor = DEFAULT_BUTTON) {
  if (style === "secondary") {
    return `<p style="margin:16px 0 0;text-align:center;">
      <a href="${url}" style="font-family:sans-serif;font-size:12px;color:#9C9589;text-decoration:underline;">${label}</a>
    </p>`
  }
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
    <tr><td>
      <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:48px;v-text-anchor:middle;width:100%;" strokecolor="${btnColor}" fillcolor="${btnColor}"><w:anchorlock/><center style="font-family:sans-serif;color:#F5F2EA;font-size:14px;font-weight:600;">${label}</center></v:roundrect><![endif]-->
      <a href="${url}" style="display:block;background:${btnColor};color:#F5F2EA;font-family:sans-serif;font-size:14px;font-weight:600;text-decoration:none;text-align:center;padding:15px 24px;letter-spacing:0.3px;mso-hide:all;">${label}</a>
    </td></tr>
  </table>`
}

// Owner CTA — always dark
function ctaOwner(label: string, url: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
    <tr><td>
      <a href="${url}" style="display:block;background:#1A1714;color:#F5F2EA;font-family:sans-serif;font-size:13px;font-weight:600;text-decoration:none;text-align:center;padding:13px 24px;letter-spacing:0.3px;">${label} →</a>
    </td></tr>
  </table>`
}

export async function sendBookingRequestClient(params: {
  clientEmail: string; clientName: string; businessName: string
  serviceName: string; date: string; timeSlot: string; duration: number; price: number
  cancelUrl?: string; portalUrl?: string; isRestaurant?: boolean; partySize?: number | null
  branding?: EmailBranding
}) {
  const b = params.branding ?? {}
  const greeting = b.emailGreeting || `Votre demande ${params.isRestaurant ? "de table" : "de rendez-vous"} a bien été reçue. Vous recevrez une confirmation dès validation par l'établissement.`
  const btn = b.emailButtonColor || DEFAULT_BUTTON
  await getResend().emails.send({
    from: b.emailSenderName ? `${b.emailSenderName} <alertes@reputix.net>` : (process.env.EMAIL_FROM ?? "Reputix <alertes@reputix.net>"),
    to: params.clientEmail,
    subject: `Demande de réservation reçue — ${params.businessName}`,
    html: emailShell(params.businessName, "Réservation reçue", "En attente de confirmation", "#f59e0b", `
      <p style="font-family:sans-serif;font-size:15px;line-height:1.7;color:#1A1714;margin:0 0 6px;">
        Bonjour <strong>${params.clientName}</strong>,
      </p>
      <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#6B6358;margin:0;">${greeting}</p>
      ${bookingInfoBlock(params)}
      ${params.portalUrl ? ctaButton("Gérer mes réservations", params.portalUrl, btn, "primary", btn) : ""}
      ${params.cancelUrl ? ctaButton("Annuler cette réservation", params.cancelUrl, btn, "secondary") : ""}
    `, b),
  })
}

export async function sendBookingConfirmedClient(params: {
  clientEmail: string; clientName: string; businessName: string
  serviceName: string; date: string; timeSlot: string; duration: number; price: number
  cancelUrl?: string; isRestaurant?: boolean; partySize?: number | null
  branding?: EmailBranding
}) {
  const b = params.branding ?? {}
  const btn = b.emailButtonColor || DEFAULT_BUTTON
  await getResend().emails.send({
    from: b.emailSenderName ? `${b.emailSenderName} <alertes@reputix.net>` : (process.env.EMAIL_FROM ?? "Reputix <alertes@reputix.net>"),
    to: params.clientEmail,
    subject: `Réservation confirmée — ${params.businessName}`,
    html: emailShell(params.businessName, "C'est confirmé.", "Votre réservation", "#10b981", `
      <p style="font-family:sans-serif;font-size:15px;line-height:1.7;color:#1A1714;margin:0 0 6px;">
        Bonjour <strong>${params.clientName}</strong>,
      </p>
      <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#6B6358;margin:0;">
        Votre ${params.isRestaurant ? "réservation" : "rendez-vous"} est confirmé. À très bientôt !
      </p>
      ${bookingInfoBlock(params)}
      <p style="font-family:sans-serif;font-size:12px;color:#9C9589;text-align:center;margin:20px 0 0;">
        En cas d'empêchement, merci de prévenir l'établissement.
      </p>
      ${params.cancelUrl ? ctaButton("Annuler ma réservation", params.cancelUrl, btn, "secondary") : ""}
    `, b),
  })
}

export async function sendBookingReminderClient(params: {
  clientEmail: string; clientName: string; businessName: string
  serviceName: string; date: string; timeSlot: string; duration: number; price: number
  cancelUrl?: string; isRestaurant?: boolean; partySize?: number | null
  branding?: EmailBranding
}) {
  const b = params.branding ?? {}
  const btn = b.emailButtonColor || DEFAULT_BUTTON
  await getResend().emails.send({
    from: b.emailSenderName ? `${b.emailSenderName} <alertes@reputix.net>` : (process.env.EMAIL_FROM ?? "Reputix <alertes@reputix.net>"),
    to: params.clientEmail,
    subject: `Rappel — Votre rendez-vous demain chez ${params.businessName}`,
    html: emailShell(params.businessName, "C'est demain.", "Rappel de réservation", "#f59e0b", `
      <p style="font-family:sans-serif;font-size:15px;line-height:1.7;color:#1A1714;margin:0 0 6px;">
        Bonjour <strong>${params.clientName}</strong>,
      </p>
      <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#6B6358;margin:0;">
        N'oubliez pas votre ${params.isRestaurant ? "réservation" : "rendez-vous"} de demain.
      </p>
      ${bookingInfoBlock(params)}
      <p style="font-family:sans-serif;font-size:12px;color:#9C9589;text-align:center;margin:20px 0 0;">
        En cas d'empêchement, merci de prévenir l'établissement le plus tôt possible.
      </p>
      ${params.cancelUrl ? ctaButton("Annuler ma réservation", params.cancelUrl, btn, "secondary") : ""}
    `, b),
  })
}

export async function sendBookingCancelledClient(params: {
  clientEmail: string; clientName: string; businessName: string
  serviceName: string; date: string; timeSlot: string
  branding?: EmailBranding
}) {
  const b = params.branding ?? {}
  await getResend().emails.send({
    from: b.emailSenderName ? `${b.emailSenderName} <alertes@reputix.net>` : (process.env.EMAIL_FROM ?? "Reputix <alertes@reputix.net>"),
    to: params.clientEmail,
    subject: `Réservation annulée — ${params.businessName}`,
    html: emailShell(params.businessName, "Réservation annulée.", "Annulation", "#ef4444", `
      <p style="font-family:sans-serif;font-size:15px;line-height:1.7;color:#1A1714;margin:0 0 6px;">
        Bonjour <strong>${params.clientName}</strong>,
      </p>
      <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#6B6358;margin:0;">
        Votre réservation du <strong style="color:#1A1714;">${params.date} à ${params.timeSlot}</strong> a été annulée.
        N'hésitez pas à reprendre rendez-vous quand vous le souhaitez.
      </p>
    `, b),
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
    html: emailShell(params.businessName, "Votre code.", "Espace client", "#6366f1", `
      <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#6B6358;margin:0 0 24px;">
        Utilisez ce code pour accéder à votre espace client :
      </p>
      <div style="background:#F0EDE5;border:1px solid #E8E4D9;padding:24px 32px;text-align:center;margin:0 0 20px;">
        <span style="font-size:40px;font-weight:700;letter-spacing:16px;color:#1A1714;font-family:'Courier New',Courier,monospace;">${params.code}</span>
      </div>
      <p style="font-family:sans-serif;font-size:12px;color:#9C9589;text-align:center;margin:0;">
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
    ${ctaOwner("Voir dans le dashboard", params.dashboardUrl)}
  `
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
    html: emailShellOwner(params.businessName, "Nouvelle demande.", "Réservation à confirmer", `
      <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#6B6358;margin:0;">
        Vous avez une nouvelle demande de ${params.isRestaurant ? "table" : "rendez-vous"} de <strong style="color:#1A1714;">${params.clientName}</strong>.
      </p>
      ${ownerBookingBlock(params)}
    `),
  })
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
    html: emailShellOwner(params.businessName, "RDV confirmé.", "Notification", `
      <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#6B6358;margin:0;">
        Vous avez confirmé le rendez-vous de <strong style="color:#1A1714;">${params.clientName}</strong>.
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
    ? `Le client <strong style="color:#1A1714;">${params.clientName}</strong> a annulé ce rendez-vous.`
    : `Vous avez annulé le rendez-vous de <strong style="color:#1A1714;">${params.clientName}</strong>.`
  await getResend().emails.send({
    from: process.env.EMAIL_FROM ?? "Reputix <alertes@reputix.net>",
    to: params.ownerEmail,
    subject: `RDV annulé — ${params.clientName}`,
    html: emailShellOwner(params.businessName, "RDV annulé.", "Notification", `
      <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#6B6358;margin:0;">${byLabel}</p>
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
    `<tr><td style="padding:9px 0;font-family:sans-serif;font-size:13px;color:#1A1714;border-bottom:1px solid #E8E4D9;">${c}</td></tr>`
  ).join("")
  await getResend().emails.send({
    from: process.env.EMAIL_FROM ?? "Reputix <alertes@reputix.net>",
    to: params.ownerEmail,
    subject: `RDV modifié — ${params.clientName}`,
    html: emailShellOwner(params.businessName, "RDV modifié.", "Notification", `
      <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#6B6358;margin:0 0 20px;">
        Le rendez-vous de <strong style="color:#1A1714;">${params.clientName}</strong> a été modifié.
      </p>
      <div style="border-top:2px solid #1A1714;padding-top:16px;margin-bottom:4px;">
        <p style="margin:0 0 8px;font-family:sans-serif;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#6B6358;">Modifications</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${changesHtml}</table>
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
