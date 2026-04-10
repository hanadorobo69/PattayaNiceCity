"use client"

import { useState, useRef, useEffect } from "react"
import dynamic from "next/dynamic"
import { Smile, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { EmojiStyle } from "emoji-picker-react"

const EmojiPicker = dynamic(
  () => import("emoji-picker-react"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center w-[320px] h-[380px] bg-card rounded-xl border border-[rgba(232,168,64,0.2)]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

interface EmojiPickerButtonProps {
  onEmojiSelect: (emoji: string) => void
  className?: string
}

export function EmojiPickerButton({ onEmojiSelect, className }: EmojiPickerButtonProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-muted-foreground hover:text-foreground transition-colors p-1"
        title="Emoji"
      >
        <Smile className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute z-[100] bottom-full mb-2 left-0">
          <EmojiPicker
            onEmojiClick={(emojiData: any) => {
              onEmojiSelect(emojiData.emoji)
              setOpen(false)
            }}
            emojiStyle={EmojiStyle.NATIVE}
            theme={"dark" as any}
            width={320}
            height={380}
            searchPlaceHolder="Search emoji..."
            previewConfig={{ showPreview: false }}
            skinTonesDisabled={false}
            lazyLoadEmojis={false}
          />
        </div>
      )}
    </div>
  )
}
