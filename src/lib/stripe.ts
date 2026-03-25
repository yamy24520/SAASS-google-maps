import Stripe from "stripe"

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_placeholder", {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    })
  }
  return _stripe
}

// Keep backward compat alias
export const stripe = {
  get customers() { return getStripe().customers },
  get subscriptions() { return getStripe().subscriptions },
  get checkout() { return getStripe().checkout },
  get billingPortal() { return getStripe().billingPortal },
  get webhooks() { return getStripe().webhooks },
}

export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID!

export const PLANS = {
  PRO: {
    name: "Reputix Pro",
    price: 30,
    currency: "eur",
    interval: "month",
    features: [
      "Réponses IA illimitées",
      "Synchronisation Google Maps",
      "Alertes avis négatifs",
      "Auto-réponse configurable",
      "Tableau de bord analytique",
      "Support prioritaire",
    ],
  },
} as const
