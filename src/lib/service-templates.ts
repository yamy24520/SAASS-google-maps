// Service templates by industry — no prices, just structure + durations

export interface TemplateService {
  name: string
  description?: string
  category: string
  duration: number // minutes
}

export interface ServiceTemplate {
  id: string
  label: string
  description: string
  services: TemplateService[]
}

export const SERVICE_TEMPLATES: ServiceTemplate[] = [
  // ─── Coiffure Femme ───────────────────────────────────────────────────────
  {
    id: "coiffure_femme",
    label: "Coiffure Femme",
    description: "Coupes, colorations, balayages, coiffages et soins capillaires",
    services: [
      // Coupes & Coiffages
      { name: "Shampooing + Coiffage court", category: "Coupes & Coiffages", duration: 30 },
      { name: "Shampooing + Coiffage mi-long", category: "Coupes & Coiffages", duration: 40 },
      { name: "Shampooing + Coiffage long", category: "Coupes & Coiffages", duration: 45 },
      { name: "Shampooing + Coupe + Coiffage court", category: "Coupes & Coiffages", duration: 45 },
      { name: "Shampooing + Coupe + Coiffage mi-long", category: "Coupes & Coiffages", duration: 50 },
      { name: "Shampooing + Coupe + Coiffage long", category: "Coupes & Coiffages", duration: 60 },
      { name: "Coupe frange", category: "Coupes & Coiffages", duration: 15 },
      // Colorations
      { name: "Coloration racines", category: "Colorations", duration: 60 },
      { name: "Coloration complete", category: "Colorations", duration: 75 },
      { name: "Shampooing + Coloration + Soin + Coiffage", category: "Colorations", duration: 90 },
      { name: "Shampooing + Coloration + Soin + Coupe + Coiffage", category: "Colorations", duration: 105 },
      { name: "Coloration ton sur ton", category: "Colorations", duration: 60 },
      { name: "Coloration + Balayage", category: "Colorations", duration: 120 },
      // Balayages & Meches
      { name: "Balayage", category: "Balayages & Meches", duration: 90 },
      { name: "Shampooing + Balayage + Soin + Coiffage", category: "Balayages & Meches", duration: 105 },
      { name: "Shampooing + Balayage + Soin + Coupe + Coiffage", category: "Balayages & Meches", duration: 120 },
      { name: "Meches completes", category: "Balayages & Meches", duration: 90 },
      { name: "Meches partielles", category: "Balayages & Meches", duration: 60 },
      { name: "Ombre hair", category: "Balayages & Meches", duration: 120 },
      { name: "Babylights", category: "Balayages & Meches", duration: 120 },
      // Soins
      { name: "Soin profond", category: "Soins Capillaires", duration: 30 },
      { name: "Soin keratine", category: "Soins Capillaires", duration: 90 },
      { name: "Soin botox capillaire", category: "Soins Capillaires", duration: 60 },
      { name: "Soin Olaplex", category: "Soins Capillaires", duration: 30 },
      // Coiffures evenementielles
      { name: "Chignon", category: "Coiffures Evenementielles", duration: 60 },
      { name: "Coiffure mariage", category: "Coiffures Evenementielles", duration: 90 },
      { name: "Coiffure mariage + essai", category: "Coiffures Evenementielles", duration: 120 },
      { name: "Coiffure soiree", category: "Coiffures Evenementielles", duration: 60 },
      { name: "Tresses", category: "Coiffures Evenementielles", duration: 45 },
      // Techniques
      { name: "Lissage bresilien", category: "Techniques", duration: 120 },
      { name: "Permanente", category: "Techniques", duration: 120 },
      { name: "Decoloration", category: "Techniques", duration: 90 },
      { name: "Patine / Gloss", category: "Techniques", duration: 45 },
    ],
  },

  // ─── Coiffure Homme / Barber ──────────────────────────────────────────────
  {
    id: "coiffure_homme",
    label: "Coiffure Homme / Barber",
    description: "Coupes homme, barbe, degrade et soins",
    services: [
      { name: "Shampooing + Coupe + Coiffage", category: "Coupes Homme", duration: 30 },
      { name: "Coupe + Barbe", category: "Coupes Homme", duration: 45 },
      { name: "Coupe degrade americain", category: "Coupes Homme", duration: 30 },
      { name: "Coupe taper fade", category: "Coupes Homme", duration: 30 },
      { name: "Coupe buzz cut", category: "Coupes Homme", duration: 20 },
      { name: "Coupe tondeuse", category: "Coupes Homme", duration: 15 },
      { name: "Coupe enfant (-12 ans)", category: "Coupes Homme", duration: 20 },
      { name: "Coupe ado (12-16 ans)", category: "Coupes Homme", duration: 25 },
      // Barbe
      { name: "Taille de barbe", category: "Barbe", duration: 15 },
      { name: "Barbe express", category: "Barbe", duration: 10 },
      { name: "Rasage traditionnel", category: "Barbe", duration: 30 },
      { name: "Contour barbe", category: "Barbe", duration: 15 },
      { name: "Soin barbe + huile", category: "Barbe", duration: 20 },
      // Colorations
      { name: "Coloration homme", category: "Colorations Homme", duration: 30 },
      { name: "Coloration barbe", category: "Colorations Homme", duration: 20 },
      { name: "Meches homme", category: "Colorations Homme", duration: 45 },
      // Soins
      { name: "Soin visage homme", category: "Soins Homme", duration: 30 },
      { name: "Gommage visage", category: "Soins Homme", duration: 20 },
      { name: "Black mask", category: "Soins Homme", duration: 15 },
      { name: "Epilation nez / oreilles", category: "Soins Homme", duration: 10 },
      { name: "Trait sourcils", category: "Soins Homme", duration: 10 },
    ],
  },

  // ─── Estheticienne ────────────────────────────────────────────────────────
  {
    id: "estheticienne",
    label: "Institut de Beaute / Esthetique",
    description: "Epilations, soins visage, soins corps, maquillage, onglerie",
    services: [
      // Epilations
      { name: "1/2 jambes", category: "Epilations", duration: 15 },
      { name: "3/4 jambes", category: "Epilations", duration: 15 },
      { name: "Jambes entieres", category: "Epilations", duration: 30 },
      { name: "Cuisses", category: "Epilations", duration: 15 },
      { name: "Maillot classique", category: "Epilations", duration: 15 },
      { name: "Maillot bresilien", category: "Epilations", duration: 15 },
      { name: "Maillot integral", category: "Epilations", duration: 30 },
      { name: "Aisselles", category: "Epilations", duration: 15 },
      { name: "Bras", category: "Epilations", duration: 15 },
      { name: "1/2 bras", category: "Epilations", duration: 15 },
      { name: "Sourcils", category: "Epilations", duration: 15 },
      { name: "Creation ligne sourcils", category: "Epilations", duration: 15 },
      { name: "Sourcils au fil", category: "Epilations", duration: 30 },
      { name: "Levres", category: "Epilations", duration: 10 },
      { name: "Menton", category: "Epilations", duration: 10 },
      { name: "Levres + menton", category: "Epilations", duration: 15 },
      { name: "Visage (menton, levres, sourcils)", category: "Epilations", duration: 30 },
      { name: "Visage entier", category: "Epilations", duration: 30 },
      { name: "Narines", category: "Epilations", duration: 10 },
      { name: "Fesses", category: "Epilations", duration: 15 },
      // Forfaits Epilations
      { name: "Jambes entieres + maillot classique + aisselles", category: "Forfaits Epilations", duration: 60 },
      { name: "1/2 jambes + maillot classique + aisselles", category: "Forfaits Epilations", duration: 30 },
      { name: "1/2 jambes + maillot bresilien + aisselles", category: "Forfaits Epilations", duration: 45 },
      { name: "1/2 jambes + maillot integral + aisselles", category: "Forfaits Epilations", duration: 60 },
      { name: "Jambes entieres + maillot bresilien + aisselles", category: "Forfaits Epilations", duration: 60 },
      { name: "Jambes entieres + maillot integral + aisselles", category: "Forfaits Epilations", duration: 60 },
      { name: "Levres + sourcils", category: "Forfaits Epilations", duration: 30 },
      // Soins Visage
      { name: "Soin decouverte", description: "Gommage, massage et masque pour un teint lumineux", category: "Soins du Visage", duration: 45 },
      { name: "Soin express visage", description: "Massage et masque hydratant", category: "Soins du Visage", duration: 30 },
      { name: "Soin fondamental", description: "Nettoyage de peau avec vapeur, adapte a tous types de peaux", category: "Soins du Visage", duration: 60 },
      { name: "Soin de saison", description: "Soin oxygenant pour reveler l'eclat de la peau", category: "Soins du Visage", duration: 60 },
      { name: "Soin anti-age", description: "Soin jeunesse pour une peau visiblement plus ferme", category: "Soins du Visage", duration: 75 },
      { name: "Soin hydratation intense", description: "Hydratation profonde a l'acide hyaluronique", category: "Soins du Visage", duration: 75 },
      { name: "Soin apaisant peaux sensibles", description: "Pour les peaux sensibles et sensibilisees", category: "Soins du Visage", duration: 60 },
      { name: "Soin correcteur", description: "Ideal pour les peaux a imperfections", category: "Soins du Visage", duration: 45 },
      { name: "Soin detoxifiant", description: "Anti-pollution, energisant et eclaircissant", category: "Soins du Visage", duration: 75 },
      { name: "Soin contour des yeux", description: "Defroisse, defatigue et lisse les rides", category: "Soins du Visage", duration: 45 },
      { name: "Peeling visage", description: "Exfoliation douce et regeneration", category: "Soins du Visage", duration: 45 },
      { name: "Microneedling", description: "Stimule la production de collagene et d'elastine", category: "Soins du Visage", duration: 60 },
      { name: "LED Therapie visage", description: "Photomodulation pour anti-age, acne, cicatrisation", category: "Soins du Visage", duration: 45 },
      { name: "Massage visage au quartz rose", description: "Drainage et anti-age avec gua sha et roller", category: "Soins du Visage", duration: 60 },
      // Soins Corps
      { name: "Massage relaxant 30min", description: "Massage relaxant, destressant", category: "Soins du Corps", duration: 30 },
      { name: "Massage relaxant 60min", description: "Massage californien du corps complet", category: "Soins du Corps", duration: 60 },
      { name: "Massage du dos + masque chaud", description: "Massage du dos suivi d'un masque chaud relaxant", category: "Soins du Corps", duration: 45 },
      { name: "Massage sur-mesure 60min", description: "Senteur et texture au choix", category: "Soins du Corps", duration: 60 },
      { name: "Gommage du corps", category: "Soins du Corps", duration: 30 },
      { name: "Massage + gommage corps", description: "Massage complet suivi d'un gommage", category: "Soins du Corps", duration: 60 },
      { name: "Massage aux coquillages chauds", description: "Inspiration polynesienne avec coquillages naturels", category: "Soins du Corps", duration: 75 },
      { name: "Enveloppement corps", description: "Masque hydratant et nourrissant corps complet", category: "Soins du Corps", duration: 45 },
      { name: "Massage cranien", category: "Soins du Corps", duration: 15 },
      // Mise en Beaute
      { name: "Teinture cils", category: "Mise en Beaute", duration: 15 },
      { name: "Teinture sourcils", category: "Mise en Beaute", duration: 15 },
      { name: "Rehaussement de cils", description: "Courbure naturelle qui dure 4 a 5 semaines", category: "Mise en Beaute", duration: 60 },
      { name: "Rehaussement de cils + teinture", description: "Courbure + intensite pour un effet mascara", category: "Mise en Beaute", duration: 75 },
      // Maquillage
      { name: "Maquillage jour", category: "Maquillage", duration: 30 },
      { name: "Maquillage soiree", category: "Maquillage", duration: 45 },
      { name: "Maquillage mariee", category: "Maquillage", duration: 45 },
      { name: "Maquillage mariee + essai", category: "Maquillage", duration: 90 },
      // Mains & Pieds
      { name: "Beaute des mains", description: "Limage, cuticules, base", category: "Beaute des Mains & Pieds", duration: 30 },
      { name: "Soin des mains complet", description: "Gommage, modelage, base", category: "Beaute des Mains & Pieds", duration: 60 },
      { name: "Beaute des pieds", description: "Limage, cuticules, base", category: "Beaute des Mains & Pieds", duration: 30 },
      { name: "Soin des pieds complet", description: "Gommage, modelage, base", category: "Beaute des Mains & Pieds", duration: 60 },
      { name: "Soin anti-callosites", description: "Traitement des callosites + soin des ongles", category: "Beaute des Mains & Pieds", duration: 45 },
    ],
  },

  // ─── Onglerie ─────────────────────────────────────────────────────────────
  {
    id: "onglerie",
    label: "Onglerie / Nail Art",
    description: "Poses, remplissages, vernis semi-permanent et nail art",
    services: [
      // Vernis Semi-Permanent
      { name: "Pose vernis semi-permanent mains", category: "Vernis Semi-Permanent", duration: 45 },
      { name: "Pose vernis semi-permanent pieds", category: "Vernis Semi-Permanent", duration: 45 },
      { name: "Depose vernis semi-permanent", category: "Vernis Semi-Permanent", duration: 20 },
      { name: "Depose + repose vernis semi-permanent", category: "Vernis Semi-Permanent", duration: 60 },
      // Gel / Resine
      { name: "Pose complete gel", category: "Pose Gel / Resine", duration: 90 },
      { name: "Pose complete resine", category: "Pose Gel / Resine", duration: 90 },
      { name: "Remplissage gel", category: "Pose Gel / Resine", duration: 60 },
      { name: "Remplissage resine", category: "Pose Gel / Resine", duration: 60 },
      { name: "Depose gel", category: "Pose Gel / Resine", duration: 30 },
      { name: "Pose capsules + gel", category: "Pose Gel / Resine", duration: 90 },
      { name: "Pose french", category: "Pose Gel / Resine", duration: 90 },
      { name: "Reparation ongle casse (unite)", category: "Pose Gel / Resine", duration: 15 },
      // Nail Art
      { name: "Nail art simple (par ongle)", category: "Nail Art", duration: 5 },
      { name: "Nail art complexe (par ongle)", category: "Nail Art", duration: 10 },
      { name: "Nail art complet (10 ongles)", category: "Nail Art", duration: 30 },
      { name: "Strass / paillettes (par ongle)", category: "Nail Art", duration: 5 },
      // Soins
      { name: "Manucure classique", category: "Soins Ongles", duration: 30 },
      { name: "Pedicure classique", category: "Soins Ongles", duration: 30 },
      { name: "Spa mains", description: "Gommage, masque, massage des mains", category: "Soins Ongles", duration: 45 },
      { name: "Spa pieds", description: "Bain, gommage, masque, massage des pieds", category: "Soins Ongles", duration: 60 },
    ],
  },

  // ─── Spa & Bien-etre ──────────────────────────────────────────────────────
  {
    id: "spa",
    label: "Spa & Bien-etre",
    description: "Massages, hammam, soins detente et relaxation",
    services: [
      // Massages
      { name: "Massage relaxant 30min", category: "Massages", duration: 30 },
      { name: "Massage relaxant 60min", category: "Massages", duration: 60 },
      { name: "Massage relaxant 90min", category: "Massages", duration: 90 },
      { name: "Massage sportif", description: "Massage profond pour soulager les tensions musculaires", category: "Massages", duration: 60 },
      { name: "Massage pierres chaudes", description: "Massage aux pierres volcaniques chaudes", category: "Massages", duration: 75 },
      { name: "Massage aux huiles essentielles", category: "Massages", duration: 60 },
      { name: "Massage tete et nuque", category: "Massages", duration: 20 },
      { name: "Massage dos et epaules", category: "Massages", duration: 30 },
      { name: "Massage pieds reflexologie", category: "Massages", duration: 30 },
      { name: "Massage femme enceinte", category: "Massages", duration: 60 },
      { name: "Massage duo", description: "Massage en couple cote a cote", category: "Massages", duration: 60 },
      { name: "Massage ayurvedique", description: "Massage traditionnel indien", category: "Massages", duration: 75 },
      { name: "Massage thai", description: "Etirements et pressions traditionnels", category: "Massages", duration: 60 },
      // Hammam & Sauna
      { name: "Acces hammam 1h", category: "Hammam & Sauna", duration: 60 },
      { name: "Acces sauna 1h", category: "Hammam & Sauna", duration: 60 },
      { name: "Forfait hammam + gommage", category: "Hammam & Sauna", duration: 90 },
      { name: "Forfait hammam + gommage + massage", category: "Hammam & Sauna", duration: 120 },
      { name: "Gommage au savon noir", category: "Hammam & Sauna", duration: 30 },
      // Soins Corps
      { name: "Enveloppement detox", category: "Soins Corps Spa", duration: 60 },
      { name: "Enveloppement hydratant", category: "Soins Corps Spa", duration: 60 },
      { name: "Gommage corps complet", category: "Soins Corps Spa", duration: 30 },
      { name: "Soin minceur", category: "Soins Corps Spa", duration: 60 },
      // Forfaits
      { name: "Forfait decouverte spa", description: "Hammam + gommage + massage 30min", category: "Forfaits Spa", duration: 90 },
      { name: "Forfait journee detente", description: "Hammam + soin visage + massage 60min", category: "Forfaits Spa", duration: 150 },
      { name: "Forfait duo zen", description: "Hammam duo + massage duo 60min", category: "Forfaits Spa", duration: 120 },
    ],
  },
]
