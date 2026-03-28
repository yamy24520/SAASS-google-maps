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
  bufferMinutes: number   // temps tampon entre RDV
  minNoticeHours: number  // délai minimum avant réservation (ex: 2h)
  maxDaysAhead: number    // fenêtre de réservation max (ex: 60 jours)
  breakStart?: string     // "12:00"
  breakEnd?: string       // "13:30"
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const businessId = url.searchParams.get("businessId")
  const serviceId  = url.searchParams.get("serviceId")
  const date       = url.searchParams.get("date") // "2026-03-28"

  if (!businessId || !serviceId || !date) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 })
  }

  const [business, service] = await Promise.all([
    prisma.business.findUnique({
      where: { id: businessId },
      select: { bookingHours: true, bookingSettings: true },
    }),
    prisma.service.findFirst({
      where: { id: serviceId, businessId, active: true },
      select: { duration: true },
    }),
  ])

  if (!business || !service) return NextResponse.json({ slots: [], reason: "not_found" })

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

  const duration = service.duration
  const buffer   = settings.bufferMinutes
  const step     = duration + buffer

  // Générer tous les créneaux théoriques
  const openMin  = toMin(dayHours.open)
  const closeMin = toMin(dayHours.close)
  const breakS   = settings.breakStart ? toMin(settings.breakStart) : null
  const breakE   = settings.breakEnd   ? toMin(settings.breakEnd)   : null

  const allSlots: string[] = []
  let cur = openMin
  while (cur + duration <= closeMin) {
    // Sauter la pause si le créneau chevauche
    if (breakS !== null && breakE !== null && cur < breakE && cur + duration > breakS) {
      cur = breakE
      continue
    }
    allSlots.push(toTime(cur))
    cur += step
  }

  // Récupérer les réservations existantes ce jour avec leur durée
  const existingBookings = await prisma.booking.findMany({
    where: { businessId, date, status: { not: "CANCELLED" } },
    include: { service: { select: { duration: true } } },
  })

  // Calculer la limite de préavis minimum
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
  const isToday = daysAhead === 0

  const available = allSlots.filter(slot => {
    const slotMin = toMin(slot)

    // Préavis minimum : si aujourd'hui, vérifier l'heure actuelle + minNotice
    if (isToday) {
      const minNoticeMin = settings.minNoticeHours * 60
      if (slotMin < nowMin + minNoticeMin) return false
    }

    // Vérifier les conflits avec réservations existantes (en tenant compte du buffer)
    for (const b of existingBookings) {
      const bStart = toMin(b.timeSlot)
      const bEnd   = bStart + b.service.duration + buffer
      const sEnd   = slotMin + duration + buffer
      // Conflit si les plages (avec buffer) se chevauchent
      if (slotMin < bEnd && sEnd > bStart) return false
    }

    return true
  })

  return NextResponse.json({ slots: available })
}
