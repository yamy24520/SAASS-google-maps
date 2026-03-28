const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY!
const BASE = "https://places.googleapis.com/v1"

export interface PlaceResult {
  placeId: string
  name: string
  rating: number
  reviewCount: number
  address: string
  category: string
  photoUrl?: string
  lat?: number
  lng?: number
}

export interface PlaceDetails extends PlaceResult {
  website?: string
  phone?: string
  openingHours?: string[]
  photos?: string[]
  primaryType?: string
}

// Search a business by name + city to get its Place ID
export async function searchPlace(query: string): Promise<PlaceResult[]> {
  const res = await fetch(`${BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": PLACES_API_KEY,
      "X-Goog-FieldMask": "places.id,places.displayName,places.rating,places.userRatingCount,places.formattedAddress,places.primaryTypeDisplayName,places.photos,places.location",
    },
    body: JSON.stringify({ textQuery: query, languageCode: "fr" }),
  })

  if (!res.ok) throw new Error(`Places search failed: ${await res.text()}`)
  const data = await res.json()

  return (data.places ?? []).slice(0, 5).map((p: any) => ({
    placeId: p.id,
    name: p.displayName?.text ?? "",
    rating: p.rating ?? 0,
    reviewCount: p.userRatingCount ?? 0,
    address: p.formattedAddress ?? "",
    category: p.primaryTypeDisplayName?.text ?? "",
    photoUrl: p.photos?.[0]?.name ? getPhotoUrl(p.photos[0].name) : undefined,
    lat: p.location?.latitude,
    lng: p.location?.longitude,
  }))
}

// Get full details for a Place ID
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const res = await fetch(`${BASE}/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": PLACES_API_KEY,
      "X-Goog-FieldMask": "id,displayName,rating,userRatingCount,formattedAddress,primaryType,primaryTypeDisplayName,websiteUri,nationalPhoneNumber,regularOpeningHours,photos,location",
      "Accept-Language": "fr",
    },
  })

  if (!res.ok) throw new Error(`Place details failed: ${await res.text()}`)
  const p = await res.json()

  return {
    placeId: p.id,
    name: p.displayName?.text ?? "",
    rating: p.rating ?? 0,
    reviewCount: p.userRatingCount ?? 0,
    address: p.formattedAddress ?? "",
    category: p.primaryTypeDisplayName?.text ?? "",
    primaryType: p.primaryType,
    website: p.websiteUri,
    phone: p.nationalPhoneNumber,
    openingHours: p.regularOpeningHours?.weekdayDescriptions ?? [],
    photos: (p.photos ?? []).slice(0, 5).map((ph: any) => getPhotoUrl(ph.name)),
    photoUrl: p.photos?.[0]?.name ? getPhotoUrl(p.photos[0].name) : undefined,
    lat: p.location?.latitude,
    lng: p.location?.longitude,
  }
}

export interface PlaceReview {
  authorName: string
  rating: number
  text: string
  publishTime: string
}

// Get public reviews for a Place ID (up to 5 via Places API)
export async function getPlaceReviews(placeId: string): Promise<PlaceReview[]> {
  const res = await fetch(`${BASE}/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": PLACES_API_KEY,
      "X-Goog-FieldMask": "reviews",
      "Accept-Language": "fr",
    },
  })
  if (!res.ok) return []
  const p = await res.json()
  return (p.reviews ?? []).map((r: any) => ({
    authorName: r.authorAttribution?.displayName ?? "Anonyme",
    rating: r.rating ?? 0,
    text: r.text?.text ?? "",
    publishTime: r.publishTime ?? "",
  }))
}

// Find nearby competitors (same category, within radius)
export async function findNearbyCompetitors(
  lat: number,
  lng: number,
  category: string,
  excludePlaceId: string,
  placeType?: string
): Promise<PlaceResult[]> {
  const type = placeType ?? mapCategoryToType(category)
  const res = await fetch(`${BASE}/places:searchNearby`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": PLACES_API_KEY,
      "X-Goog-FieldMask": "places.id,places.displayName,places.rating,places.userRatingCount,places.formattedAddress,places.primaryTypeDisplayName,places.photos",
    },
    body: JSON.stringify({
      includedTypes: [type],
      maxResultCount: 10,
      locationRestriction: {
        circle: { center: { latitude: lat, longitude: lng }, radius: 1000 },
      },
      languageCode: "fr",
    }),
  })

  if (!res.ok) throw new Error(`Nearby search failed: ${await res.text()}`)
  const data = await res.json()

  return (data.places ?? [])
    .filter((p: any) => p.id !== excludePlaceId)
    .slice(0, 5)
    .map((p: any) => ({
      placeId: p.id,
      name: p.displayName?.text ?? "",
      rating: p.rating ?? 0,
      reviewCount: p.userRatingCount ?? 0,
      address: p.formattedAddress ?? "",
      category: p.primaryTypeDisplayName?.text ?? "",
      photoUrl: p.photos?.[0]?.name ? getPhotoUrl(p.photos[0].name) : undefined,
    }))
}

function getPhotoUrl(photoName: string): string {
  return `${BASE}/${photoName}/media?key=${PLACES_API_KEY}&maxHeightPx=400&maxWidthPx=400`
}

function mapCategoryToType(category: string): string {
  const map: Record<string, string> = {
    RESTAURANT: "restaurant",
    HOTEL: "lodging",
    BAR: "bar",
    CAFE: "cafe",
    SPA: "spa",
    RETAIL: "store",
    SERVICE: "point_of_interest",
    OTHER: "point_of_interest",
  }
  return map[category] ?? "restaurant"
}
