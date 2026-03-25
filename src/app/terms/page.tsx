export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Conditions d&apos;utilisation</h1>
      <p className="text-slate-500 mb-10">Dernière mise à jour : 25 mars 2026</p>

      <div className="prose prose-slate max-w-none space-y-8 text-slate-700">
        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Acceptation des conditions</h2>
          <p>En utilisant Reputix, vous acceptez les présentes conditions d&apos;utilisation. Si vous n&apos;acceptez pas ces conditions, vous ne devez pas utiliser le service.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Description du service</h2>
          <p>Reputix est un service SaaS permettant aux professionnels de gérer leurs avis en ligne (Google Maps, etc.) grâce à l&apos;intelligence artificielle. Le service génère des réponses automatiques aux avis clients et permet leur publication via l&apos;API Google Business Profile.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Abonnement et paiement</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>L&apos;abonnement est de 30€ HT par mois et par établissement</li>
            <li>Un essai gratuit de 14 jours est offert sans engagement</li>
            <li>Le paiement est géré par Stripe. Aucune donnée bancaire n&apos;est stockée par Reputix</li>
            <li>L&apos;abonnement est résiliable à tout moment depuis votre espace facturation</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Utilisation du compte Google</h2>
          <p>En connectant votre compte Google Business Profile, vous autorisez Reputix à lire vos avis et à publier des réponses en votre nom. Vous pouvez révoquer cet accès à tout moment depuis les paramètres de l&apos;application ou depuis votre compte Google.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Responsabilité</h2>
          <p>Reputix génère des réponses par IA à titre indicatif. L&apos;utilisateur reste responsable des réponses publiées en son nom. Reputix ne saurait être tenu responsable du contenu des réponses approuvées et publiées par l&apos;utilisateur.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Propriété intellectuelle</h2>
          <p>Le service Reputix et son contenu sont protégés par les lois sur la propriété intellectuelle. Toute reproduction ou utilisation non autorisée est interdite.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Résiliation</h2>
          <p>Reputix se réserve le droit de suspendre ou résilier un compte en cas de violation des présentes conditions ou d&apos;utilisation abusive du service.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Droit applicable</h2>
          <p>Les présentes conditions sont soumises au droit français. Tout litige sera soumis aux tribunaux compétents de Paris.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">9. Contact</h2>
          <p><a href="mailto:franquevilleanthony.pro@gmail.com" className="text-sky-600 underline">franquevilleanthony.pro@gmail.com</a></p>
        </section>
      </div>
    </div>
  )
}
