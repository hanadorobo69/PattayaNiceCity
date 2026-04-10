import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

// We need to reset the module between tests to get a clean rateMap
let rateLimit: typeof import("../rate-limit").rateLimit

beforeEach(async () => {
  vi.resetModules()
  vi.useFakeTimers()
  const mod = await import("../rate-limit")
  rateLimit = mod.rateLimit
})

afterEach(() => {
  vi.useRealTimers()
})

describe("rateLimit", () => {
  it("allows first request", () => {
    const result = rateLimit("test-key", 5, 60_000)
    expect(result.ok).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it("allows requests up to the limit", () => {
    for (let i = 0; i < 5; i++) {
      const result = rateLimit("limit-test", 5, 60_000)
      expect(result.ok).toBe(true)
      expect(result.remaining).toBe(4 - i)
    }
  })

  it("blocks requests beyond the limit", () => {
    for (let i = 0; i < 5; i++) {
      rateLimit("block-test", 5, 60_000)
    }
    const blocked = rateLimit("block-test", 5, 60_000)
    expect(blocked.ok).toBe(false)
    expect(blocked.remaining).toBe(0)
  })

  it("resets after window expires", () => {
    for (let i = 0; i < 5; i++) {
      rateLimit("expire-test", 5, 60_000)
    }
    expect(rateLimit("expire-test", 5, 60_000).ok).toBe(false)

    // Advance past window
    vi.advanceTimersByTime(60_001)

    const result = rateLimit("expire-test", 5, 60_000)
    expect(result.ok).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it("tracks different keys independently", () => {
    for (let i = 0; i < 3; i++) {
      rateLimit("user-a", 3, 60_000)
    }
    expect(rateLimit("user-a", 3, 60_000).ok).toBe(false)
    expect(rateLimit("user-b", 3, 60_000).ok).toBe(true)
  })

  it("handles limit of 1", () => {
    const first = rateLimit("one-shot", 1, 10_000)
    expect(first.ok).toBe(true)
    expect(first.remaining).toBe(0)

    const second = rateLimit("one-shot", 1, 10_000)
    expect(second.ok).toBe(false)
  })

  it("handles very short window", () => {
    rateLimit("short-window", 1, 100)
    expect(rateLimit("short-window", 1, 100).ok).toBe(false)

    vi.advanceTimersByTime(101)
    expect(rateLimit("short-window", 1, 100).ok).toBe(true)
  })
})
