import { prisma } from "./prisma"
import type { Business } from "@prisma/client"

const GBP_BASE = "https://mybusinessaccountmanagement.googleapis.com/v1"
const REVIEWS_BASE = "https://mybusiness.googleapis.com/v4"

export function getGBPAuthUrl(businessId: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/google/callback`,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/business.manage",
    access_type: "offline",
    prompt: "consent",
    state: businessId,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
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

async function refreshTokenIfNeeded(
  business: Business
): Promise<string> {
  const now = new Date()
  const expiresAt = business.gbpTokenExpiresAt

  if (expiresAt && expiresAt > new Date(now.getTime() + 5 * 60 * 1000)) {
    return business.gbpAccessToken!
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
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

  return data.access_token
}

export async function listAccounts(accessToken: string): Promise<GBPAccount[]> {
  const res = await fetch(`${GBP_BASE}/accounts`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to list GBP accounts: ${res.status} ${err}`)
  }
  const data = await res.json()
  return data.accounts ?? []
}

export async function listLocations(
  accountId: string,
  accessToken: string
): Promise<GBPLocation[]> {
  const res = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations?readMask=name,title,storefrontAddress`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) throw new Error("Failed to list GBP locations")
  const data = await res.json()
  return data.locations ?? []
}

export async function listReviews(
  business: Business,
  pageToken?: string
): Promise<{ reviews: GBPReview[]; nextPageToken?: string }> {
  const accessToken = await refreshTokenIfNeeded(business)
  const locationId = business.gbpLocationId!

  const params = new URLSearchParams({ pageSize: "50" })
  if (pageToken) params.set("pageToken", pageToken)

  const res = await fetch(
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
  const accessToken = await refreshTokenIfNeeded(business)

  const res = await fetch(`${REVIEWS_BASE}/${reviewName}/reply`, {
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
