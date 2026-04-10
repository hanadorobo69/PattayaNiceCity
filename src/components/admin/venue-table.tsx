"use client"

import { useState } from "react"
import { Link } from "@/i18n/navigation"
import { DeleteButton } from "@/components/admin/delete-button"
import { MapPin, BadgeCheck, Pencil, Search, ChevronLeft, ChevronRight, AlertTriangle, EyeOff, Clock, Image as ImageIcon, FileText, Phone, Navigation, ClipboardCheck, ArrowUpDown, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getDistrictLabel } from "@/lib/districts"

type Venue = {
  id: string
  slug: string
  name: string
  address: string | null
  district: string | null
  isVerified: boolean
  isActive: boolean
  permanentlyClosed: boolean
  needsVerification: boolean
  description: string | null
  hours: string | null
  lat: number | null
  lng: number | null
  imageUrl: string | null
  phone: string | null
  createdAt: string
  category: { name: string; slug: string; icon: string | null }
  _count: { media: number }
}

type SortType = "category" | "newest" | "oldest" | "name"

type FilterType = "all" | "new" | "to-verify" | "verified" | "incomplete" | "no-address" | "no-location" | "no-hours" | "no-photo" | "no-description" | "hidden"

function getMissing(v: Venue): string[] {
  const missing: string[] = []
  if (!v.address) missing.push("address")
  if (v.lat == null || v.lng == null) missing.push("location")
  if (!v.hours) missing.push("hours")
  if (!v.imageUrl && v._count.media === 0) missing.push("photo")
  if (!v.description) missing.push("description")
  return missing
}

function isNew(v: Venue): boolean {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  return new Date(v.createdAt).getTime() > weekAgo
}

const SORTS: { id: SortType; label: string }[] = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "name", label: "A-Z" },
  { id: "category", label: "Category" },
]

function applySortFn(venues: Venue[], sort: SortType): Venue[] {
  const sorted = [...venues]
  switch (sort) {
    case "newest": return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    case "oldest": return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    case "name": return sorted.sort((a, b) => a.name.localeCompare(b.name))
    default: return sorted
  }
}

const FILTERS: { id: FilterType; label: string; icon: React.ReactNode }[] = [
  { id: "all", label: "All", icon: null },
  { id: "new", label: "New", icon: <Sparkles className="h-3 w-3" /> },
  { id: "to-verify", label: "To Verify", icon: <ClipboardCheck className="h-3 w-3" /> },
  { id: "verified", label: "Verified", icon: <BadgeCheck className="h-3 w-3" /> },
  { id: "incomplete", label: "Incomplete", icon: <AlertTriangle className="h-3 w-3" /> },
  { id: "hidden", label: "Hidden", icon: <EyeOff className="h-3 w-3" /> },
  { id: "no-address", label: "No Address", icon: <MapPin className="h-3 w-3" /> },
  { id: "no-location", label: "No GPS", icon: <Navigation className="h-3 w-3" /> },
  { id: "no-hours", label: "No Hours", icon: <Clock className="h-3 w-3" /> },
  { id: "no-photo", label: "No Photo", icon: <ImageIcon className="h-3 w-3" /> },
  { id: "no-description", label: "No Desc", icon: <FileText className="h-3 w-3" /> },
]

function applyFilter(venues: Venue[], filter: FilterType): Venue[] {
  switch (filter) {
    case "new": return venues.filter(v => isNew(v))
    case "to-verify": return venues.filter(v => v.needsVerification)
    case "verified": return venues.filter(v => v.isVerified)
    case "incomplete": return venues.filter(v => getMissing(v).length > 0)
    case "hidden": return venues.filter(v => !v.isActive || v.permanentlyClosed)
    case "no-address": return venues.filter(v => !v.address)
    case "no-location": return venues.filter(v => v.lat == null || v.lng == null)
    case "no-hours": return venues.filter(v => !v.hours)
    case "no-photo": return venues.filter(v => !v.imageUrl && v._count.media === 0)
    case "no-description": return venues.filter(v => !v.description)
    default: return venues
  }
}

function getFilterCount(venues: Venue[], filter: FilterType): number {
  return applyFilter(venues, filter).length
}

const PAGE_SIZE = 50

