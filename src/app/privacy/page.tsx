export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Politique de confidentialité</h1>
      <p className="text-slate-500 mb-10">Dernière mise à jour : 25 mars 2026</p>

      <div className="prose prose-slate max-w-none space-y-8 text-slate-700">
        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Qui sommes-nous ?</h2>
          <p>Reputix est un service SaaS permettant aux établissements (restaurants, hôtels, commerces) de gérer et répondre automatiquement à leurs avis en ligne. Éditeur : Anthony Franqueville — contact : franquevilleanthony.pro@gmail.com</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Données collectées</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Données de compte :</strong> nom, adresse email, mot de passe (hashé)</li>
            <li><strong>Données Google Business Profile :</strong> nom de l&apos;établissement, avis clients publics, tokens OAuth (accès et rafraîchissement)</li>
            <li><strong>Données de paiement :</strong> gérées exclusivement par Stripe — nous ne stockons aucune donnée bancaire</li>
            <li><strong>Données d&apos;usage :</strong> logs de connexion, actions dans l&apos;application</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Utilisation des données</h2>
          <p>Vos données sont utilisées exclusivement pour :</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Fournir le service de gestion des avis</li>
            <li>Générer des réponses IA via l&apos;API Anthropic (Claude)</li>
            <li>Vous envoyer des alertes par email (avis négatifs)</li>
            <li>Gérer votre abonnement via Stripe</li>
          </ul>
          <p className="mt-3">Nous ne vendons, ne partageons, ni ne louons vos données à des tiers.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Utilisation des données Google</h2>
          <p>Reputix utilise les données accessibles via votre compte Google Business Profile uniquement pour afficher vos avis et publier des réponses en votre nom. L&apos;utilisation des données Google est conforme à la <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-sky-600 underline" target="_blank" rel="noopener noreferrer">politique de données des services API Google</a>, y compris aux exigences d&apos;utilisation limitée.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Conservation des données</h2>
          <p>Vos données sont conservées tant que votre compte est actif. Vous pouvez demander la suppression de votre compte et de toutes vos données à tout moment en nous contactant.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Vos droits (RGPD)</h2>
          <p>Conformément au RGPD, vous disposez des droits d&apos;accès, rectification, effacement, portabilité et opposition. Pour exercer ces droits : franquevilleanthony.pro@gmail.com</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Sécurité</h2>
          <p>Vos données sont hébergées sur des serveurs sécurisés (Vercel, Neon PostgreSQL). Les communications sont chiffrées via HTTPS. Les tokens OAuth sont stockés de manière sécurisée en base de données.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Contact</h2>
          <p>Pour toute question relative à cette politique : <a href="mailto:franquevilleanthony.pro@gmail.com" className="text-sky-600 underline">franquevilleanthony.pro@gmail.com</a></p>
        </section>
      </div>
    </div>
  )
}
