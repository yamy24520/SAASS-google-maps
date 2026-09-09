import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import { dateSchema, minutes, overlaps, parisSlotInstant, timeSchema } from "./booking-rules"

type Params = { businessId: string; date: string; serviceId?: string | null; staffId?: string | null; partySize?: number; ignoreBookingId?: string }
type Availability = { slots: string[]; staffForSlot: Record<string, string | null>; reason?: string }
const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
const bounded = (value: unknown, fallback: number, min: number, max: number) => typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback

export async function getAvailability(params: Params, db: Prisma.TransactionClient = prisma): Promise<Availability> {
  const empty = (reason: string): Availability => ({ slots: [], staffForSlot: {}, reason })
  const { businessId, date, serviceId, staffId } = params
  if (!dateSchema.safeParse(date).success) return empty("invalid_date")
  const business = await db.business.findUnique({ where: { id: businessId } })
  if (!business) return empty("not_found")
  const restaurant = business.bookingType === "restaurant"
  const service = serviceId ? await db.service.findFirst({ where: { id: serviceId, businessId, active: true } }) : null
  if (!restaurant && !service) return empty("service_not_found")
  const settings = (business.bookingSettings ?? {}) as Record<string, unknown>
  const duration = restaurant ? 30 : Math.max(1, service!.duration)
  const buffer = bounded(settings.bufferMinutes, 0, 0, 240)
  const step = bounded(settings.slotInterval, restaurant ? 30 : duration + buffer, 5, 1440)
  const notice = bounded(settings.minNoticeHours, 0, 0, 8760)
  const maxDays = bounded(settings.maxDaysAhead, 60, 0, 730)
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date())
  const daysAhead = Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000)
  if (daysAhead < 0 || daysAhead > maxDays) return empty("outside_booking_window")
  const hours = business.bookingHours as Record<string, { open: string; close: string; closed: boolean }> | null
  const day = hours?.[days[new Date(`${date}T12:00:00Z`).getUTCDay()]]
  if (!day || day.closed || !timeSchema.safeParse(day.open).success || !timeSchema.safeParse(day.close).success) return empty("closed")
  if (await db.closedDate.findUnique({ where: { businessId_date: { businessId, date } } })) return empty("closed_exceptional")
  const staffs = await db.staff.findMany({ where: { businessId, active: true }, select: { id: true } })
  if (staffId && !staffs.some(staff => staff.id === staffId)) return empty("staff_not_found")
  const absences = await db.staffAbsence.findMany({ where: { staffId: { in: staffs.map(staff => staff.id) }, startDate: { lte: date }, endDate: { gte: date } }, select: { staffId: true } })
  const absent = new Set(absences.map(item => item.staffId))
  const candidates: (string | null)[] = staffs.length ? staffs.filter(staff => (!staffId || staff.id === staffId) && !absent.has(staff.id)).map(staff => staff.id) : [null]
  if (!restaurant && !candidates.length) return empty("staff_absent")
  const bookings = await db.booking.findMany({ where: { businessId, date, status: { not: "CANCELLED" }, ...(params.ignoreBookingId ? { id: { not: params.ignoreBookingId } } : {}) }, include: { service: { select: { duration: true } } } })
  const slots: string[] = []
  const staffForSlot: Record<string, string | null> = {}
  const breakStart = settings.breakEnabled && timeSchema.safeParse(settings.breakStart).success ? minutes(String(settings.breakStart)) : null
  const breakEnd = settings.breakEnabled && timeSchema.safeParse(settings.breakEnd).success ? minutes(String(settings.breakEnd)) : null
  for (let start = minutes(day.open); start + duration <= minutes(day.close); start += step) {
    if (breakStart !== null && breakEnd !== null && overlaps(start, duration, breakStart, breakEnd - breakStart)) continue
    const time = `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`
    const instant = parisSlotInstant(date, time)
    if (!Number.isFinite(instant) || instant < Date.now() + notice * 3600_000) continue
    if (restaurant) {
      const covers = bookings.filter(booking => booking.timeSlot === time).reduce((sum, booking) => sum + (booking.partySize ?? 1), 0)
      if (business.bookingMaxCovers !== null && covers + (params.partySize ?? 1) > business.bookingMaxCovers) continue
      slots.push(time); staffForSlot[time] = null
    } else {
      const available = candidates.filter(candidate => !bookings.some(booking =>
        (candidate === null || booking.staffId === null || booking.staffId === candidate) && overlaps(start, duration, minutes(booking.timeSlot), booking.service?.duration ?? 30, buffer)
      ))
      if (available.length) {
        available.sort((a, b) => bookings.filter(item => item.staffId === a).length - bookings.filter(item => item.staffId === b).length)
        slots.push(time); staffForSlot[time] = available[0]
      }
    }
  }
  return { slots, staffForSlot }
}