export function VenueTable({ venues, labels }: { venues: Venue[]; labels: Record<string, string> }) {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<FilterType>("all")
  const [sort, setSort] = useState<SortType>("category")

  const q = search.toLowerCase().trim()
  const searched = q
    ? venues.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.category.name.toLowerCase().includes(q) ||
          v.category.slug.toLowerCase().includes(q) ||
          (v.address && v.address.toLowerCase().includes(q)) ||
          (v.district && (v.district.toLowerCase().includes(q) || (getDistrictLabel(v.district) || "").toLowerCase().includes(q)))
      )
    : venues

  const filtered = applySortFn(applyFilter(searched, filter), filter === "new" ? "newest" : sort)

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <>
      {/* Search + sort + count */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value as SortType); setPage(1) }}
            className="h-9 rounded-lg border border-input bg-background px-2 text-xs text-foreground"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {filtered.length} spot{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const count = f.id === "all" ? venues.length : getFilterCount(searched, f.id)
          const isActive = filter === f.id
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => { setFilter(f.id); setPage(1) }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? f.id === "hidden"
                    ? "bg-destructive/20 text-destructive border border-destructive/30"
                    : f.id === "new"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : f.id === "to-verify"
                    ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                    : f.id === "verified"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : f.id === "incomplete"
                    ? "bg-[#facc15]/20 text-[#facc15] border border-[#facc15]/30"
                    : "bg-primary/20 text-primary border border-primary/30"
                  : "bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted hover:text-foreground"
              }`}
            >
              {f.icon}
              {f.label}
              <span className={`ml-0.5 tabular-nums ${isActive ? "opacity-100" : "opacity-60"}`}>({count})</span>
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="rounded-xl border satine-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(232,168,64,0.20)] bg-[rgba(75,35,120,0.12)]">
              <th className="text-left p-3 font-medium text-muted-foreground">{labels.name}</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">{labels.category}</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">{labels.district}</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Added</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Info</th>
              <th className="text-left p-3 font-medium text-muted-foreground">{labels.status}</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(232,168,64,0.06)]">
            {paginated.map((venue) => {
              const missing = getMissing(venue)
              return (
                <tr key={venue.id} className="hover:bg-[rgba(75,35,120,0.08)] transition-colors">
                  <td className="p-3 font-medium">
                    <Link href={`/places/${venue.slug}`} className="hover:text-[#3db8a0] transition-colors">
                      {venue.name}
                    </Link>
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {venue.category.icon} {labels[`cat_${venue.category.slug}`] || venue.category.name}
                    </span>
                  </td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground text-xs">
                    {venue.district ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {getDistrictLabel(venue.district) || venue.district}
                      </span>
                    ) : "-"}
                  </td>
                  <td className="p-3 hidden lg:table-cell text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(venue.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    {isNew(venue) && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-medium">NEW</span>}
                  </td>
                  <td className="p-3">
                    {missing.length === 0 ? (
                      <span className="text-xs text-green-400">Complete</span>
                    ) : (
                      <div className="flex items-center gap-1 flex-wrap">
                        {missing.map((m) => (
                          <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-[#facc15]/10 text-[#facc15] whitespace-nowrap">
                            {m === "address" && "addr"}
                            {m === "location" && "GPS"}
                            {m === "hours" && "hours"}
                            {m === "photo" && "photo"}
                            {m === "description" && "desc"}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {venue.needsVerification && (
                        <span className="text-xs text-yellow-400 flex items-center gap-0.5">
                          <ClipboardCheck className="h-3 w-3" /> To verify
                        </span>
                      )}
                      {venue.isVerified && (
                        <span className="text-xs text-primary flex items-center gap-0.5">
                          <BadgeCheck className="h-3 w-3" /> {labels.verified}
                        </span>
                      )}
                      {venue.permanentlyClosed && (
                        <span className="text-xs text-destructive">{labels.closed || "Closed"}</span>
                      )}
                      {!venue.isActive && !venue.permanentlyClosed && (
                        <span className="text-xs text-destructive flex items-center gap-0.5">
                          <EyeOff className="h-3 w-3" /> {labels.inactive}
                        </span>
                      )}
                      {venue.isActive && !venue.isVerified && !venue.permanentlyClosed && (
                        <span className="text-xs text-muted-foreground">{labels.active}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/venues/${venue.id}/edit`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <DeleteButton id={venue.id} type="venue" itemName={venue.name} />
                    </div>
                  </td>
                </tr>
              )
            })}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  {labels.noResults || "No spots found"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => setPage(safePage - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> {labels.prev || "Previous"}
          </Button>
          <span className="text-sm text-muted-foreground">
            {safePage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage >= totalPages}
            onClick={() => setPage(safePage + 1)}
          >
            {labels.next || "Next"} <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </>
  )
}
