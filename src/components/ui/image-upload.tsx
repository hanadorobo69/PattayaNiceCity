"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { Button } from "./button"
import { Loader2, ImagePlus, X } from "lucide-react"

interface ImageUploadProps {
  value?: string
  onChange: (url: string) => void
  onClear?: () => void
}

export function ImageUpload({ value, onChange, onClear }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)
    setIsUploading(true)

    // Show instant local preview while uploading
    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)

    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Upload failed")
      setPreview(null)
      URL.revokeObjectURL(localUrl)
      onChange(json.url)
    } catch (e) {
      setPreview(null)
      URL.revokeObjectURL(localUrl)
      setError((e as Error).message)
    } finally {
      setIsUploading(false)
    }
  }

  const displayUrl = preview || value

  return (
    <div className="space-y-2">
      {displayUrl ? (
        <div className="relative rounded-lg overflow-hidden border border-border aspect-video max-h-64 w-full bg-muted">
          <Image src={displayUrl} alt="Uploaded image" fill className="object-cover" />
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
          {!isUploading && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7 rounded-full"
              onClick={() => { setPreview(null); onClear?.(); onChange("") }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ) : (
        <div
          className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-[rgba(232,168,64,0.50)] transition-colors"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer.files[0]
            if (file) handleFile(file)
          }}
        >
          {isUploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <ImagePlus className="h-8 w-8 text-muted-foreground" />
          )}
          <p className="text-sm text-muted-foreground text-center">
            {isUploading ? "Uploading..." : "Click or drag to upload a photo"}
          </p>
          <p className="text-xs text-[rgba(183,148,212,0.60)]">JPG, PNG, WebP · max 10MB</p>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ""
        }}
      />
    </div>
  )
}
