import { prisma } from "./prisma"
import type { Business } from "@prisma/client"

function googleFetch(input: string, init?: RequestInit) {
  return fetch(input, { ...init, signal: AbortSignal.timeout(10000) })
}

const GBP_BASE = "https://mybusinessaccountmanagement.googleapis.com/v1"
const REVIEWS_BASE = "https://mybusiness.googleapis.com/v4"

export function getGBPAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/google/callback`,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/business.manage",
    access_type: "offline",
    prompt: "consent",
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string
  refresh_token?: string
  expires_in: number
}> {
  const res = await googleFetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/google/callback`,
      grant_type: "authorization_code",
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token exchange failed: ${err}`)
  }
  return res.json()
}

export async function refreshTokenIfNeeded(
  business: Business
): Promise<string> {
  const now = new Date()
  const expiresAt = business.gbpTokenExpiresAt

  if (business.gbpAccessToken && expiresAt && expiresAt > new Date(now.getTime() + 5 * 60 * 1000)) {
    return business.gbpAccessToken!
  }

  if (!business.gbpRefreshToken) throw new Error("Reconnectez votre compte Google dans les paramètres.")
  const res = await googleFetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: business.gbpRefreshToken!,
      grant_type: "refresh_token",
    }),
  })

  if (!res.ok) throw new Error("Token refresh failed")

  const data = await res.json()

  await prisma.business.update({
    where: { id: business.id },
    data: {
      gbpAccessToken: data.access_token,
      gbpTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  })

  business.gbpAccessToken = data.access_token
  business.gbpTokenExpiresAt = new Date(Date.now() + data.expires_in * 1000)
  return data.access_token
}

export async function listAccounts(accessToken: string): Promise<GBPAccount[]> {
  const result: GBPAccount[] = []
  let pageToken = ""
  const seen = new Set<string>()
  do {
    const params = new URLSearchParams({ pageSize: "20" })
    if (pageToken) params.set("pageToken", pageToken)
    const res = await googleFetch(`${GBP_BASE}/accounts?${params}`, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!res.ok) throw new Error("Impossible de lire les comptes Google.")
    const data = await res.json()
    result.push(...(data.accounts ?? []))
    pageToken = data.nextPageToken ?? ""
    if (pageToken && seen.has(pageToken)) throw new Error("Pagination Google invalide")
    seen.add(pageToken)
  } while (pageToken)
  return result
}

export async function listLocations(accountId: string, accessToken: string): Promise<GBPLocation[]> {
  const result: GBPLocation[] = []
  let pageToken = ""
  const seen = new Set<string>()
  do {
    const params = new URLSearchParams({ readMask: "name,title,storefrontAddress", pageSize: "100" })
    if (pageToken) params.set("pageToken", pageToken)
    const res = await googleFetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations?${params}`, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!res.ok) throw new Error("Impossible de lire les établissements Google.")
    const data = await res.json()
    result.push(...(data.locations ?? []))
    pageToken = data.nextPageToken ?? ""
    if (pageToken && seen.has(pageToken)) throw new Error("Pagination Google invalide")
    seen.add(pageToken)
  } while (pageToken)
  return result
}

export async function listReviews(
  business: Business,
  pageToken?: string
): Promise<{ reviews: GBPReview[]; nextPageToken?: string }> {
  const accessToken = await refreshTokenIfNeeded(business)
  const locationId = business.gbpReviewLocationId
  if (!locationId || !/^accounts\/[^/]+\/locations\/[^/]+$/.test(locationId)) throw new Error("Sélectionnez un établissement Google dans les paramètres.")

  const params = new URLSearchParams({ pageSize: "50", orderBy: "updateTime desc" })
  if (pageToken) params.set("pageToken", pageToken)

  const res = await googleFetch(
    `${REVIEWS_BASE}/${locationId}/reviews?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to list reviews: ${err}`)
  }

  const data = await res.json()
  return {
    reviews: data.reviews ?? [],
    nextPageToken: data.nextPageToken,
  }
}

export async function replyToReview(
  business: Business,
  reviewName: string,
  comment: string
): Promise<void> {
  reviewName = reviewName.replace(`${business.id}:GOOGLE:`, "").replace(/^GOOGLE:/, "")
  // Imported scraper IDs cannot safely be converted to GBP review IDs.
  if (!business.gbpReviewLocationId || !reviewName.startsWith(`${business.gbpReviewLocationId}/reviews/`) || !/^accounts\/[^/]+\/locations\/[^/]+\/reviews\/[^/]+$/.test(reviewName)) {
    throw new Error("Cet avis doit être publié directement sur sa plateforme.")
  }
  const accessToken = await refreshTokenIfNeeded(business)

  const res = await googleFetch(`${REVIEWS_BASE}/${reviewName}/reply`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ comment }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to reply to review: ${err}`)
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GBPAccount {
  name: string
  accountName: string
  type: string
}

export interface GBPLocation {
  name: string
  title: string
  storefrontAddress?: { locality?: string }
}

export interface GBPReview {
  name: string
  reviewId?: string
  reviewer: { displayName: string; profilePhotoUrl?: string }
  starRating: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE"
  comment?: string
  createTime: string
  reviewReply?: { comment: string; updateTime: string }
}

export function starRatingToNumber(
  star: GBPReview["starRating"]
): number {
  const map = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }
  return map[star]
}
