import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { FeedTabs } from "../feed-tabs"

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("sort=hot"),
}))

// Mock i18n navigation
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

describe("FeedTabs", () => {
  it("renders all 3 sort tabs", () => {
    render(<FeedTabs currentSort="hot" />)
    expect(screen.getByText("hot")).toBeDefined()
    expect(screen.getByText("new")).toBeDefined()
    expect(screen.getByText("top")).toBeDefined()
  })

  it("applies active style to current sort tab", () => {
    render(<FeedTabs currentSort="hot" />)
    const hotLink = screen.getByText("hot").closest("a")!
    expect(hotLink.className).toContain("ff2d95")
  })

  it("inactive tabs do not have active gradient", () => {
    render(<FeedTabs currentSort="hot" />)
    const newLink = screen.getByText("new").closest("a")!
    expect(newLink.className).not.toContain("bg-gradient")
  })

  it("generates correct URLs", () => {
    render(<FeedTabs currentSort="hot" basePath="/community" />)
    const newLink = screen.getByText("new").closest("a")!
    expect(newLink.getAttribute("href")).toContain("sort=new")
  })

  it("supports wide mode", () => {
    render(<FeedTabs currentSort="hot" wide />)
    const container = screen.getByText("hot").closest("div")!
    expect(container.className).toContain("w-full")
  })
})
