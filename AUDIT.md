# Audit UX/Code — Reputix
> À traiter demain

---

## P0 — Bugs bloquants

- **Dashboard** `DashboardClient.tsx:50` — fetch `/api/dashboard` n'envoie pas `?biz=` → stats toujours sur le 1er établissement peu importe lequel est sélectionné
- **Bookings** ligne 128 — Si le PATCH status échoue côté serveur, le state local est modifié quand même → UI désynchronisée de la DB

---

## P1 — Bugs gênants

- **Reviews `[reviewId]`** — Si l'avis n'existe pas (404), page reste en loader infini, jamais de message d'erreur
- **Avis "Ignorer"** — Aucune confirmation avant d'ignorer un avis → accident possible
- **Settings logo** — Logo stocké en base64 sans limite de taille → image trop lourde peut faire planter le PUT `/api/settings`
- **Bookings modal création** — Pas de champ staff → RDV créés sans assignation
- **Agenda** — RDVs sur le même créneau se chevauchent visuellement sans gestion d'overlap

---

## P2 — UX à améliorer

- **Sidebar** — Pas de badge sur "Avis" pour indiquer le nombre d'avis en attente de réponse
- **Dashboard** — Les 5 avis récents ne sont pas cliquables (pas de lien direct vers le détail)
- **Clients** — Tout est chargé en mémoire depuis les bookings sans pagination → problème à partir de quelques centaines de clients
- **Insights** — Aucun debounce sur le bouton "Analyser" → peut spammer l'API Claude et coûter cher
- **Concurrents** — État vide n'explique pas que c'est parce que la fiche Google n'est pas liée
- **Bookings** — Pas de statut "No-show" (client ne s'est pas présenté)
- **Agenda** — Pas de création rapide de RDV depuis le calendrier (faut aller sur /bookings)
- **Reviews** — Pas de bouton CTA vers le dashboard dans l'état vide
- **Services** — Pas de preview des créneaux générés avec les paramètres actuels avant d'activer

---

## Features manquantes (backlog)

- SMS/email de confirmation automatique au client après réservation (Twilio déjà en place)
- Rappel automatique 24h avant le RDV
- Réponses en masse aux avis similaires
- Templates de réponses aux avis
- Export clients CSV
- Drag-drop pour reschedule dans l'agenda
- Segmentation clients (VIP, churn risk...)
