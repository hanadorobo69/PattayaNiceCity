"use client";

import { useOptimistic, useTransition } from "react";
import { useTranslations } from "next-intl";
import { voteOnPost } from "@/actions/votes";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import type { VoteValue } from "@/types";

interface VoteButtonsProps {
  postId: string;
  initialScore: number;
  initialVote: VoteValue | null;
  isAuthenticated: boolean;
  vertical?: boolean;
}

interface VoteState {
  score: number;
  userVote: VoteValue | null;
}

export function VoteButtons({
  postId,
  initialScore,
  initialVote,
  isAuthenticated,
  vertical = false,
}: VoteButtonsProps) {
  const { toast } = useToast();
  const t = useTranslations("votes");
  const [isPending, startTransition] = useTransition();

  const [optimisticState, updateOptimistic] = useOptimistic<VoteState, VoteValue>(
    { score: initialScore, userVote: initialVote },
    (state, newValue) => {
      if (state.userVote === newValue) {
        return { score: state.score - newValue, userVote: null };
      } else if (state.userVote !== null) {
        return { score: state.score + (newValue - state.userVote), userVote: newValue };
      } else {
        return { score: state.score + newValue, userVote: newValue };
      }
    }
  );

  function handleVote(value: VoteValue) {
    if (!isAuthenticated) {
      toast({
        title: t("loginRequired"),
        description: t("mustBeLoggedIn"),
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      updateOptimistic(value);
      const result = await voteOnPost(postId, value);
      if (!result.success) {
        toast({ title: t("error"), description: result.error, variant: "destructive" });
      }
    });
  }

  const upClass = cn(
    vertical ? "h-7 w-7" : "h-8 w-8",
    optimisticState.userVote === 1
      ? "text-[#e8a840] bg-[rgba(232,168,64,0.15)] hover:bg-[rgba(232,168,64,0.25)] hover:text-[#e8a840]"
      : "text-[rgba(183,148,212,0.50)] hover:text-[#e8a840] hover:bg-[rgba(232,168,64,0.08)]"
  )
  const downClass = cn(
    vertical ? "h-7 w-7" : "h-8 w-8",
    optimisticState.userVote === -1
      ? "text-[#3db8a0] bg-[rgba(61,184,160,0.15)] hover:bg-[rgba(61,184,160,0.25)] hover:text-[#3db8a0]"
      : "text-[rgba(183,148,212,0.50)] hover:text-[#3db8a0] hover:bg-[rgba(61,184,160,0.08)]"
  )
  const scoreClass = cn(
    "font-bold tabular-nums leading-none",
    vertical ? "text-sm" : "text-sm min-w-[2rem] text-center",
    optimisticState.score > 0 && "text-[#e8a840]",
    optimisticState.score < 0 && "text-[#3db8a0]",
    optimisticState.score === 0 && "text-[rgba(183,148,212,0.50)]"
  )

  if (vertical) {
    return (
      <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
        <Button variant="ghost" size="icon" className={upClass} onClick={() => handleVote(1)} disabled={isPending} aria-label="Upvote">
          <ChevronUp className="h-4 w-4" />
        </Button>
        <span className={scoreClass}>{optimisticState.score}</span>
        <Button variant="ghost" size="icon" className={downClass} onClick={() => handleVote(-1)} disabled={isPending} aria-label="Downvote">
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className={upClass} onClick={() => handleVote(1)} disabled={isPending} aria-label="Upvote">
        <ChevronUp className="h-5 w-5" />
      </Button>
      <span className={scoreClass}>{optimisticState.score}</span>
      <Button variant="ghost" size="icon" className={downClass} onClick={() => handleVote(-1)} disabled={isPending} aria-label="Downvote">
        <ChevronDown className="h-5 w-5" />
      </Button>
    </div>
  );
}
