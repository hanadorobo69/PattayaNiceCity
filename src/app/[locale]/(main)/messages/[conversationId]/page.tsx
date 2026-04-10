import { redirect, notFound } from "next/navigation"
import { Link } from "@/i18n/navigation"
import Image from "next/image"
import { getCurrentUserId } from "@/lib/auth/session"
import { getMessagesForConversation } from "@/lib/messages"
import { markConversationRead } from "@/actions/messages"
import { ChatWindow } from "@/components/messages/chat-window"
import { prisma } from "@/lib/prisma"
import { ArrowLeft } from "lucide-react"

export const dynamic = "force-dynamic"

interface ChatPageProps {
  params: Promise<{ conversationId: string }>
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { conversationId } = await params
  const userId = await getCurrentUserId()
  if (!userId) redirect("/login")

  // Get conversation with other participant
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_profileId: { conversationId, profileId: userId } },
    include: {
      conversation: {
        include: {
          participants: {
            where: { profileId: { not: userId } },
            include: {
              profile: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            },
          },
        },
      },
    },
  })

  if (!participant) notFound()

  const otherUser = participant.conversation.participants[0]?.profile
  if (!otherUser) notFound()

  // Fetch messages
  const data = await getMessagesForConversation(conversationId, userId)
  if (!data) notFound()

  // Mark as read (non-blocking, don't crash page if it fails)
  try { await markConversationRead(conversationId) } catch {}

  const displayName = otherUser.displayName || otherUser.username

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100dvh-10rem)] md:h-[calc(100dvh-8rem)]">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-t-2xl border satine-border bg-card">
        <Link href="/messages" className="text-muted-foreground hover:text-[#3db8a0] transition-colors lg:hidden">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Link href={`/profile/${otherUser.username}`} className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-9 w-9 rounded-full overflow-hidden bg-muted shrink-0">
            {otherUser.avatarUrl ? (
              <Image src={otherUser.avatarUrl} alt={displayName} width={36} height={36} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-sm font-bold text-muted-foreground bg-gradient-to-br from-[rgba(224,120,80,0.20)] to-[rgba(61,184,160,0.20)]">
                {displayName[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{displayName}</p>
            <p className="text-[10px] text-muted-foreground">@{otherUser.username}</p>
          </div>
        </Link>
      </div>

      {/* Chat window */}
      <div className="flex-1 border-x satine-border bg-background overflow-hidden">
        <ChatWindow
          conversationId={conversationId}
          currentUserId={userId}
          initialMessages={data.messages}
        />
      </div>
    </div>
  )
}
