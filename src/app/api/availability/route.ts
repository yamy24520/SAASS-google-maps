import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

function toTime(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`
}

interface BookingSettings {
  bufferMinutes: number
  minNoticeHours: number
  maxDaysAhead: number
  breakStart?: string
  breakEnd?: string
  breakEnabled?: boolean
  slotInterval?: number  // minutes: 15, 30, 60 — overrides the step
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const businessId = url.searchParams.get("businessId")
  const serviceId  = url.searchParams.get("serviceId")
  const staffId    = url.searchParams.get("staffId") ?? undefined
  const date       = url.searchParams.get("date") // "2026-03-28"

  if (!businessId || !date) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 })
  }

  const [business, service] = await Promise.all([
    prisma.business.findUnique({
      where: { id: businessId },
      select: { bookingHours: true, bookingSettings: true, bookingType: true, bookingMaxCovers: true },
    }),
    serviceId
      ? prisma.service.findFirst({ where: { id: serviceId, businessId, active: true }, select: { duration: true } })
      : null,
  ])

  if (!business) return NextResponse.json({ slots: [], reason: "not_found" })

  const isRestaurant = business.bookingType === "restaurant"
  // Restaurant: no service needed, duration = 0 (won't block slots)
  const duration = service?.duration ?? (isRestaurant ? 0 : null)
  if (duration === null) return NextResponse.json({ slots: [], reason: "service_not_found" })

  const settings: BookingSettings = {
    bufferMinutes: 0,
    minNoticeHours: 0,
    maxDaysAhead: 60,
    ...((business.bookingSettings as object) ?? {}),
  }

  // Vérifier la fenêtre de réservation
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const requestedDate = new Date(date + "T00:00:00")
  const daysAhead = Math.round((requestedDate.getTime() - today.getTime()) / 86400000)

  if (daysAhead < 0) return NextResponse.json({ slots: [], reason: "past" })
  if (daysAhead > settings.maxDaysAhead) return NextResponse.json({ slots: [], reason: "too_far" })

  // Vérifier les horaires du jour
  const dayIndex = new Date(date + "T12:00:00").getDay()
  const dayKey = DAY_KEYS[dayIndex]
  const hours = business.bookingHours as Record<string, { open: string; close: string; closed: boolean }> | null
  const dayHours = hours?.[dayKey]

  if (!dayHours || dayHours.closed) return NextResponse.json({ slots: [], reason: "closed" })

  const buffer   = settings.bufferMinutes
  // step = slotInterval si configuré, sinon duration + buffer (ancien comportement)
  const step     = settings.slotInterval ?? (duration + buffer)

  const openMin  = toMin(dayHours.open)
  const closeMin = toMin(dayHours.close)
  const breakS   = (settings.breakEnabled && settings.breakStart) ? toMin(settings.breakStart) : null
  const breakE   = (settings.breakEnabled && settings.breakEnd)   ? toMin(settings.breakEnd)   : null

  // Générer tous les créneaux théoriques
  const allSlots: string[] = []
  let cur = openMin
  while (cur + (isRestaurant ? step : duration) <= closeMin) {
    if (breakS !== null && breakE !== null && cur < breakE && cur + (isRestaurant ? step : duration) > breakS) {
      cur = breakE
      continue
    }
    allSlots.push(toTime(cur))
    cur += step
  }

  // Récupérer les réservations existantes ce jour
  const existingBookings = await prisma.booking.findMany({
    where: {
      businessId,
      date,
      status: { not: "CANCELLED" },
      ...(staffId ? { staffId } : {}),
    },
    include: { service: { select: { duration: true } } },
  })

  // Préavis minimum
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
  const isToday = daysAhead === 0

  // Pour restaurant : capacité (covers)
  const maxCovers = business.bookingMaxCovers ?? null

  const available = allSlots.filter(slot => {
    const slotMin = toMin(slot)

    if (isToday) {
      const minNoticeMin = settings.minNoticeHours * 60
      if (slotMin < nowMin + minNoticeMin) return false
    }

    if (isRestaurant && maxCovers !== null) {
      // Compter le nombre de couverts déjà pris sur ce créneau
      const coversAtSlot = existingBookings
        .filter(b => b.timeSlot === slot)
        .reduce((sum, b) => sum + (b.partySize ?? 1), 0)
      return coversAtSlot < maxCovers
    }

    // Vérifier les conflits (durée + buffer)
    for (const b of existingBookings) {
      const bStart = toMin(b.timeSlot)
      const bDur   = b.service?.duration ?? 0
      const bEnd   = bStart + bDur + buffer
      const sEnd   = slotMin + duration + buffer
      if (slotMin < bEnd && sEnd > bStart) return false
    }

    return true
  })

  return NextResponse.json({ slots: available })
}
