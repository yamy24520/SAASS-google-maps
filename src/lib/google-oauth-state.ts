import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"

function signature(payload: string): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error("NEXTAUTH_SECRET manquant")
  return createHmac("sha256", secret).update(payload).digest("base64url")
}

export function createGoogleState(userId: string, businessId: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, businessId, expires: Date.now() + 600_000, nonce: randomBytes(24).toString("hex") })).toString("base64url")
  return `${payload}.${signature(payload)}`
}

export function verifyGoogleState(state: string, cookie: string | undefined, userId: string): string | null {
  if (!cookie || cookie !== state) return null
  try {
    const parts = state.split(".")
    if (parts.length !== 2) return null
    const [payload, mac] = parts
    const expected = Buffer.from(signature(payload))
    const actual = Buffer.from(mac)
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))
    return data.userId === userId && Number.isFinite(data.expires) && data.expires > Date.now() && typeof data.businessId === "string" ? data.businessId : null
  } catch { return null }
}
