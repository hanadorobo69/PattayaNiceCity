"use client"

import { LayoutGrid, List } from "lucide-react"
import { useState } from "react"

export function ViewToggle({ onChange }: { onChange?: (view: "grid" | "list") => void }) {
  const [view, setView] = useState<"grid" | "list">("grid")

  const toggle = (v: "grid" | "list") => {
    setView(v)
    onChange?.(v)
  }

  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-lg glass-card">
      <button
        type="button"
        onClick={() => toggle("grid")}
        className={`p-1.5 rounded transition-all ${view === "grid" ? "bg-[rgba(232,168,64,0.20)] text-[#e8a840]" : "text-muted-foreground hover:text-foreground"}`}
        title="Grid view"
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => toggle("list")}
        className={`p-1.5 rounded transition-all ${view === "list" ? "bg-[rgba(232,168,64,0.20)] text-[#e8a840]" : "text-muted-foreground hover:text-foreground"}`}
        title="List view"
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  )
}
