"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { countries } from "@/lib/countries"
import { ChevronDown, X } from "lucide-react"

interface CountrySelectProps {
  value: string
  onChange: (code: string) => void
  placeholder?: string
  disabled?: boolean
}

export function CountrySelect({
  value,
  onChange,
  placeholder = "Select a country...",
  disabled = false,
}: CountrySelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selectedCountry = useMemo(
    () => countries.find((c) => c.code.toLowerCase() === value?.toLowerCase()),
    [value]
  )

  const filtered = useMemo(() => {
    if (!search) return countries
    const q = search.toLowerCase()
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    )
  }, [search])

  const handleSelect = useCallback(
    (code: string) => {
      onChange(code)
      setSearch("")
      setOpen(false)
    },
    [onChange]
  )

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onChange("")
      setSearch("")
    },
    [onChange]
  )

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  // Focus input when dropdown opens
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  // Scroll active item into view when dropdown opens
  useEffect(() => {
    if (open && value && listRef.current) {
      const activeEl = listRef.current.querySelector("[data-active='true']")
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" })
      }
    }
  }, [open, value])

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen(!open)
        }}
        className="flex h-10 w-full items-center justify-between rounded-md px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        style={{ background: "var(--input)", border: "1px solid var(--border)" }}
      >
        <span className={`flex-1 text-center ${selectedCountry ? "text-foreground" : "text-muted-foreground"}`}>
          {selectedCountry ? selectedCountry.name : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-[rgba(232,168,64,0.25)] bg-[rgba(36,28,20,0.98)] shadow-2xl">
          {/* Search input */}
          <div className="p-2 border-b border-[rgba(232,168,64,0.1)]">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-md border border-[rgba(232,168,64,0.15)] bg-[rgba(26,21,16,0.6)] px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[rgba(232,168,64,0.4)]"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setOpen(false)
                  setSearch("")
                }
              }}
            />
          </div>

          {/* Options list */}
          <div ref={listRef} className="max-h-[200px] overflow-y-auto p-1">
            {/* Not specified option */}
            <button
              type="button"
              onClick={() => handleSelect("")}
              className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                !value
                  ? "bg-[rgba(232,168,64,0.12)] text-foreground"
                  : "text-muted-foreground hover:bg-[rgba(232,168,64,0.08)] hover:text-foreground"
              }`}
            >
              Not specified
            </button>

            {filtered.map((country) => (
              <button
                key={country.code}
                type="button"
                data-active={country.code === value}
                onClick={() => handleSelect(country.code)}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                  country.code === value
                    ? "bg-[rgba(232,168,64,0.12)] text-foreground"
                    : "text-muted-foreground hover:bg-[rgba(232,168,64,0.08)] hover:text-foreground"
                }`}
              >
                {country.name}
              </button>
            ))}

            {filtered.length === 0 && (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                No countries found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
