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

async function pollJob(jobId: string, maxWait = 25000): Promise<OutscraperReview[]> {
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
      return json?.data?.[0]?.reviews_data ?? []
    }
    if (json?.status === "Error") throw new Error("Outscraper job failed")
  }
  throw new Error("Outscraper job timed out")
}

export async function fetchReviewsOutscraper(
  placeId: string,
  limit = 20
): Promise<OutscraperReview[]> {
  const params = new URLSearchParams({
    query: placeId,
    reviewsLimit: String(limit),
    language: "fr",
    sort: "newest",
    async: "false",
  })

  const res = await fetch(`${BASE_URL}/google-maps-reviews?${params}`, {
    headers: { "X-API-KEY": OUTSCRAPER_API_KEY },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Outscraper error ${res.status}: ${text}`)
  }

  const json = await res.json()
  console.log("[Outscraper] status:", json?.status, "id:", json?.id, "data len:", json?.data?.length)

  // Sync response with data
  if (json?.data?.[0]?.reviews_data?.length > 0) {
    return json.data[0].reviews_data
  }

  // Async job — poll for result
  if (json?.id && json?.data?.length === 0) {
    return await pollJob(json.id)
  }

  return []
}
