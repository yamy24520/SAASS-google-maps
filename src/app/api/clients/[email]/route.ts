import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function getBusiness(userId: string, bizId: string | null) {
  return bizId
    ? prisma.business.findFirst({ where: { id: bizId, userId } })
    : prisma.business.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { email } = await params
  const decodedEmail = decodeURIComponent(email)
  const bizId = new URL(req.url).searchParams.get("biz")
  const business = await getBusiness(session.user.id, bizId)
  if (!business) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  const [profile, bookings, staffList] = await Promise.all([
    prisma.clientProfile.findUnique({
      where: { businessId_email: { businessId: business.id, email: decodedEmail } },
      include: { favoriteStaff: { select: { id: true, name: true, color: true } } },
    }),
    prisma.booking.findMany({
      where: { businessId: business.id, clientEmail: decodedEmail },
      include: {
        service: { select: { name: true, price: true, duration: true } },
        staff: { select: { id: true, name: true, color: true } },
      },
      orderBy: { date: "desc" },
      take: 50,
    }),
    prisma.staff.findMany({
      where: { businessId: business.id, active: true },
      select: { id: true, name: true, color: true },
      orderBy: { createdAt: "asc" },
    }),
  ])

  return NextResponse.json({ profile, bookings, staffList })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { email } = await params
  const decodedEmail = decodeURIComponent(email)
  const bizId = new URL(req.url).searchParams.get("biz")
  const business = await getBusiness(session.user.id, bizId)
  if (!business) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  const { notes, allergies, preferences, tags, vip, smsOptIn, favoriteStaffId } = await req.json()

  // Validate favoriteStaffId belongs to this business
  if (favoriteStaffId) {
    const staff = await prisma.staff.findFirst({ where: { id: favoriteStaffId, businessId: business.id } })
    if (!staff) return NextResponse.json({ error: "Prestataire invalide" }, { status: 400 })
  }

  const profile = await prisma.clientProfile.upsert({
    where: { businessId_email: { businessId: business.id, email: decodedEmail } },
    update: {
      notes: notes ?? undefined,
      allergies: allergies ?? undefined,
      preferences: preferences ?? undefined,
      tags: tags !== undefined ? tags : undefined,
      vip: vip !== undefined ? vip : undefined,
      smsOptIn: smsOptIn !== undefined ? smsOptIn : undefined,
      favoriteStaffId: favoriteStaffId !== undefined ? (favoriteStaffId || null) : undefined,
    },
    create: {
      businessId: business.id,
      email: decodedEmail,
      notes: notes ?? null,
      allergies: allergies ?? null,
      preferences: preferences ?? null,
      tags: tags ?? null,
      vip: vip ?? false,
      smsOptIn: smsOptIn ?? false,
      favoriteStaffId: favoriteStaffId || null,
    },
    include: { favoriteStaff: { select: { id: true, name: true, color: true } } },
  })

  return NextResponse.json({ profile })
}
