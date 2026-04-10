"use client"

import { useRef, useState, useCallback } from "react"
import Image from "next/image"
import { Button } from "./button"
import { Loader2, X, Upload, FileText, Video, Camera, ImageIcon, GripHorizontal } from "lucide-react"

export interface MediaItem {
  url: string
  type: "IMAGE" | "VIDEO" | "PDF"
  filename?: string
  size?: number
}

interface MediaUploaderProps {
  value: MediaItem[]
  onChange: (items: MediaItem[]) => void
  maxFiles?: number
  accept?: string
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MediaUploader({ value, onChange, maxFiles = 10, accept }: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState<string[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const defaultAccept = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,application/pdf"

  async function handleFiles(files: FileList) {
    setErrors([])
    const remaining = maxFiles - value.length
    if (remaining <= 0) {
      setErrors([`Maximum ${maxFiles} files allowed`])
      return
    }

    const toUpload = Array.from(files).slice(0, remaining)

    for (const file of toUpload) {
      setUploading((prev) => [...prev, file.name])
      try {
        const fd = new FormData()
        fd.append("file", file)
        const res = await fetch("/api/upload", { method: "POST", body: fd })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Upload failed")
        const item: MediaItem = { url: json.url, type: json.type, filename: json.filename, size: json.size }
        onChange([...value, item])
      } catch (e) {
        setErrors((prev) => [...prev, `${file.name}: ${(e as Error).message}`])
      } finally {
        setUploading((prev) => prev.filter((n) => n !== file.name))
      }
    }
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  // Drag-to-reorder handlers
  const onDragStart = useCallback((e: React.DragEvent, idx: number) => {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = "move"
    // Set a transparent drag image for cleaner feel
    const el = e.currentTarget as HTMLElement
    e.dataTransfer.setDragImage(el, el.offsetWidth / 2, el.offsetHeight / 2)
  }, [])

  const onDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverIdx(idx)
  }, [])

  const onDrop = useCallback((e: React.DragEvent, dropIdx: number) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === dropIdx) {
      setDragIdx(null)
      setDragOverIdx(null)
      return
    }
    const newItems = [...value]
    const [moved] = newItems.splice(dragIdx, 1)
    newItems.splice(dropIdx, 0, moved)
    onChange(newItems)
    setDragIdx(null)
    setDragOverIdx(null)
  }, [dragIdx, value, onChange])

  const onDragEnd = useCallback(() => {
    setDragIdx(null)
    setDragOverIdx(null)
  }, [])

  return (
    <div className="space-y-3">
      {/* Preview grid with drag-to-reorder */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {value.map((item, i) => (
            <div
              key={item.url + i}
              draggable
              onDragStart={(e) => onDragStart(e, i)}
              onDragOver={(e) => onDragOver(e, i)}
              onDrop={(e) => onDrop(e, i)}
              onDragEnd={onDragEnd}
              className={`relative group rounded-lg overflow-hidden border bg-muted aspect-video cursor-grab active:cursor-grabbing transition-all ${
                dragIdx === i ? "opacity-40 scale-95" : ""
              } ${
                dragOverIdx === i && dragIdx !== i
                  ? "border-[#e8a840] ring-2 ring-[#e8a840]/40"
                  : "border-border"
              }`}
            >
              {item.type === "IMAGE" ? (
                <Image src={item.url} alt={item.filename || "upload"} fill className="object-cover pointer-events-none" />
              ) : item.type === "VIDEO" ? (
                <div className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground">
                  <Video className="h-7 w-7" />
                  {item.size && <span className="text-xs opacity-60">{formatBytes(item.size)}</span>}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground">
                  <FileText className="h-7 w-7" />
                  <span className="text-xs opacity-60">PDF</span>
                </div>
              )}

              {/* COVER badge on first item */}
              {i === 0 && (
                <span className="absolute top-1 left-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gradient-to-r from-[#e8a840] to-[#e07850] text-white shadow-lg">
                  Cover
                </span>
              )}

              {/* Drag handle indicator */}
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-70 transition-opacity pointer-events-none">
                <GripHorizontal className="h-4 w-4 text-white drop-shadow-lg" />
              </div>

              {/* Remove button */}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => remove(i)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}

          {/* Add more slot */}
          {value.length < maxFiles && (
            <div className="aspect-video rounded-lg border-2 border-dashed border-border hover:border-[rgba(232,168,64,0.50)] transition-colors flex items-center justify-center gap-2">
              <button
                type="button"
                className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                onClick={() => inputRef.current?.click()}
              >
                <ImageIcon className="h-4 w-4" />
                <span className="text-[10px]">Library</span>
              </button>
              <div className="h-6 w-px bg-border" />
              <button
                type="button"
                className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                onClick={() => cameraRef.current?.click()}
              >
                <Camera className="h-4 w-4" />
                <span className="text-[10px]">Camera</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Reorder hint */}
      {value.length > 1 && (
        <p className="text-[10px] text-muted-foreground text-center">Drag to reorder - first image = cover</p>
      )}

      {/* Upload drop zone (when empty) */}
      {value.length === 0 && (
        <div
          className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-[rgba(232,168,64,0.50)] transition-colors"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
          }}
        >
          {uploading.length > 0 ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          <p className="text-sm text-muted-foreground text-center font-medium">
            {uploading.length > 0 ? `Uploading ${uploading.length} file(s)…` : "Click or drag files here"}
          </p>
          <p className="text-xs text-[rgba(183,148,212,0.60)] text-center">
            Images (JPG/PNG/WebP · 10MB) · Videos (MP4/WebM · 100MB) · PDF (20MB)
          </p>
          {/* Mobile camera button */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); cameraRef.current?.click() }}
            className="sm:hidden flex items-center gap-2 px-4 py-2 rounded-lg border border-[rgba(232,168,64,0.25)] text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <Camera className="h-4 w-4" />
            Take photo / video
          </button>
        </div>
      )}

      {/* Upload progress (when items exist but still uploading) */}
      {value.length > 0 && uploading.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Uploading {uploading.length} file(s)…
        </div>
      )}

      {/* Errors */}
      {errors.map((err, i) => (
        <p key={i} className="text-xs text-destructive">{err}</p>
      ))}

      {/* Library file input */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept ?? defaultAccept}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files)
          e.target.value = ""
        }}
      />

      {/* Camera capture input */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files)
          e.target.value = ""
        }}
      />
    </div>
  )
}
