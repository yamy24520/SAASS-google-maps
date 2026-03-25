import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Star,
  Zap,
  Bell,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  TrendingUp,
  Clock,
} from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl gradient-bg flex items-center justify-center">
              <Star className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="font-bold text-slate-900 text-lg tracking-tight">Reputix</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Fonctionnalités</a>
            <a href="#pricing" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Tarifs</a>
            <a href="#faq" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Connexion</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Démarrer gratuitement</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-cyan-50 pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-r from-sky-400/20 to-cyan-400/20 blur-3xl rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <Badge variant="info" className="mb-6 gap-1.5 px-4 py-1.5">
            <Zap className="w-3.5 h-3.5" />
            Propulsé par Claude AI
          </Badge>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-slate-900 leading-[1.1] tracking-tight mb-6">
            Répondez à vos{" "}
            <span className="gradient-text">avis Google</span>{" "}
            automatiquement
          </h1>

          <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Reputix génère des réponses personnalisées à chaque avis grâce à l&apos;IA.
            Améliorez votre réputation en ligne, votre SEO local et fidélisez vos clients.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link href="/register">
              <Button size="xl" className="gap-2">
                Essayer 14 jours gratuit
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <p className="text-sm text-slate-400">Sans carte bancaire · Annulez à tout moment</p>
          </div>

          <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto">
            {[
              { value: "2min", label: "Temps de config" },
              { value: "98%", label: "Taux de satisfaction" },
              { value: "3x", label: "Plus de réponses" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold gradient-text">{stat.value}</div>
                <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className="max-w-5xl mx-auto mt-20 relative">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-sky-500/10 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-white rounded-lg px-4 py-1 text-xs text-slate-400 border border-slate-200">
                  app.reputix.fr/dashboard
                </div>
              </div>
            </div>
            <div className="p-8 bg-slate-50">
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Note moyenne", value: "4.7", icon: "⭐", trend: "+0.2" },
                  { label: "Avis ce mois", value: "47", icon: "💬", trend: "+12" },
                  { label: "Taux de réponse", value: "94%", icon: "✅", trend: "+28%" },
                  { label: "En attente", value: "3", icon: "⏳", trend: "" },
                ].map((card) => (
                  <div key={card.label} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                    <div className="text-2xl mb-1">{card.icon}</div>
                    <div className="text-2xl font-bold text-slate-900">{card.value}</div>
                    <div className="text-xs text-slate-500">{card.label}</div>
                    {card.trend && <div className="text-xs text-emerald-600 font-medium mt-1">{card.trend}</div>}
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-sm">
                {[
                  { name: "Sophie M.", stars: 5, text: "Service exceptionnel, je recommande !", status: "Répondu ✓", color: "emerald" },
                  { name: "Thomas R.", stars: 2, text: "Attente trop longue et nourriture froide...", status: "IA prêt", color: "amber" },
                  { name: "Marie L.", stars: 4, text: "Très bonne adresse, personnel accueillant.", status: "Répondu ✓", color: "emerald" },
                ].map((review) => (
                  <div key={review.name} className="p-4 flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {review.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-slate-900">{review.name}</span>
                        <span className="text-xs text-amber-400">{"★".repeat(review.stars)}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{review.text}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      review.color === "emerald" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}>{review.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="info" className="mb-4">Fonctionnalités</Badge>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Tout ce dont vous avez besoin</h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              Un outil complet pour gérer votre réputation, sans aucune compétence technique.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: <Zap className="w-6 h-6" />, title: "Réponses IA instantanées", description: "Claude AI génère des réponses naturelles et personnalisées en quelques secondes. Choisissez le ton qui correspond à votre image." },
              { icon: <MessageSquare className="w-6 h-6" />, title: "Auto-réponse intelligente", description: "Activez le pilote automatique pour les avis positifs. Vous gardez le contrôle sur les avis négatifs." },
              { icon: <Bell className="w-6 h-6" />, title: "Alertes temps réel", description: "Recevez immédiatement un email lorsqu'un client laisse un avis négatif. Réagissez vite." },
              { icon: <BarChart3 className="w-6 h-6" />, title: "Dashboard analytique", description: "Suivez l'évolution de votre note, votre taux de réponse et l'impact sur votre visibilité Google." },
              { icon: <TrendingUp className="w-6 h-6" />, title: "Boost SEO local", description: "Les réponses régulières aux avis améliorent votre positionnement dans Google Maps et Google Search." },
              { icon: <Clock className="w-6 h-6" />, title: "Synchronisation automatique", description: "Vos nouveaux avis Google sont synchronisés toutes les 2 heures. Rien ne vous échappe." },
            ].map((feature) => (
              <div key={feature.title} className="group p-6 rounded-2xl border border-slate-200 hover:border-sky-200 hover:shadow-lg hover:shadow-sky-500/5 transition-all duration-300">
                <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">{feature.icon}</div>
                <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 bg-gradient-to-br from-sky-50 to-cyan-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Opérationnel en 3 étapes</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Connectez Google", desc: "Liez votre compte Google Business Profile en un clic." },
              { step: "2", title: "Configurez votre ton", desc: "Choisissez le style de réponse qui correspond à votre établissement." },
              { step: "3", title: "Laissez l'IA travailler", desc: "Reputix répond automatiquement à vos avis, 24h/24." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center text-white text-xl font-bold mx-auto mb-4 shadow-lg shadow-sky-500/25">{item.step}</div>
                <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <Badge variant="info" className="mb-4">Tarification</Badge>
          <h2 className="text-4xl font-bold text-slate-900 mb-4">Simple et transparent</h2>
          <p className="text-lg text-slate-500 mb-12">Un seul abonnement. Toutes les fonctionnalités.</p>
          <div className="relative rounded-3xl border-2 border-sky-500 bg-white shadow-2xl shadow-sky-500/15 p-8 overflow-hidden">
            <div className="absolute top-0 right-0 gradient-bg text-white text-xs font-bold px-4 py-2 rounded-bl-2xl">POPULAIRE</div>
            <div className="mb-6">
              <div className="flex items-end gap-2 justify-center mb-2">
                <span className="text-6xl font-bold text-slate-900">30€</span>
                <span className="text-slate-400 mb-3">/mois</span>
              </div>
              <p className="text-slate-500">Par établissement · Annulation à tout moment</p>
            </div>
            <div className="space-y-3 mb-8 text-left">
              {[
                "Réponses IA illimitées (Claude AI)",
                "Synchronisation Google Maps automatique",
                "Alertes avis négatifs par email",
                "Auto-réponse configurable",
                "Dashboard analytique complet",
                "Historique illimité des avis",
                "Support par email prioritaire",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-sky-500 flex-shrink-0" />
                  <span className="text-sm text-slate-700">{feature}</span>
                </div>
              ))}
            </div>
            <Link href="/register" className="block">
              <Button size="lg" className="w-full gap-2">Commencer maintenant <ArrowRight className="w-4 h-4" /></Button>
            </Link>
            <p className="text-xs text-slate-400 mt-4">14 jours d&apos;essai gratuit · Sans engagement</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6 bg-slate-50">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Questions fréquentes</h2>
          </div>
          <div className="space-y-4">
            {[
              { q: "Est-ce que ça fonctionne pour TripAdvisor ?", a: "Actuellement, Reputix prend en charge Google Maps. TripAdvisor et d'autres plateformes arrivent prochainement." },
              { q: "Les réponses sont-elles vraiment naturelles ?", a: "Oui. Reputix utilise Claude, l'IA d'Anthropic, reconnue pour la qualité de son français. 4 tons disponibles et signature personnalisée." },
              { q: "Puis-je relire les réponses avant publication ?", a: "Absolument. Validation manuelle ou auto-réponse pour les avis positifs — vous gardez toujours le contrôle." },
              { q: "Comment connecter mon compte Google ?", a: "En un clic via OAuth2 sécurisé. Vous pouvez déconnecter à tout moment depuis les paramètres." },
              { q: "Que se passe-t-il si j'annule ?", a: "Accès immédiatement coupé aux fonctionnalités premium. Données conservées 30 jours puis supprimées. Aucun frais caché." },
            ].map((item, i) => (
              <details key={i} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer font-medium text-slate-900 list-none hover:text-sky-600 transition-colors">
                  {item.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <div className="px-6 pb-4 text-sm text-slate-500 leading-relaxed">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="rounded-3xl gradient-bg p-12 shadow-2xl shadow-sky-500/30">
            <h2 className="text-4xl font-bold text-white mb-4">Prêt à automatiser votre réputation ?</h2>
            <p className="text-sky-100 mb-8 text-lg">Rejoignez les établissements qui font confiance à Reputix.</p>
            <Link href="/register">
              <Button size="xl" variant="outline" className="gap-2 border-white/30 text-slate-900 hover:bg-white bg-white">
                Démarrer gratuitement <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center">
              <Star className="w-3.5 h-3.5 text-white fill-white" />
            </div>
            <span className="font-bold text-slate-900">Reputix</span>
          </div>
          <p className="text-sm text-slate-400">© {new Date().getFullYear()} Reputix. Tous droits réservés.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">Confidentialité</Link>
            <Link href="/terms" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">CGU</Link>
            <a href="mailto:franquevilleanthony.pro@gmail.com" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
