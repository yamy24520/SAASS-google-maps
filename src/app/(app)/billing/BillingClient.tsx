"use client"

import { useState } from "react"
import { CheckCircle2, ArrowRight, ExternalLink, Zap, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/toaster"

interface BillingClientProps {
  isActive: boolean
  status: string | null
  periodEnd: string | null
  cancelAtPeriodEnd: boolean
  businessCount: number
}

export function BillingClient({ isActive, status, periodEnd, cancelAtPeriodEnd, businessCount }: BillingClientProps) {
  const [loadingCheckout, setLoadingCheckout] = useState(false)
  const [loadingPortal, setLoadingPortal] = useState(false)

  async function handleCheckout() {
    setLoadingCheckout(true)
    const res = await fetch("/api/stripe/checkout", { method: "POST" })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      toast({ title: "Erreur", description: "Impossible de démarrer le paiement.", variant: "destructive" })
      setLoadingCheckout(false)
    }
  }

  async function handlePortal() {
    setLoadingPortal(true)
    const res = await fetch("/api/stripe/portal", { method: "POST" })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      toast({ title: "Erreur", description: "Impossible d'ouvrir le portail.", variant: "destructive" })
      setLoadingPortal(false)
    }
  }

  const periodEndDate = periodEnd ? new Date(periodEnd).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : null

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Abonnement</h1>
        <p className="text-slate-500 mt-1">Gérez votre abonnement Reputix</p>
      </div>

      {/* Statut actif */}
      {isActive && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-emerald-800">
                {status === "TRIALING" ? "Essai gratuit en cours" : "Abonnement actif"}
              </p>
              {periodEndDate && (
                <p className="text-sm text-emerald-600">
                  {cancelAtPeriodEnd
                    ? `Se termine le ${periodEndDate}`
                    : status === "TRIALING"
                    ? `Essai jusqu'au ${periodEndDate}`
                    : `Prochain renouvellement le ${periodEndDate}`}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-emerald-100 mb-4">
            <Building2 className="w-4 h-4 text-sky-500" />
            <span className="text-sm text-slate-700">
              <strong>{businessCount}</strong> établissement{businessCount > 1 ? "s" : ""} actif{businessCount > 1 ? "s" : ""}
            </span>
            <span className="ml-auto text-sm font-semibold text-slate-900">{businessCount * 30}€/mois</span>
          </div>

          <Button variant="outline" className="gap-2 w-full" onClick={handlePortal} disabled={loadingPortal}>
            <ExternalLink className="w-4 h-4" />
            {loadingPortal ? "Chargement..." : "Gérer la facturation"}
          </Button>
        </div>
      )}

      {/* Plan card — affiché si inactif */}
      {!isActive && (
        <div className="relative rounded-3xl border-2 border-sky-500 bg-white shadow-xl shadow-sky-500/10 p-8 mb-6 overflow-hidden">
          <div className="absolute top-0 right-0 gradient-bg text-white text-xs font-bold px-4 py-2 rounded-bl-2xl">
            PLAN PRO
          </div>

          <div className="flex items-end gap-2 mb-2">
            <span className="text-5xl font-bold text-slate-900">30€</span>
            <span className="text-slate-400 mb-1">/mois par établissement</span>
          </div>
          <p className="text-sm text-slate-500 mb-6">Plusieurs établissements ? Chacun est facturé séparément.</p>

          <div className="space-y-3 mb-8">
            {[
              "Réponses IA illimitées (Claude AI)",
              "Synchronisation Google Maps automatique",
              "Alertes avis négatifs par email",
              "Auto-réponse configurable",
              "Dashboard analytique complet",
              "Historique illimité des avis",
              "14 jours d'essai gratuit",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-sky-500 flex-shrink-0" />
                <span className="text-sm text-slate-700">{feature}</span>
              </div>
            ))}
          </div>

          <Button size="lg" className="gap-2 w-full" onClick={handleCheckout} disabled={loadingCheckout}>
            <Zap className="w-4 h-4" />
            {loadingCheckout ? "Chargement..." : "Activer mon abonnement"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">FAQ Abonnement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { q: "Quand suis-je facturé ?", a: "Après votre essai gratuit de 14 jours. Aucune carte requise pendant l'essai." },
            { q: "Puis-je annuler ?", a: "Oui, à tout moment depuis le portail de facturation. Vous gardez l'accès jusqu'à la fin de la période payée." },
            { q: "Comment changer ma carte ?", a: "Via le portail de facturation Stripe accessible depuis le bouton 'Gérer la facturation'." },
            { q: "Combien coûte un 2ème établissement ?", a: "30€/mois supplémentaires par établissement. Chaque établissement est géré indépendamment." },
          ].map((item) => (
            <div key={item.q}>
              <p className="text-sm font-medium text-slate-900">{item.q}</p>
              <p className="text-sm text-slate-500 mt-0.5">{item.a}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
