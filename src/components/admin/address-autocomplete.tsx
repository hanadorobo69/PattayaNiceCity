"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"

interface Prediction {
  place_id: string
  description: string
}

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect?: (address: string, lat: number, lng: number, extra?: { district?: string; formattedAddress?: string; photos?: string[]; placeId?: string; website?: string; phone?: string; hours?: Record<string, { open: string; close: string; closed: boolean }> }) => void
  placeholder?: string
  id?: string
  name?: string
}

export function AddressAutocomplete({ value, onChange, onSelect, placeholder, id, name }: AddressAutocompleteProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const fetchPredictions = useCallback(async (input: string) => {
    if (!apiKey || input.length < 3) {
      setPredictions([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(
        `/api/places-autocomplete?input=${encodeURIComponent(input)}`
      )
      const data = await res.json()
      if (data.predictions) {
        setPredictions(data.predictions)
        setShowDropdown(true)
      }
    } catch {
      setPredictions([])
    } finally {
      setLoading(false)
    }
  }, [apiKey])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    onChange(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchPredictions(val), 300)
  }

  async function handleSelect(prediction: Prediction) {
    onChange(prediction.description)
    setShowDropdown(false)
    setPredictions([])
    // Fetch place details for lat/lng
    if (onSelect) {
      try {
        const res = await fetch(`/api/places-details?place_id=${prediction.place_id}`)
        const data = await res.json()
        if (data.lat && data.lng) {
          onSelect(prediction.description, data.lat, data.lng, {
            district: data.district ?? undefined,
            formattedAddress: data.address ?? undefined,
            photos: data.photos ?? undefined,
            placeId: prediction.place_id,
            website: data.website ?? undefined,
            phone: data.phone ?? undefined,
            hours: data.hours ?? undefined,
          })
        }
      } catch { /* ignore */ }
    }
  }

  // Fallback: if no API key, just render a plain input
  if (!apiKey) {
    return (
      <Input
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    )
  }

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        id={id}
        name={name}
        value={value}
        onChange={handleChange}
        onFocus={() => predictions.length > 0 && setShowDropdown(true)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {showDropdown && predictions.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-48 overflow-y-auto">
          {predictions.map((p) => (
            <button
              key={p.place_id}
              type="button"
              onClick={() => handleSelect(p)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors cursor-pointer"
            >
              {p.description}
            </button>
          ))}
        </div>
      )}
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-3.5 w-3.5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}
