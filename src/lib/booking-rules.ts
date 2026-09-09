import { z } from "zod"

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}, "Date invalide")
export const timeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
export const bookingSchema = z.object({
  businessId: z.string().min(1).optional(),
  serviceId: z.string().nullable().optional(), staffId: z.string().nullable().optional(),
  clientName: z.string().trim().min(1).max(150),
  clientEmail: z.string().trim().toLowerCase().email().max(254),
  clientPhone: z.string().max(40).nullable().optional(),
  date: dateSchema, timeSlot: timeSchema,
  notes: z.string().max(5000).nullable().optional(),
  partySize: z.number().int().min(1).max(500).nullable().optional(),
  manualStatus: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]).optional(),
  recurrence: z.enum(["weekly", "biweekly", "monthly", "none", ""]).nullable().optional(),
  recurrenceEnd: z.union([dateSchema, z.literal("")]).nullable().optional(),
  smsOptIn: z.boolean().optional(),
})

export function recurringDates(start: string, recurrence?: string | null, end?: string | null): string[] {
  const dates = [dateSchema.parse(start)]
  if (!recurrence || recurrence === "none" || !end) return dates
  dateSchema.parse(end)
  if (end < start) throw new Error("La fin de récurrence précède le premier rendez-vous.")
  const origin = new Date(`${start}T12:00:00Z`)
  for (let index = 1; index <= 52; index++) {
    const next = new Date(origin)
    if (recurrence === "monthly") {
      next.setUTCDate(1)
      next.setUTCMonth(origin.getUTCMonth() + index)
      const last = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate()
      next.setUTCDate(Math.min(origin.getUTCDate(), last))
    } else next.setUTCDate(origin.getUTCDate() + index * (recurrence === "weekly" ? 7 : 14))
    const value = next.toISOString().slice(0, 10)
    if (value > end) return dates
    if (index === 52) throw new Error("Une série est limitée à 52 rendez-vous.")
    dates.push(value)
  }
  return dates
}

export function minutes(time: string): number { const [h, m] = time.split(":").map(Number); return h * 60 + m }
export function overlaps(start: number, duration: number, otherStart: number, otherDuration: number, buffer = 0) {
  return start < otherStart + otherDuration + buffer && start + duration + buffer > otherStart
}

// Convert a Europe/Paris wall-clock slot into an instant, independent of Vercel's region.
export function parisSlotInstant(date: string, time: string): number {
  const target = Date.parse(`${date}T${time}:00Z`)
  let guess = target
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(guess)
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
    const represented = Date.parse(`${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:00Z`)
    if (represented === target) return guess
    guess += target - represented
  }
  return NaN // Nonexistent local time during the spring clock change.
}
