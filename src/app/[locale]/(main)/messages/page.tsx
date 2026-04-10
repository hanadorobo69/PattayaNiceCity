import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getCurrentUserId } from "@/lib/auth/session"
import { getConversationsForUser } from "@/lib/messages"
import { ConversationList } from "@/components/messages/conversation-list"
import { MessageCircle } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Messages - Pattaya Nice City",
  description: "Your conversations on Pattaya Nice City.",
}

export default async function MessagesPage() {
  const userId = await getCurrentUserId()
  if (!userId) redirect("/login")

  const conversations = await getConversationsForUser(userId)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-orbitron)] flex items-center gap-3">
          <MessageCircle className="h-6 w-6 text-[#3db8a0]" />
          <span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">Messages</span>
        </h1>
      </div>

      <div className="rounded-2xl border satine-border bg-card overflow-hidden">
        <ConversationList initialConversations={conversations} currentUserId={userId} />
      </div>
    </div>
  )
}
