import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { listAccounts, listLocations, refreshTokenIfNeeded } from "@/lib/google-business"

async function ownedBusiness(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const id = req.nextUrl.searchParams.get("biz")
  return prisma.business.findFirst({ where: { userId: session.user.id, ...(id ? { id } : {}) } })
}

async function availableLocations(business: NonNullable<Awaited<ReturnType<typeof ownedBusiness>>>) {
  const token = await refreshTokenIfNeeded(business)
  const accounts = await listAccounts(token)
  const locations = []
  for (const account of accounts) {
    for (const location of await listLocations(account.name, token)) {
      locations.push({ id: `${account.name}/${location.name}`, title: location.title, city: location.storefrontAddress?.locality ?? "" })
    }
  }
  return locations
}

export async function GET(req: NextRequest) {
  const business = await ownedBusiness(req)
  if (!business) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 })
  try {
    return NextResponse.json({ locations: await availableLocations(business), selected: business.gbpReviewLocationId })
  } catch {
    return NextResponse.json({ error: "Impossible de lire vos établissements Google. Vérifiez l’approbation de l’API Business Profile et reconnectez Google." }, { status: 502 })
  }
}

export async function POST(req: NextRequest) {
  const business = await ownedBusiness(req)
  if (!business) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 })
  const body = await req.json().catch(() => null)
  if (typeof body?.locationId !== "string") return NextResponse.json({ error: "Sélection invalide" }, { status: 400 })
  try {
    const location = (await availableLocations(business)).find(item => item.id === body.locationId)
    if (!location) return NextResponse.json({ error: "Cet établissement n’est pas accessible avec votre compte Google." }, { status: 403 })
    await prisma.business.update({ where: { id: business.id }, data: { gbpReviewLocationId: location.id, gbpAccountId: location.id.split("/locations/")[0], gbpLocationName: location.title, reviewSyncCursor: null, syncAttemptAt: null } })
    return NextResponse.json({ success: true, selected: location.id })
  } catch {
    return NextResponse.json({ error: "La sélection Google a échoué. Réessayez." }, { status: 502 })
  }
}
