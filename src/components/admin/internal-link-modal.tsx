"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import { searchVlogs, searchVenues } from "@/actions/vlogs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X, FileText, MapPin, Loader2, Link2, Copy } from "lucide-react"

type LinkType = "article" | "venue"

interface InternalLinkModalProps {
  type: LinkType
  onInsert: (markdown: string) => void
  onClose: () => void
}

export function InternalLinkModal({ type, onInsert, onClose }: InternalLinkModalProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Array<{ name: string; slug: string; extra?: string }>>([])
  const [selected, setSelected] = useState<{ name: string; slug: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) { setResults([]); return }

    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        if (type === "article") {
          const data = await searchVlogs(query)
          setResults(data.map(d => ({ name: d.title, slug: d.slug })))
        } else {
          const data = await searchVenues(query)
          setResults(data.map(d => ({ name: d.name, slug: d.slug, extra: d.category })))
        }
      })
    }, 300)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, type])

  // Build the markdown that will be inserted
  function getMarkdown(item: { name: string; slug: string }) {
    return type === "article" ? `[${item.name}](/vlogs/${item.slug})` : `@${item.slug}`
  }

  function handleConfirmInsert() {
    if (!selected) return
    onInsert(getMarkdown(selected))
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl border border-[rgba(224,120,80,0.30)] bg-card shadow-2xl shadow-[rgba(224,120,80,0.15)] p-4 space-y-3"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            {type === "article" ? (
              <><FileText className="h-4 w-4 text-[#3db8a0]" /> Insert Article Link</>
            ) : (
              <><MapPin className="h-4 w-4 text-[#e8a840]" /> Insert Venue Link</>
            )}
          </h3>
          <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(null) }}
            placeholder={type === "article" ? "Search articles..." : "Search venues..."}
            className="pl-9"
          />
        </div>

        {/* Search results */}
        <div className="max-h-48 overflow-y-auto space-y-1">
          {isPending && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isPending && results.length === 0 && query.length >= 2 && (
            <p className="text-xs text-muted-foreground text-center py-4">No results found</p>
          )}
          {results.map((item) => (
            <button
              key={item.slug}
              type="button"
              onClick={() => setSelected(item)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors group ${
                selected?.slug === item.slug
                  ? "bg-[rgba(61,184,160,0.10)] border border-[rgba(61,184,160,0.30)]"
                  : "hover:bg-[rgba(224,120,80,0.10)]"
              }`}
            >
              <p className="text-sm font-medium text-foreground group-hover:text-[#3db8a0] transition-colors truncate">
                {item.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {type === "article" ? `/vlogs/${item.slug}` : `@${item.slug}`}
                {item.extra && <span className="ml-2 text-[#e07850]">{item.extra}</span>}
              </p>
            </button>
          ))}
        </div>

        {/* Preview & Insert - shown when an item is selected */}
        {selected && (
          <div className="rounded-lg border border-[rgba(61,184,160,0.20)] bg-[rgba(61,184,160,0.05)] p-3 space-y-2">
            <p className="text-xs font-semibold text-[#3db8a0] flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" /> Preview
            </p>
            <div className="rounded-md bg-black/30 px-3 py-2">
              <code className="text-xs text-[#e07850] break-all">{getMarkdown(selected)}</code>
            </div>
            <p className="text-xs text-muted-foreground">
              Will render as: <span className="text-[#3db8a0] font-medium">{selected.name}</span> → <span className="text-muted-foreground/70">{type === "article" ? `/vlogs/${selected.slug}` : `/places/${selected.slug}`}</span>
            </p>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmInsert}
              className="w-full gap-2 bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] text-white font-semibold hover:opacity-90"
            >
              <Copy className="h-3.5 w-3.5" /> Insert at cursor
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
