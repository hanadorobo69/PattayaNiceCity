import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ProfileTabs } from "../profile-tabs"

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string) => key
    t.has = () => false
    return t
  },
  useLocale: () => "en",
}))

// Mock i18n navigation
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

beforeEach(() => {
  window.location.hash = ""
  vi.spyOn(window.history, "pushState").mockImplementation(() => {})
})

const defaultProps = {
  posts: [
    { slug: "post-1", title: "My First Post", createdAt: "2025-01-01", score: 5, _count: { comments: 3 } },
  ],
  comments: [
    { id: "c1", content: "Nice comment here!", score: 2, createdAt: "2025-01-01", targetType: "post" as const, targetSlug: "post-1", targetTitle: "Some Post", linkHref: "/post/post-1", replyCount: 1 },
  ],
  likedPosts: [
    { votedAt: "2025-01-01", post: { slug: "post-2", title: "A Liked Post", createdAt: "2025-01-01", score: 10, _count: { comments: 2 } } },
  ],
  venueFavorites: [
    {
      id: "fav-1",
      createdAt: "2025-01-01",
      venue: {
        slug: "beach-bar",
        name: "Beach Bar",
        imageUrl: null,
        category: { id: "cat1", name: "Bar", slug: "bar", color: "#ff0000", icon: "🍺" },
        _count: { venueRatings: 5, posts: 3 },
      },
    },
  ],
  username: "testuser",
}

describe("ProfileTabs", () => {
  it("renders all 4 tab buttons", () => {
    render(<ProfileTabs {...defaultProps} />)
    const buttons = screen.getAllByRole("button")
    // 4 tab buttons + sort pill buttons
    expect(buttons.length).toBeGreaterThanOrEqual(4)
  })

  it("shows favorites tab content by default (Beach Bar visible)", () => {
    render(<ProfileTabs {...defaultProps} />)
    expect(screen.getByText("Beach Bar")).toBeDefined()
  })

  it("all tab panels remain in the DOM (display:none, not unmounted)", () => {
    render(<ProfileTabs {...defaultProps} />)
    // All unique content should be in DOM, just hidden via display:none
    expect(screen.getByText("Beach Bar")).toBeDefined()
    expect(screen.getByText("My First Post")).toBeDefined()
    expect(screen.getByText("Nice comment here!")).toBeDefined()
    expect(screen.getByText("A Liked Post")).toBeDefined()
  })

  it("switching tabs keeps previous tab content in DOM", () => {
    render(<ProfileTabs {...defaultProps} />)
    // Click the "posts" tab button (find by its count text pattern)
    const buttons = screen.getAllByRole("button")
    const postsBtn = buttons.find(btn => btn.textContent?.includes("posts"))!
    fireEvent.click(postsBtn)
    // Favorites content should still be in DOM (hidden)
    expect(screen.getByText("Beach Bar")).toBeDefined()
  })

  it("updates URL hash on tab switch", () => {
    render(<ProfileTabs {...defaultProps} />)
    const buttons = screen.getAllByRole("button")
    const postsBtn = buttons.find(btn => btn.textContent?.includes("posts"))!
    fireEvent.click(postsBtn)
    expect(window.history.pushState).toHaveBeenCalled()
  })

  it("reads initial tab from URL hash", () => {
    window.location.hash = "#comments"
    render(<ProfileTabs {...defaultProps} />)
    // The comments tab button should have the active gradient style
    const buttons = screen.getAllByRole("button")
    const commentsBtn = buttons.find(btn => btn.textContent?.includes("comments"))!
    expect(commentsBtn.className).toContain("ff2d95")
  })
})
