import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { VenueDetailTabs } from "../venue-detail-tabs"

// Mock IntersectionObserver (not available in jsdom)
const mockObserve = vi.fn()
const mockDisconnect = vi.fn()
vi.stubGlobal("IntersectionObserver", vi.fn(() => ({
  observe: mockObserve,
  disconnect: mockDisconnect,
  unobserve: vi.fn(),
})))

beforeEach(() => {
  window.location.hash = ""
  vi.spyOn(window.history, "pushState").mockImplementation(() => {})
})

const children = {
  overview: <div data-testid="content-overview">Overview content</div>,
  pricing: <div data-testid="content-pricing">Pricing content</div>,
  gallery: <div data-testid="content-gallery">Gallery content</div>,
  reviews: <div data-testid="content-reviews">Reviews content</div>,
}

describe("VenueDetailTabs", () => {
  it("renders all tab buttons", () => {
    render(<VenueDetailTabs>{children}</VenueDetailTabs>)
    expect(screen.getByText("Overview")).toBeDefined()
    expect(screen.getByText("Pricing")).toBeDefined()
    expect(screen.getByText("Gallery")).toBeDefined()
    expect(screen.getByText("Reviews")).toBeDefined()
  })

  it("shows overview tab by default", () => {
    render(<VenueDetailTabs>{children}</VenueDetailTabs>)
    const overview = screen.getByTestId("content-overview")
    const pricing = screen.getByTestId("content-pricing")
    expect(overview.parentElement!.style.display).not.toBe("none")
    expect(pricing.parentElement!.style.display).toBe("none")
  })

  it("all tab panels are in the DOM (display:none, not unmounted)", () => {
    render(<VenueDetailTabs>{children}</VenueDetailTabs>)
    expect(screen.getByTestId("content-overview")).toBeDefined()
    expect(screen.getByTestId("content-pricing")).toBeDefined()
    expect(screen.getByTestId("content-gallery")).toBeDefined()
    expect(screen.getByTestId("content-reviews")).toBeDefined()
  })

  it("switches visible tab on click without unmounting others", () => {
    render(<VenueDetailTabs>{children}</VenueDetailTabs>)
    fireEvent.click(screen.getByText("Gallery"))

    const gallery = screen.getByTestId("content-gallery")
    const overview = screen.getByTestId("content-overview")
    expect(gallery.parentElement!.style.display).not.toBe("none")
    expect(overview.parentElement!.style.display).toBe("none")
  })

  it("updates hash when switching tabs", () => {
    render(<VenueDetailTabs>{children}</VenueDetailTabs>)
    fireEvent.click(screen.getByText("Reviews"))
    expect(window.history.pushState).toHaveBeenCalled()
  })

  it("reads initial tab from hash", () => {
    window.location.hash = "#pricing"
    render(<VenueDetailTabs>{children}</VenueDetailTabs>)
    const pricing = screen.getByTestId("content-pricing")
    expect(pricing.parentElement!.style.display).not.toBe("none")
  })

  it("falls back to overview for invalid hash", () => {
    window.location.hash = "#invalid"
    render(<VenueDetailTabs>{children}</VenueDetailTabs>)
    const overview = screen.getByTestId("content-overview")
    expect(overview.parentElement!.style.display).not.toBe("none")
  })
})
