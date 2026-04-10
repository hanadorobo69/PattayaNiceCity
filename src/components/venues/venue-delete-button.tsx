"use client"

import { useState, useTransition, useEffect } from "react"
import { Trash2, Loader2 } from "lucide-react"
import { deleteVenue } from "@/actions/venues"
import { useRouter } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"

interface VenueDeleteButtonProps {
  venueId: string
}

export function VenueDeleteButton({ venueId }: VenueDeleteButtonProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) setOpen(false)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, isPending])

  // Prevent body scroll when modal open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
      return () => { document.body.style.overflow = "" }
    }
  }, [open])

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteVenue(venueId)
      if (result.success) {
        router.push("/")
      } else {
        setOpen(false)
        alert(result.error || "Failed to delete")
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center h-[4.5rem] w-[4.5rem] rounded-xl bg-[rgba(26,21,16,0.75)] text-red-400 border border-[rgba(239,68,68,0.30)] hover:bg-[rgba(239,68,68,0.25)] hover:text-red-300 transition-colors backdrop-blur-sm"
        title="Delete spot"
      >
        <Trash2 className="h-7 w-7" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isPending && setOpen(false)} />
          <div className="relative bg-card border satine-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Delete this spot?</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              This will permanently delete this spot and all its data (ratings, comments, media). This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end pt-1">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
