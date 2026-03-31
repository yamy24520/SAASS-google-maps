const OUTSCRAPER_API_KEY = process.env.OUTSCRAPER_API_KEY!
const BASE_URL = "https://api.app.outscraper.com"

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

export async function fetchReviewsOutscraper(
  placeId: string,
  limit = 100
): Promise<OutscraperReview[]> {
  const params = new URLSearchParams({
    query: `place_id:${placeId}`,
    reviewsLimit: String(limit),
    language: "fr",
    sort: "newest",
    async: "false",
  })

  const res = await fetch(`${BASE_URL}/maps/reviews-v3?${params}`, {
    headers: { "X-API-KEY": OUTSCRAPER_API_KEY },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Outscraper error ${res.status}: ${text}`)
  }

  const json = await res.json()
  console.log("[Outscraper] status:", json?.status, "id:", json?.id)
  console.log("[Outscraper] data length:", json?.data?.length)
  console.log("[Outscraper] data[0]:", JSON.stringify(json?.data?.[0]).slice(0, 500))
  // Outscraper returns { data: [ { reviews_data: [...] } ] }
  const reviews: OutscraperReview[] = json?.data?.[0]?.reviews_data ?? []
  return reviews
}
