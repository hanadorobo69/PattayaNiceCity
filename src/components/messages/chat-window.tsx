"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { sendMessage, markConversationRead } from "@/actions/messages"
import { MessageInput } from "./message-input"
import Image from "next/image"

const GIF_REGEX = /\[gif\]\(([^)]+)\)/

interface MessageData {
  id: string
  content: string
  senderId: string
  sender: { id: string; username: string; displayName?: string | null; avatarUrl?: string | null }
  createdAt: string
}

interface ChatWindowProps {
  conversationId: string
  currentUserId: string
  initialMessages: MessageData[]
}

function MessageContent({ content }: { content: string }) {
  const gifMatch = content.match(GIF_REGEX)
  const textContent = content.replace(GIF_REGEX, "").trim()
  const gifUrl = gifMatch?.[1]
  const gifIsVideo = gifUrl ? (gifUrl.includes(".mp4") || gifUrl.includes(".webm")) : false

  return (
    <>
      {textContent && <p className="whitespace-pre-wrap break-words">{textContent}</p>}
      {gifUrl && (
        <div className={`rounded-lg overflow-hidden max-w-[240px] ${textContent ? "mt-1.5" : ""}`}>
          {gifIsVideo ? (
            <video src={gifUrl} muted autoPlay loop playsInline className="w-full h-auto max-h-[200px] object-contain" />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={gifUrl} alt="GIF" className="w-full h-auto max-h-[200px] object-contain" referrerPolicy="no-referrer" />
          )}
        </div>
      )}
    </>
  )
}

export function ChatWindow({ conversationId, currentUserId, initialMessages }: ChatWindowProps) {
  const [messages, setMessages] = useState<MessageData[]>(initialMessages)
  const sendingRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastTimestampRef = useRef<string>(
    initialMessages.length > 0 ? initialMessages[initialMessages.length - 1].createdAt : new Date().toISOString()
  )

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages.length, scrollToBottom])

  // Poll for new messages every 3 seconds
  useEffect(() => {
    const poll = async () => {
      if (document.visibilityState !== "visible") return
      try {
        const res = await fetch(`/api/messages?conversationId=${conversationId}&after=${encodeURIComponent(lastTimestampRef.current)}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.messages && data.messages.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id))
            const newMsgs = data.messages.filter((m: MessageData) => !existingIds.has(m.id))
            if (newMsgs.length === 0) return prev
            lastTimestampRef.current = newMsgs[newMsgs.length - 1].createdAt
            return [...prev, ...newMsgs]
          })
          // Mark as read when new messages arrive from others
          const hasOtherMessages = data.messages.some((m: MessageData) => m.senderId !== currentUserId)
          if (hasOtherMessages) markConversationRead(conversationId)
        }
      } catch {}
    }

    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [conversationId, currentUserId])

  async function handleSend(content: string) {
    // Guard against double sends
    if (sendingRef.current) return
    sendingRef.current = true

    // Optimistic update
    const tempId = `temp-${Date.now()}`
    const optimistic: MessageData = {
      id: tempId,
      content,
      senderId: currentUserId,
      sender: { id: currentUserId, username: "", displayName: null, avatarUrl: null },
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    lastTimestampRef.current = optimistic.createdAt

    try {
      const fd = new FormData()
      fd.set("conversationId", conversationId)
      fd.set("content", content)
      const result = await sendMessage(fd)

      if (result.success && result.data) {
        // Replace temp ID with real server ID so polling dedup works
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, id: result.data!.messageId } : m))
        )
      } else {
        // Remove optimistic on failure
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
      }
    } finally {
      sendingRef.current = false
    }
  }

  // Group messages by date
  let lastDate = ""

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {messages.map((msg) => {
          const isOwn = msg.senderId === currentUserId
          const msgDate = new Date(msg.createdAt)
          const dateStr = msgDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
          const timeStr = msgDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
          let showDateSep = false
          if (dateStr !== lastDate) {
            showDateSep = true
            lastDate = dateStr
          }

          return (
            <div key={msg.id}>
              {showDateSep && (
                <div className="flex items-center justify-center my-3">
                  <span className="text-[10px] text-muted-foreground bg-card border satine-border rounded-full px-3 py-0.5">
                    {dateStr}
                  </span>
                </div>
              )}
              <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1`}>
                <div className="flex items-end gap-2 max-w-[75%]">
                  {!isOwn && (
                    <div className="h-7 w-7 rounded-full overflow-hidden bg-muted shrink-0 mb-0.5">
                      {msg.sender.avatarUrl ? (
                        <Image src={msg.sender.avatarUrl} alt="" width={28} height={28} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground font-bold">
                          {(msg.sender.displayName || msg.sender.username)?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      isOwn
                        ? "bg-gradient-to-br from-[rgba(232,168,64,0.15)] to-[rgba(224,120,80,0.15)] border border-[rgba(232,168,64,0.25)]"
                        : "bg-card border satine-border"
                    }`}
                  >
                    <MessageContent content={msg.content} />
                    <p className={`text-[10px] mt-1 ${isOwn ? "text-[rgba(232,168,64,0.50)]" : "text-muted-foreground/50"}`}>
                      {timeStr}
                      {isOwn && <span className="ml-1.5">✓</span>}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Input bar */}
      <MessageInput onSend={handleSend} />
    </div>
  )
}
