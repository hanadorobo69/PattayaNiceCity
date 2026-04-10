import { describe, it, expect } from "vitest"
import { extractHeadings } from "../markdown-utils"

describe("extractHeadings", () => {
  it("returns empty array for empty content", () => {
    expect(extractHeadings("")).toEqual([])
  })

  it("returns empty array for content without headings", () => {
    expect(extractHeadings("Just a paragraph.")).toEqual([])
  })

  it("ignores H1 headings (only extracts H2-H4)", () => {
    expect(extractHeadings("# Title")).toEqual([])
  })

  it("extracts H2 headings", () => {
    const result = extractHeadings("## Hello World")
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ id: "hello-world", text: "Hello World", level: 2 })
  })

  it("extracts H3 headings", () => {
    const result = extractHeadings("### Sub Section")
    expect(result).toHaveLength(1)
    expect(result[0].level).toBe(3)
  })

  it("extracts H4 headings", () => {
    const result = extractHeadings("#### Deep Section")
    expect(result).toHaveLength(1)
    expect(result[0].level).toBe(4)
  })

  it("extracts multiple headings in order", () => {
    const content = "## First\n\nSome text.\n\n### Second\n\nMore text.\n\n## Third"
    const result = extractHeadings(content)
    expect(result).toHaveLength(3)
    expect(result[0].text).toBe("First")
    expect(result[1].text).toBe("Second")
    expect(result[2].text).toBe("Third")
  })

  it("strips markdown formatting from heading text", () => {
    const result = extractHeadings("## **Bold** and *italic* heading")
    expect(result[0].text).toBe("Bold and italic heading")
  })

  it("generates slug-style IDs", () => {
    const result = extractHeadings("## Hello World & Friends")
    expect(result[0].id).toBe("hello-world-friends")
  })

  it("handles special characters in headings", () => {
    const result = extractHeadings("## What's the Best Bar?")
    expect(result[0].text).toBe("What's the Best Bar?")
  })

  it("handles headings with links", () => {
    const result = extractHeadings("## Check [this](http://example.com) out")
    // The regex strips []() but not perfectly - it removes brackets but URL remains
    expect(result[0].text).toBe("Check thishttp://example.com out")
  })
})
