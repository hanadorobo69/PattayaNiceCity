"use client"

import { useState, useRef } from "react"
import { Send, ImageIcon, X } from "lucide-react"
import { EmojiPickerButton } from "@/components/ui/emoji-picker-button"
import { GifPicker } from "@/components/ui/gif-picker"

interface MessageInputProps {
  onSend: (content: string) => void
  disabled?: boolean
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [value, setValue] = useState("")
  const [gifUrl, setGifUrl] = useState<string | null>(null)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const text = value.trim()
    // Need either text or a GIF
    if (!text && !gifUrl) return

    // Compose content: text + optional [gif](url) at end
    let content = text
    if (gifUrl) {
      content = text ? `${text}\n[gif](${gifUrl})` : `[gif](${gifUrl})`
    }

    onSend(content)
    setValue("")
    setGifUrl(null)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function handleEmojiSelect(emoji: string) {
    const textarea = inputRef.current
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newVal = value.slice(0, start) + emoji + value.slice(end)
      setValue(newVal)
      // Restore cursor after emoji
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length
        textarea.focus()
      })
    } else {
      setValue(prev => prev + emoji)
    }
  }

  function handleGifSelect(url: string) {
    setGifUrl(url)
    setShowGifPicker(false)
    inputRef.current?.focus()
  }

  const gifIsVideo = gifUrl ? (gifUrl.includes(".mp4") || gifUrl.includes(".webm")) : false

  return (
    <form onSubmit={handleSubmit} className="border-t satine-border bg-card">
      {/* GIF preview */}
      {gifUrl && (
        <div className="px-3 pt-3 pb-1">
          <div className="relative inline-block rounded-lg overflow-hidden border satine-border max-w-[200px]">
            {gifIsVideo ? (
              <video src={gifUrl} muted autoPlay loop playsInline className="w-full h-auto max-h-[120px] object-cover" />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={gifUrl} alt="GIF" className="w-full h-auto max-h-[120px] object-cover" referrerPolicy="no-referrer" />
            )}
            <button
              type="button"
              onClick={() => setGifUrl(null)}
              className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black/90 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-end gap-2 p-3">
        {/* Emoji & GIF buttons */}
        <div className="flex items-center gap-0.5 shrink-0 mb-1.5">
          <EmojiPickerButton onEmojiSelect={handleEmojiSelect} />
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowGifPicker(!showGifPicker)}
              disabled={!!gifUrl}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 disabled:opacity-40"
              title={gifUrl ? "1 GIF max" : "GIF"}
            >
              <ImageIcon className="h-4 w-4" />
            </button>
            {showGifPicker && (
              <GifPicker onSelect={handleGifSelect} onClose={() => setShowGifPicker(false)} />
            )}
          </div>
        </div>

        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-xl border satine-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[rgba(61,184,160,0.30)] max-h-32 overflow-y-auto"
          style={{ minHeight: "42px" }}
        />
        <button
          type="submit"
          disabled={disabled || (!value.trim() && !gifUrl)}
          className="h-[42px] w-[42px] rounded-xl bg-gradient-to-br from-[#e8a840] via-[#e07850] to-[#3db8a0] flex items-center justify-center text-white hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </form>
  )
}
