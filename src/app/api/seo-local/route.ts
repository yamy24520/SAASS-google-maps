import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPlaceDetails } from "@/lib/google-places"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const business = await prisma.business.findFirst({
    where: { userId: session.user.id },
    include: {
      _count: { select: { reviews: true } },
      reviews: {
        where: { status: "PUBLISHED" },
        select: { id: true },
      },
    },
  })

  if (!business) return NextResponse.json({ error: "Aucun établissement" }, { status: 404 })

  // Fetch live place details if placeId exists
  let placeDetails = null
  if (business.gbpLocationId) {
    try {
      placeDetails = await getPlaceDetails(business.gbpLocationId)
    } catch {
      // silently fail
    }
  }

  const totalReviews = business._count.reviews
  const publishedReplies = business.reviews.length
  const responseRate = totalReviews > 0 ? Math.round((publishedReplies / totalReviews) * 100) : 0

  // Build SEO checklist
  const checklist = [
    {
      id: "place_linked",
      label: "Établissement lié à Google Maps",
      done: !!business.gbpLocationId,
      impact: "high",
      tip: "Liez votre fiche Google Maps pour activer toutes les fonctionnalités.",
    },
    {
      id: "response_rate",
      label: "Taux de réponse > 80%",
      done: responseRate >= 80,
      impact: "high",
      tip: "Répondre à plus de 80% des avis améliore significativement votre référencement local.",
    },
    {
      id: "rating",
      label: "Note moyenne ≥ 4.0",
      done: business.averageRating >= 4.0,
      impact: "high",
      tip: "Une note ≥ 4.0 est le seuil critique pour apparaître dans le Google Local Pack.",
    },
    {
      id: "reviews_count",
      label: "Plus de 50 avis",
      done: business.totalReviews >= 50,
      impact: "medium",
      tip: "Les établissements avec 50+ avis sont favorisés dans les résultats locaux.",
    },
    {
      id: "website",
      label: "Site web renseigné",
      done: !!placeDetails?.website,
      impact: "medium",
      tip: "Un site web valide dans votre fiche Google renforce votre crédibilité.",
    },
    {
      id: "phone",
      label: "Numéro de téléphone renseigné",
      done: !!placeDetails?.phone,
      impact: "medium",
      tip: "Le numéro de téléphone augmente le taux de conversion des profils Google.",
    },
    {
      id: "hours",
      label: "Horaires renseignés",
      done: (placeDetails?.openingHours?.length ?? 0) > 0,
      impact: "medium",
      tip: "Les horaires d'ouverture sont essentiels pour les recherches 'ouvert maintenant'.",
    },
    {
      id: "photos",
      label: "Photos présentes (5+)",
      done: (placeDetails?.photos?.length ?? 0) >= 5,
      impact: "medium",
      tip: "Les fiches avec 5+ photos reçoivent 42% de demandes d'itinéraire en plus.",
    },
    {
      id: "auto_reply",
      label: "Auto-réponse activée",
      done: business.autoReplyEnabled,
      impact: "low",
      tip: "L'auto-réponse garantit un temps de réponse rapide, facteur de classement.",
    },
    {
      id: "negative_alerts",
      label: "Alertes avis négatifs activées",
      done: business.alertEmailEnabled,
      impact: "low",
      tip: "Répondre rapidement aux avis négatifs limite leur impact sur votre réputation.",
    },
  ]

  const score = Math.round(
    (checklist.filter((c) => c.done).length / checklist.length) * 100
  )

  return NextResponse.json({
    score,
    responseRate,
    checklist,
    placeDetails: placeDetails
      ? {
          name: placeDetails.name,
          rating: placeDetails.rating,
          reviewCount: placeDetails.reviewCount,
          website: placeDetails.website,
          phone: placeDetails.phone,
          photos: placeDetails.photos?.slice(0, 3),
        }
      : null,
  })
}
