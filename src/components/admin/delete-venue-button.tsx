"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { deleteVenue } from "@/actions/venues"

interface DeleteVenueButtonProps {
  venueId: string
  venueName: string
}

export function DeleteVenueButton({ venueId, venueName }: DeleteVenueButtonProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteVenue(venueId)
      if (result.success) {
        router.push("/admin/venues")
      }
    })
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={() => setOpen(true)}
        title="Delete spot"
      >
        <Trash2 className="h-5 w-5" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/60" onClick={() => !isPending && setOpen(false)} />
          <div className="relative bg-card border satine-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Delete Spot</h3>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to permanently delete <strong className="text-foreground">{venueName}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
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
