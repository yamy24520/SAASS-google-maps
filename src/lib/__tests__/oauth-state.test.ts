import { afterEach, describe, it, expect, vi } from "vitest"
import { createGoogleState, verifyGoogleState } from "../google-oauth-state"

afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers() })
describe("Google connection ownership", () => {
  it("accepts only the initiating user and browser", () => {
    vi.stubEnv("NEXTAUTH_SECRET", "test-secret")
    const state = createGoogleState("owner", "business")
    expect(verifyGoogleState(state, state, "owner")).toBe("business")
    expect(verifyGoogleState(state, state, "other-user")).toBeNull()
    expect(verifyGoogleState(state, undefined, "owner")).toBeNull()
    expect(verifyGoogleState("business", "business", "owner")).toBeNull()
    expect(verifyGoogleState(state + "x", state + "x", "owner")).toBeNull()
  })
  it("rejects expired state", () => {
    vi.stubEnv("NEXTAUTH_SECRET", "test-secret")
    vi.useFakeTimers()
    const state = createGoogleState("owner", "business")
    vi.advanceTimersByTime(600_001)
    expect(verifyGoogleState(state, state, "owner")).toBeNull()
  })
})
