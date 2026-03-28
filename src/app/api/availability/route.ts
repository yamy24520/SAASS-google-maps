import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]

function generateSlots(open: string, close: string, duration: number): string[] {
  const slots: string[] = []
  const [oh, om] = open.split(":").map(Number)
  const [ch, cm] = close.split(":").map(Number)
  let cur = oh * 60 + om
  const end = ch * 60 + cm
  while (cur + duration <= end) {
    const h = String(Math.floor(cur / 60)).padStart(2, "0")
    const m = String(cur % 60).padStart(2, "0")
    slots.push(`${h}:${m}`)
    cur += duration
  }
  return slots
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const businessId = url.searchParams.get("businessId")
  const serviceId = url.searchParams.get("serviceId")
  const date = url.searchParams.get("date") // "2026-03-28"

  if (!businessId || !serviceId || !date) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 })
  }

  const [business, service] = await Promise.all([
    prisma.business.findUnique({ where: { id: businessId }, select: { bookingHours: true } }),
    prisma.service.findFirst({ where: { id: serviceId, businessId, active: true }, select: { duration: true } }),
  ])

  if (!business || !service) return NextResponse.json({ slots: [] })

  // Determine day of week
  const dayIndex = new Date(date + "T12:00:00").getDay()
  const dayKey = DAY_KEYS[dayIndex]

  const hours = business.bookingHours as Record<string, { open: string; close: string; closed: boolean }> | null
  const dayHours = hours?.[dayKey]

  if (!dayHours || dayHours.closed) return NextResponse.json({ slots: [] })

  const allSlots = generateSlots(dayHours.open, dayHours.close, service.duration)

  // Remove already booked slots
  const booked = await prisma.booking.findMany({
    where: { businessId, date, status: { not: "CANCELLED" } },
    select: { timeSlot: true },
  })
  const bookedSet = new Set(booked.map(b => b.timeSlot))

  const available = allSlots.filter(s => !bookedSet.has(s))
  return NextResponse.json({ slots: available })
}
