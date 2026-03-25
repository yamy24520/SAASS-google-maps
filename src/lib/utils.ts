import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date))
}

export function formatRating(rating: number): string {
  return rating.toFixed(1)
}

export function getStarLabel(rating: number): string {
  const labels: Record<number, string> = {
    1: "Très mauvais",
    2: "Mauvais",
    3: "Moyen",
    4: "Bien",
    5: "Excellent",
  }
  return labels[rating] ?? ""
}

export function getRatingColor(rating: number): string {
  if (rating >= 4) return "text-emerald-500"
  if (rating >= 3) return "text-amber-500"
  return "text-red-500"
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: "En attente",
    DRAFT: "Brouillon",
    APPROVED: "Approuvé",
    PUBLISHED: "Publié",
    IGNORED: "Ignoré",
    FAILED: "Échec",
  }
  return labels[status] ?? status
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    RESTAURANT: "Restaurant",
    HOTEL: "Hôtel",
    BAR: "Bar",
    CAFE: "Café",
    SPA: "Spa",
    RETAIL: "Commerce",
    SERVICE: "Service",
    OTHER: "Autre",
  }
  return labels[category] ?? category
}
