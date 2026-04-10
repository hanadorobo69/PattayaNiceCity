"use client"

import { useRef, useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import Image from "next/image"
import { addVenueMedia, deleteVenueMedia, reorderVenueMedia } from "@/actions/venues"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Upload, Trash2, Video, ImagePlus, ChevronUp, ChevronDown, Star } from "lucide-react"
import type { VenueMedia } from "@prisma/client"

interface VenueMediaManagerProps {
  venueId: string
  venueSlug: string
  initialMedia: VenueMedia[]
}

export function VenueMediaManager({ venueId, venueSlug, initialMedia }: VenueMediaManagerProps) {
  const { toast } = useToast()
  const t = useTranslations("venueMedia")
  const inputRef = useRef<HTMLInputElement>(null)
  const [media, setMedia] = useState<VenueMedia[]>(initialMedia)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)
  const [, startTransition] = useTransition()

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Upload failed")

      const result = await addVenueMedia(venueId, { url: json.url, type: json.type, filename: json.filename })
      if (!result.success) throw new Error(result.error)
      setMedia((prev) => [...prev, result.data])
      toast({ title: t("mediaAdded"), description: t("fileUploaded") })
    } catch (e) {
      toast({ title: t("uploadFailed"), description: (e as Error).message, variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  function handleDelete(id: string) {
    setDeletingId(id)
    startTransition(async () => {
      const result = await deleteVenueMedia(id, venueSlug)
      if (result.success) {
        setMedia((prev) => prev.filter((m) => m.id !== id))
        toast({ title: t("deleted"), description: t("mediaRemoved") })
      } else {
        toast({ title: t("error"), description: result.error, variant: "destructive" })
      }
      setDeletingId(null)
    })
  }

  function moveMedia(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= media.length) return
    const newMedia = [...media]
    const [moved] = newMedia.splice(index, 1)
    newMedia.splice(target, 0, moved)
    setMedia(newMedia)
    // Persist to DB
    setReordering(true)
    startTransition(async () => {
      const result = await reorderVenueMedia(venueId, newMedia.map(m => m.id))
      if (!result.success) {
        toast({ title: t("error"), description: result.error, variant: "destructive" })
        setMedia(media) // revert
      }
      setReordering(false)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">{t("photosAndVideos")}</h3>
          <p className="text-xs text-muted-foreground">{t("fileCount", { count: media.length })}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="gap-1.5"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? t("uploading") : t("upload")}
        </Button>
      </div>

      {media.length === 0 ? (
        <div
          className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-2 cursor-pointer hover:border-[rgba(232,168,64,0.50)] transition-colors text-muted-foreground"
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="h-8 w-8" />
          <p className="text-sm">{t("clickToAdd")}</p>
          <p className="text-xs opacity-60">{t("imageSizeLimit")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {media.map((item, idx) => (
            <div key={item.id} className="relative group rounded-lg overflow-hidden border border-border bg-muted aspect-video">
              {item.type === "IMAGE" ? (
                <Image src={item.url} alt={item.caption || "venue photo"} fill className="object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground">
                  <Video className="h-7 w-7" />
                  <span className="text-xs">{t("video")}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 md:transition-colors" />

              {/* Cover badge */}
              {idx === 0 && (
                <span className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#e8a840] text-white">
                  <Star className="h-3 w-3 fill-white" /> Cover
                </span>
              )}

              {/* Reorder buttons - always visible on mobile, hover on desktop */}
              <div className="absolute left-1.5 bottom-1.5 z-10 flex flex-col gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7 rounded-full bg-black/60 hover:bg-black/80 text-white border-0"
                  disabled={idx === 0 || reordering}
                  onClick={() => moveMedia(idx, -1)}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7 rounded-full bg-black/60 hover:bg-black/80 text-white border-0"
                  disabled={idx === media.length - 1 || reordering}
                  onClick={() => moveMedia(idx, 1)}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>

              {/* Delete button */}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1.5 right-1.5 h-7 w-7 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity rounded-full"
                disabled={deletingId === item.id}
                onClick={() => handleDelete(item.id)}
              >
                {deletingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </Button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleUpload(file)
          e.target.value = ""
        }}
      />
    </div>
  )
}
