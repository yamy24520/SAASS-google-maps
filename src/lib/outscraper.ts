const OUTSCRAPER_API_KEY = process.env.OUTSCRAPER_API_KEY!
const BASE_URL = "https://api.outscraper.cloud"

// Normalized review shape used across all platforms
export interface OutscraperReview {
  review_id: string
  author_title: string
  author_image?: string
  review_rating: number     // always 1-5
  review_text?: string
  owner_answer?: string
  owner_answer_timestamp_datetime_utc?: string
  review_datetime_utc: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Clean URL — strip tracking params, keep only origin + path
export function cleanUrl(url: string): string {
  try {
    const u = new URL(url)
    return `${u.origin}${u.pathname}`
  } catch {
    return url
  }
}

// Extract reviews from Google Maps response shape: { reviews_data: [...] }
export function extractGoogleReviews(data: unknown[]): OutscraperReview[] {
  if (!Array.isArray(data) || data.length === 0) return []
  const first = data[0] as Record<string, unknown>
  if (Array.isArray(first?.reviews_data)) return first.reviews_data as OutscraperReview[]
  if (first?.review_id !== undefined) return data as OutscraperReview[]
  return []
}

// Booking response: data[0] is object with numeric keys { "0": {...}, "1": {...} }
// rating is on scale 0-10, normalize to 1-5
export function extractBookingReviews(data: unknown[]): OutscraperReview[] {
  if (!Array.isArray(data) || data.length === 0) return []
  const container = data[0] as Record<string, unknown>
  const reviews: OutscraperReview[] = []

  for (const key of Object.keys(container)) {
    if (isNaN(Number(key))) continue
    const r = container[key] as Record<string, unknown>
    if (!r?.review_id) continue

    const text = [r.review_liked_text, r.review_disliked_text]
      .filter(Boolean)
      .join(" | ") || undefined

    // Booking rates on 10, normalize to 1-5
    const rawRating = typeof r.rating === "number" ? r.rating : typeof r.review_score === "number" ? r.review_score : 5
    const rating = Math.min(5, Math.max(1, Math.round((rawRating / 10) * 5)))

    const dateUtc = r.review_timestamp
      ? new Date((r.review_timestamp as number) * 1000).toISOString()
      : String(r.review_date ?? "")

    reviews.push({
      review_id: String(r.review_id),
      author_title: String(r.author_title ?? "Anonyme"),
      review_rating: rating,
      review_text: text,
      owner_answer: r.review_owner_response ? String(r.review_owner_response) : undefined,
      review_datetime_utc: dateUtc,
    })
  }

  return reviews
}

// TripAdvisor response: data[0] is array of review objects
export function extractTripAdvisorReviews(data: unknown[]): OutscraperReview[] {
  if (!Array.isArray(data) || data.length === 0) return []
  const items = Array.isArray(data[0]) ? data[0] : data
  const reviews: OutscraperReview[] = []

  for (const item of items) {
    const r = item as Record<string, unknown>
    if (!r?.review_id && !r?.id) continue

    reviews.push({
      review_id: String(r.review_id ?? r.id),
      author_title: String(r.author_title ?? r.username ?? "Anonyme"),
      review_rating: typeof r.rating === "number" ? Math.min(5, Math.max(1, Math.round(r.rating))) : 3,
      review_text: r.review_text ? String(r.review_text) : undefined,
      owner_answer: r.owner_answer ? String(r.owner_answer) : undefined,
      review_datetime_utc: String(r.review_datetime_utc ?? r.date ?? ""),
    })
  }

  return reviews
}

// ── Polling ───────────────────────────────────────────────────────────────────

async function pollJob(
  jobId: string,
  extractor: (data: unknown[]) => OutscraperReview[],
  maxWait = 20000
): Promise<OutscraperReview[]> {
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
      return extractor(json?.data ?? [])
    }
    if (json?.status === "Error") throw new Error("Outscraper job failed")
  }
  throw new Error("Outscraper job timed out")
}

// ── Generic fetch ─────────────────────────────────────────────────────────────

async function fetchFromEndpoint(
  endpoint: string,
  params: URLSearchParams,
  extractor: (data: unknown[]) => OutscraperReview[]
): Promise<OutscraperReview[]> {
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

  const reviews = extractor(json?.data ?? [])
  if (reviews.length > 0) return reviews

  // Async job — poll for result
  if (json?.id && (!json?.data || json.data.length === 0)) {
    return await pollJob(json.id, extractor)
  }

  return []
}

// ── Public API ────────────────────────────────────────────────────────────────

// Google Maps: reviewsLimit=0 = unlimited
export async function fetchReviewsOutscraper(placeId: string, limit = 0): Promise<OutscraperReview[]> {
  const params = new URLSearchParams({
    query: placeId,
    reviewsLimit: String(limit),
    language: "fr",
    sort: "newest",
    async: "false",
  })
  return fetchFromEndpoint("google-maps-reviews", params, extractGoogleReviews)
}

export async function fetchTripAdvisorReviews(url: string, limit = 0): Promise<OutscraperReview[]> {
  const params = new URLSearchParams({
    query: cleanUrl(url),
    limit: String(limit),
    language: "fr",
    async: "false",
  })
  return fetchFromEndpoint("tripadvisor-reviews", params, extractTripAdvisorReviews)
}

export async function fetchBookingReviews(url: string, limit = 0): Promise<OutscraperReview[]> {
  const params = new URLSearchParams({
    query: cleanUrl(url),
    limit: String(limit),
    async: "false",
  })
  return fetchFromEndpoint("booking-reviews", params, extractBookingReviews)
}

export async function fetchTrustpilotReviews(url: string, limit = 0): Promise<OutscraperReview[]> {
  const params = new URLSearchParams({
    query: cleanUrl(url),
    limit: String(limit),
    async: "false",
  })
  return fetchFromEndpoint("trustpilot-reviews", params, extractTripAdvisorReviews) // similar shape to TA
}
