import { describe, it, expect } from "vitest"
import { extractYouTubeId } from "../youtube"

describe("extractYouTubeId", () => {
  it("extracts from standard watch URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ")
  })

  it("extracts from short URL", () => {
    expect(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ")
  })

  it("extracts from embed URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ")
  })

  it("extracts from shorts URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ")
  })

  it("handles URL with extra parameters", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120")).toBe("dQw4w9WgXcQ")
  })

  it("handles URL without www", () => {
    expect(extractYouTubeId("https://youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ")
  })

  it("returns null for non-YouTube URL", () => {
    expect(extractYouTubeId("https://example.com/video")).toBeNull()
  })

  it("returns null for empty string", () => {
    expect(extractYouTubeId("")).toBeNull()
  })

  it("returns null for malformed URL", () => {
    expect(extractYouTubeId("not-a-url")).toBeNull()
  })

  it("handles IDs with hyphens and underscores", () => {
    expect(extractYouTubeId("https://youtu.be/a-b_c1d2E3F")).toBe("a-b_c1d2E3F")
  })
})
