"use client"

import { useState, useEffect, useCallback } from "react"
import { Link } from "@/i18n/navigation"
import Image from "next/image"
import { MessageCircle } from "lucide-react"
import { formatRelativeDate } from "@/lib/utils"

interface ConversationItem {
  conversationId: string
  otherUser: { id: string; username: string; displayName?: string | null; avatarUrl?: string | null } | null
  lastMessage: { content: string; senderId: string; senderName: string; createdAt: string } | null
  lastReadAt: string
  updatedAt: string
}

interface ConversationListProps {
  initialConversations: ConversationItem[]
  currentUserId: string
}

export function ConversationList({ initialConversations, currentUserId }: ConversationListProps) {
  const [conversations] = useState(initialConversations)

  // Calculate unread for each conversation
  function isUnread(convo: ConversationItem) {
    if (!convo.lastMessage) return false
    if (convo.lastMessage.senderId === currentUserId) return false
    return new Date(convo.lastMessage.createdAt) > new Date(convo.lastReadAt)
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/30" />
        <p className="text-muted-foreground">No conversations yet</p>
        <p className="text-xs text-muted-foreground/70">Visit someone&apos;s profile and click &quot;Message&quot; to start a chat.</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border">
      {conversations.map((convo) => {
        const other = convo.otherUser
        if (!other) return null
        const unread = isUnread(convo)
        const displayName = other.displayName || other.username

        return (
          <Link
            key={convo.conversationId}
            href={`/messages/${convo.conversationId}`}
            className={`flex items-center gap-3 px-4 py-3 hover:bg-[rgba(224,120,80,0.06)] transition-colors ${
              unread ? "bg-[rgba(232,168,64,0.04)]" : ""
            }`}
          >
            {/* Avatar */}
            <div className="h-11 w-11 rounded-full overflow-hidden bg-muted shrink-0">
              {other.avatarUrl ? (
                <Image src={other.avatarUrl} alt={displayName} width={44} height={44} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-lg font-bold text-muted-foreground bg-gradient-to-br from-[rgba(224,120,80,0.20)] to-[rgba(61,184,160,0.20)]">
                  {displayName[0]?.toUpperCase()}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className={`text-sm truncate ${unread ? "font-bold text-foreground" : "font-medium text-foreground/90"}`}>
                  {displayName}
                </span>
                {convo.lastMessage && (
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                    {formatRelativeDate(new Date(convo.lastMessage.createdAt))}
                  </span>
                )}
              </div>
              {convo.lastMessage && (
                <p className={`text-xs truncate mt-0.5 ${unread ? "text-foreground/80 font-medium" : "text-muted-foreground"}`}>
                  {convo.lastMessage.senderId === currentUserId ? "You: " : ""}
                  {convo.lastMessage.content.replace(/\[gif\]\([^)]+\)/g, "[gif]")}
                </p>
              )}
            </div>

            {/* Unread indicator */}
            {unread && (
              <div className="h-2.5 w-2.5 rounded-full bg-[#e8a840] shrink-0 shadow-[0_0_6px_rgba(232,168,64,0.5)]" />
            )}
          </Link>
        )
      })}
    </div>
  )
}
