# Roadmap — Parity avec Planity

> Démarré le 2026-03-30. Autonomie totale, pas de breaking changes sur l'existant.

---

## Feature 1 — Fiche client enrichie

**Objectif :** Chaque client a un profil persistant avec notes privées, allergies, préférences et prestataire favori — visible et éditable depuis le dashboard.

### Schema
- [ ] Nouveau model `ClientProfile` (email + businessId = clé composite unique)
  - `notes` Text — notes privées du pro (ex: "préfère pas de gel")
  - `allergies` Text — allergies déclarées
  - `preferences` Text — préférences générales
  - `favoriteStaffId` String? — FK vers Staff
  - `smsOptIn` Boolean default false — opt-in SMS rappels
  - `vip` Boolean default false — flag VIP
  - `tags` Json? — tableau de tags libres ["fidèle", "no-show x2"]

### API
- [ ] `GET /api/clients/[email]` — retourner le profil + historique bookings
- [ ] `PATCH /api/clients/[email]` — mettre à jour notes/allergies/prefs/staff favori/tags/vip

### UI
- [ ] `clients/page.tsx` — panel latéral droit (slide-in) quand on clique un client
  - Onglet "Infos" : email, tél, staff favori, badge VIP, tags
  - Onglet "Notes" : textarea pour notes + allergies
  - Onglet "Historique" : liste RDV avec statuts
  - Bouton save avec optimistic update

---

## Feature 2 — SMS Rappels (Twilio)

**Objectif :** Envoyer un SMS de rappel 24h avant chaque RDV confirmé, si le client a un téléphone et a accepté les SMS.

### Config
- [ ] Variables d'env : `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`
- [ ] `src/lib/sms.ts` — `sendSms(to: string, body: string)` — gracieux si credentials absents

### Schema
- [ ] `Booking.smsSentAt DateTime?` — éviter les doublons d'envoi
- [ ] `ClientProfile.smsOptIn Boolean` — opt-in explicite (RGPD)

### Cron
- [ ] `/api/cron/reminders` — ajouter envoi SMS après envoi email
  - Filtre : RDV demain + clientPhone + smsOptIn via ClientProfile + smsSentAt null
  - Message : "Rappel : votre RDV [service] demain à [heure] chez [business]. Répondre STOP pour se désinscrire."

### Booking form
- [ ] `/book/[slug]` — checkbox "Recevoir un rappel par SMS" (visible si clientPhone renseigné)
- [ ] API POST booking — sauvegarder smsOptIn dans ClientProfile via upsert

---

## Feature 3 — Drag-and-drop Agenda

**Objectif :** Glisser un bloc RDV vers un autre créneau ou un autre prestataire directement dans l'agenda.

### Dépendances
- [ ] Installer `@dnd-kit/core` `@dnd-kit/utilities`

### API
- [ ] `PATCH /api/bookings/[id]` — permettre update de `date`, `timeSlot`, `staffId`
  - Validation : pas de conflit (même logique que POST), check heures ouverture
  - Retour : booking mis à jour ou `{ error: "Conflit détecté" }`

### UI WeekView
- [ ] Envelopper chaque bloc booking dans `<Draggable>`
- [ ] Chaque cellule horaire/colonne = `<Droppable>`
- [ ] Sur drop : calcul nouvelle date+heure à partir de la position, appel PATCH
- [ ] Optimistic update : déplacer visuellement immédiatement, rollback si erreur
- [ ] Indicateur visuel pendant le drag (ombre, opacité)
- [ ] Toast succès/erreur

### UI DayView
- [ ] Même logique entre colonnes staff
- [ ] Drag entre prestataires : update staffId

---

## Feature 4 — Stats par prestataire

**Objectif :** Voir les performances de chaque membre de l'équipe — CA, RDV, taux d'annulation, service le plus demandé.

### API
- [ ] `GET /api/staff/stats?biz=` — pour chaque staff actif :
  - `bookingsTotal`, `bookingsConfirmed`, `bookingsCancelled`
  - `caTotal` (sum service.price des confirmés)
  - `cancellationRate` %
  - `topService` { name, count }
  - `avgRating` (à partir des avis liés si disponible)
  - Période : mois en cours vs mois précédent (comparaison)

### UI `/equipe`
- [ ] Ajouter onglet "Stats" en haut de la page équipe
- [ ] Cards par staff avec : avatar coloré, CA du mois, nb RDV, taux annulation
- [ ] Mini bar chart (CSS pur) pour CA semaine par semaine
- [ ] Badge "Top performer" sur le staff avec le plus de CA
- [ ] Comparaison mois précédent (flèche rouge/verte)

---

## Feature 5 — Portail Client + Rebooking

**Objectif :** Le client reçoit un lien magique dans son email de confirmation. Il peut voir ses RDV, annuler, et rebooker en un clic.

### Schema
- [ ] Nouveau model `ClientSession`
  - `id` String @id
  - `businessId` String
  - `clientEmail` String
  - `token` String @unique
  - `expiresAt` DateTime
  - `createdAt` DateTime
  - Index sur `[token]`, `[clientEmail, businessId]`

### API
- [ ] `POST /api/client-portal/auth` — reçoit `{ email, businessId }`, crée ClientSession (token JWT, expire 30j), envoie email avec lien `/my/[token]`
- [ ] `GET /api/client-portal/me?token=` — vérifie token, retourne :
  - Infos client (nom, email, téléphone)
  - RDV à venir (confirmés + en attente)
  - RDV passés (5 derniers)
  - BusinessInfo (nom, logo, slug booking)
- [ ] `DELETE /api/client-portal/cancel/[bookingId]?token=` — annuler un RDV (vérifie appartenance)

### Page publique `/my/[token]`
- [ ] Design mobile-first, thème neutre (blanc/slate)
- [ ] Header : logo business + nom client
- [ ] Section "Prochains RDV" : cards avec service, date, heure, prestataire, bouton Annuler
- [ ] Section "Historique" : 5 derniers RDV passés
- [ ] Bouton "Reprendre ce RDV" sur chaque RDV passé → redirige vers `/book/[slug]?service=[id]&staff=[id]`
- [ ] État vide élégant si aucun RDV
- [ ] Gestion token expiré / introuvable

### Email confirmation
- [ ] Dans `sendBookingRequestClient()` — ajouter lien "Gérer mes réservations → `/my/[token]`"
- [ ] Générer ClientSession lors de la création du booking (upsert, 30j)

### Rebooking
- [ ] `/book/[slug]?service=[id]&staff=[id]` — pré-sélectionner service et staff via query params
- [ ] Page booking lit ces params et skip l'étape sélection si déjà renseignés

---

## Ordre d'implémentation

1. Schema (tout en une migration)
2. Fiche client enrichie (API + UI)
3. SMS rappels (lib + cron)
4. Stats staff (API + UI)
5. Portail client (schema + API + page)
6. Rebooking (query params booking page)
7. Drag-and-drop agenda (dépendance externe)
8. Commit + push

---

## Notes techniques

- Pas de breaking change sur les bookings existants — tout est optionnel
- ClientProfile créé en upsert silencieux lors de chaque nouvelle réservation
- SMS : si `TWILIO_ACCOUNT_SID` absent → log + skip (pas de crash)
- Drag-and-drop : rollback optimiste si PATCH échoue — UX propre
- Portail client : token JWT signé avec NEXTAUTH_SECRET, pas de nouvelle dépendance auth
