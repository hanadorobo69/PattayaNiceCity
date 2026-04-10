"use client"

import { useRef, useState, useTransition } from "react"
import Image from "next/image"
import { addBlogMedia, deleteBlogMedia } from "@/actions/vlogs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Upload, Trash2, ImageIcon } from "lucide-react"
import type { BlogMedia } from "@prisma/client"

interface BlogMediaManagerProps {
  vlogId: string
  initialMedia: BlogMedia[]
}

export function BlogMediaManager({ vlogId, initialMedia }: BlogMediaManagerProps) {
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [media, setMedia] = useState<BlogMedia[]>(initialMedia)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Upload failed")

      const result = await addBlogMedia(vlogId, { url: json.url })
      if (!result.success) throw new Error(result.error)
      setMedia((prev) => [...prev, result.data])
      toast({ title: "Photo added" })
    } catch (e) {
      toast({ title: "Upload failed", description: (e as Error).message, variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  function handleDelete(id: string) {
    setDeletingId(id)
    startTransition(async () => {
      const result = await deleteBlogMedia(id)
      if (result.success) {
        setMedia((prev) => prev.filter((m) => m.id !== id))
        toast({ title: "Photo removed" })
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      }
      setDeletingId(null)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-[#3db8a0]" />
            Article Photos
          </h3>
          <p className="text-xs text-muted-foreground">{media.length} photo{media.length !== 1 ? "s" : ""}</p>
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
          {uploading ? "Uploading..." : "Add Photo"}
        </Button>
      </div>

      {media.length === 0 ? (
        <div
          className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-2 cursor-pointer hover:border-[rgba(61,184,160,0.50)] transition-colors text-muted-foreground"
          onClick={() => inputRef.current?.click()}
        >
          <ImageIcon className="h-8 w-8" />
          <p className="text-sm">Add photos to this article</p>
          <p className="text-xs opacity-60">JPEG, PNG, WebP - max 10 MB</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {media.map((item) => (
            <div key={item.id} className="relative group rounded-lg overflow-hidden border border-border bg-muted aspect-video">
              <Image src={item.url} alt={item.alt || "article photo"} fill className="object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
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
        accept="image/jpeg,image/png,image/webp,image/gif"
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
