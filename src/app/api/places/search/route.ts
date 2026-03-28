import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { searchPlace } from "@/lib/google-places"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const q = req.nextUrl.searchParams.get("q")
  if (!q) return NextResponse.json({ results: [] })

  try {
    const results = await searchPlace(q)
    return NextResponse.json({ results })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
