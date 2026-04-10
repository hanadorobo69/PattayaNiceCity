"use client"

import { useTransition } from "react"
import { useRouter } from "@/i18n/navigation"
import { getOrCreateConversation } from "@/actions/messages"
import { MessageCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ChatButtonProps {
  recipientId: string
}

export function ChatButton({ recipientId }: ChatButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const result = await getOrCreateConversation(recipientId)
      if (result.success) {
        router.push(`/messages/${result.data.conversationId}`)
      }
    })
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isPending}
      variant="outline"
      size="sm"
      className="gap-2 border-[rgba(61,184,160,0.30)] text-[#3db8a0] hover:bg-[rgba(61,184,160,0.10)]"
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
      Message
    </Button>
  )
}
