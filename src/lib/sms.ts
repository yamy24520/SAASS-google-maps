// SMS via Twilio — fallback silencieux si non configuré

interface SmsParams {
  to: string      // "+33612345678"
  message: string
}

export async function sendSms({ to, message }: SmsParams): Promise<boolean> {
  const sid   = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from  = process.env.TWILIO_PHONE_NUMBER

  if (!sid || !token || !from) return false // pas configuré, on skip

  // Nettoyer le numéro : enlever espaces, ajouter +33 si FR sans préfixe
  const clean = to.replace(/\s/g, "").replace(/^0/, "+33")

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: clean, From: from, Body: message }).toString(),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function sendBookingReminderSms(params: {
  to: string; clientName: string; businessName: string
  date: string; timeSlot: string
}): Promise<boolean> {
  return sendSms({
    to: params.to,
    message: `⏰ Rappel RDV : Bonjour ${params.clientName}, votre rendez-vous chez ${params.businessName} est demain ${params.date} à ${params.timeSlot}. En cas d'empêchement, merci de prévenir.`,
  })
}
