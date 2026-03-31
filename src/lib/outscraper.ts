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

// Poll until job is done (Outscraper is async even with async=false for large requests)
async function pollJob(jobId: string, maxWait = 25000): Promise<OutscraperReview[]> {
  const start = Date.now()
  while (Date.now() - start < maxWait) {
    await new Promise(r => setTimeout(r, 2000))
    const res = await fetch(`${BASE_URL}/requests/${jobId}`, {
      headers: { "X-API-KEY": OUTSCRAPER_API_KEY },
    })
    if (!res.ok) continue
    const json = await res.json()
    console.log("[Outscraper] poll status:", json?.status)
    if (json?.status === "Success" || json?.status === "Completed") {
      return json?.data?.[0]?.reviews_data ?? []
    }
    if (json?.status === "Error") throw new Error("Outscraper job failed")
  }
  throw new Error("Outscraper job timed out")
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
  console.log("[Outscraper] status:", json?.status, "id:", json?.id, "data len:", json?.data?.length)

  // If data already present (sync response)
  if (json?.data?.[0]?.reviews_data?.length > 0) {
    return json.data[0].reviews_data
  }

  // If async job — poll for result
  if (json?.id && (json?.status === "Pending" || json?.status === "Running" || json?.data?.length === 0)) {
    return await pollJob(json.id)
  }

  return []
}
