"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { X, Search, Loader2 } from "lucide-react"

interface GifResult {
  id: string
  title: string
  preview: string
  url: string
}

interface GifPickerProps {
  onSelect: (url: string) => void
  onClose: () => void
}

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<GifResult[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextOffset, setNextOffset] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchGifs = useCallback(async (q: string, offset = "", append = false) => {
    append ? setLoadingMore(true) : setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set("q", q)
      if (offset) params.set("offset", offset)
      const res = await fetch(`/api/gifs?${params}`)
      const data = await res.json()
      setResults(prev => append ? [...prev, ...(data.results ?? [])] : (data.results ?? []))
      setNextOffset(data.next ?? "")
    } catch {
      if (!append) setResults([])
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  // Fetch on query change - immediate for initial load, debounced for typing
  useEffect(() => {
    setResults([])
    setNextOffset("")
    setLoading(true)
    const timer = setTimeout(() => fetchGifs(query), query ? 350 : 0)
    return () => clearTimeout(timer)
  }, [query]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { inputRef.current?.focus() }, [])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [onClose])

  return (
    <div
      ref={containerRef}
      className="absolute z-[100] bottom-full mb-2 left-0 w-[340px] max-h-[420px] rounded-xl border border-[rgba(232,168,64,0.25)] bg-card shadow-2xl shadow-black/40 flex flex-col overflow-hidden"
    >
      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[rgba(232,168,64,0.10)]">
        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIFs..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-2 min-h-[200px]">
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && results.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-12">
            {query ? "No GIFs found" : "No results"}
          </p>
        )}

        {!loading && results.length > 0 && (
          <>
            <div className="columns-2 gap-1.5">
              {results.map((gif) => (
                <button
                  key={gif.id}
                  type="button"
                  onClick={() => onSelect(gif.url)}
                  className="block w-full mb-1.5 rounded-lg overflow-hidden hover:ring-2 hover:ring-[#e8a840] transition-all break-inside-avoid bg-muted/30"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={gif.preview}
                    alt={gif.title}
                    className="w-full h-auto block"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </button>
              ))}
            </div>

            {nextOffset && (
              <button
                type="button"
                onClick={() => fetchGifs(query, nextOffset, true)}
                disabled={loadingMore}
                className="w-full py-3 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
              >
                {loadingMore ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  "Load more"
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* Attribution */}
      <div className="px-3 py-1 border-t border-[rgba(232,168,64,0.10)] text-center">
        <span className="text-[9px] text-muted-foreground">Powered by GIPHY</span>
      </div>
    </div>
  )
}
