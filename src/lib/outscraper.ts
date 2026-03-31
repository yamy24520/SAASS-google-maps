const OUTSCRAPER_API_KEY = process.env.OUTSCRAPER_API_KEY!
const BASE_URL = "https://api.outscraper.cloud"

export interface OutscraperReview {
  review_id: string
  author_title: string
  author_image?: string
  review_rating: number
  review_text?: string
  owner_answer?: string
  owner_answer_timestamp_datetime_utc?: string
  review_datetime_utc: string
  review_likes?: number
}

// Clean URL — strip tracking params, keep only the base path
function cleanUrl(url: string): string {
  try {
    const u = new URL(url)
    // Keep only pathname (no query params, no hash)
    return `${u.origin}${u.pathname}`
  } catch {
    return url
  }
}

// Extract reviews from any Outscraper response shape
function extractReviews(data: unknown[]): OutscraperReview[] {
  if (!Array.isArray(data) || data.length === 0) return []
  const first = data[0] as Record<string, unknown>
  // Google Maps shape: { reviews_data: [...] }
  if (Array.isArray(first?.reviews_data)) return first.reviews_data as OutscraperReview[]
  // Flat array shape: data[0] is already a review object
  if (first?.review_id !== undefined) return data as OutscraperReview[]
  // Nested: { data: [...] }
  if (Array.isArray(first?.data)) return first.data as OutscraperReview[]
  return []
}

async function pollJob(jobId: string, maxWait = 20000): Promise<OutscraperReview[]> {
  const start = Date.now()
  while (Date.now() - start < maxWait) {
    await new Promise(r => setTimeout(r, 2000))
    const res = await fetch(`${BASE_URL}/requests/${jobId}`, {
      headers: { "X-API-KEY": OUTSCRAPER_API_KEY },
    })
    if (!res.ok) continue
    const json = await res.json()
    console.log("[Outscraper] poll status:", json?.status, "data len:", json?.data?.length)
    if (json?.status === "Success" || json?.status === "Completed") {
      return extractReviews(json?.data ?? [])
    }
    if (json?.status === "Error") throw new Error("Outscraper job failed")
  }
  throw new Error("Outscraper job timed out")
}

async function fetchFromEndpoint(endpoint: string, params: URLSearchParams): Promise<OutscraperReview[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25000)
  const res = await fetch(`${BASE_URL}/${endpoint}?${params}`, {
    headers: { "X-API-KEY": OUTSCRAPER_API_KEY },
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout))

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Outscraper error ${res.status}: ${text}`)
  }

  const json = await res.json()
  console.log(`[Outscraper][${endpoint}] status:`, json?.status, "id:", json?.id, "data len:", json?.data?.length)

  const reviews = extractReviews(json?.data ?? [])
  if (reviews.length > 0) return reviews

  // Async job — poll for result
  if (json?.id && (!json?.data || json.data.length === 0)) {
    return await pollJob(json.id)
  }

  return []
}

// Google Maps: reviewsLimit=0 means unlimited
export async function fetchReviewsOutscraper(placeId: string, limit = 0): Promise<OutscraperReview[]> {
  const params = new URLSearchParams({
    query: placeId,
    reviewsLimit: String(limit),
    language: "fr",
    sort: "newest",
    async: "false",
  })
  return fetchFromEndpoint("google-maps-reviews", params)
}

// TripAdvisor: param is `limit` not `reviewsLimit`
export async function fetchTripAdvisorReviews(url: string, limit = 0): Promise<OutscraperReview[]> {
  const params = new URLSearchParams({
    query: cleanUrl(url),
    limit: String(limit),
    language: "fr",
    async: "false",
  })
  return fetchFromEndpoint("tripadvisor-reviews", params)
}

// Booking: param is `limit` not `reviewsLimit`
export async function fetchBookingReviews(url: string, limit = 0): Promise<OutscraperReview[]> {
  const params = new URLSearchParams({
    query: cleanUrl(url),
    limit: String(limit),
    async: "false",
  })
  return fetchFromEndpoint("booking-reviews", params)
}

// Trustpilot: param is `limit` not `reviewsLimit`
export async function fetchTrustpilotReviews(url: string, limit = 0): Promise<OutscraperReview[]> {
  const params = new URLSearchParams({
    query: cleanUrl(url),
    limit: String(limit),
    async: "false",
  })
  return fetchFromEndpoint("trustpilot-reviews", params)
}
