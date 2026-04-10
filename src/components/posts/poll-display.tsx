"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { votePoll } from "@/actions/polls";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface PollOption {
  id: string;
  text: string;
  order: number;
  _count: { votes: number };
}

interface PollData {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  userVotedOptionId: string | null;
}

interface PollDisplayProps {
  poll: PollData;
  postSlug: string;
  isAuthenticated: boolean;
}

export function PollDisplay({ poll, postSlug, isAuthenticated }: PollDisplayProps) {
  const t = useTranslations("polls");
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [options, setOptions] = useState(poll.options);
  const [totalVotes, setTotalVotes] = useState(poll.totalVotes);
  const [userVotedOptionId, setUserVotedOptionId] = useState(poll.userVotedOptionId);

  const hasVoted = userVotedOptionId !== null;

  function handleVote(optionId: string) {
    if (!isAuthenticated) {
      toast({
        title: t("loginRequired"),
        description: t("mustBeLoggedIn"),
        variant: "destructive",
      });
      return;
    }

    if (hasVoted) return;

    // Optimistic update
    setUserVotedOptionId(optionId);
    setTotalVotes((prev) => prev + 1);
    setOptions((prev) =>
      prev.map((o) =>
        o.id === optionId
          ? { ...o, _count: { votes: o._count.votes + 1 } }
          : o
      )
    );

    startTransition(async () => {
      const result = await votePoll(optionId, postSlug);
      if (!result.success) {
        // Revert optimistic update
        setUserVotedOptionId(poll.userVotedOptionId);
        setTotalVotes(poll.totalVotes);
        setOptions(poll.options);
        toast({
          title: t("error"),
          description: result.error,
          variant: "destructive",
        });
      }
    });
  }

  const maxVotes = Math.max(...options.map((o) => o._count.votes), 1);

  return (
    <div className="rounded-xl border border-[rgba(224,120,80,0.25)] bg-[rgba(20,10,35,0.60)] backdrop-blur-md p-5 space-y-4">
      {/* Question */}
      <h3 className="font-semibold text-base text-[rgba(240,230,255,0.95)] post-text">
        {poll.question}
      </h3>

      {/* Options */}
      <div className="space-y-2.5">
        {options.map((option) => {
          const percentage =
            totalVotes > 0
              ? Math.round((option._count.votes / totalVotes) * 100)
              : 0;
          const isUserChoice = userVotedOptionId === option.id;

          if (hasVoted) {
            // Results view
            return (
              <div key={option.id} className="relative">
                <div
                  className="absolute inset-0 rounded-lg opacity-30"
                  style={{
                    width: `${percentage}%`,
                    background:
                      "linear-gradient(90deg, #e8a840, #e07850)",
                    transition: "width 0.5s ease-out",
                  }}
                />
                <div
                  className={cn(
                    "relative flex items-center justify-between rounded-lg px-4 py-2.5 border transition-colors",
                    isUserChoice
                      ? "border-[#e8a840] bg-[rgba(232,168,64,0.08)]"
                      : "border-[rgba(224,120,80,0.20)] bg-transparent"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {isUserChoice && (
                      <Check className="h-4 w-4 text-[#e8a840] shrink-0" />
                    )}
                    <span
                      className={cn(
                        "text-sm",
                        isUserChoice
                          ? "text-white font-medium"
                          : "text-[rgba(240,230,255,0.80)]"
                      )}
                    >
                      {option.text}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-[rgba(240,230,255,0.70)] tabular-nums shrink-0 ml-3">
                    {percentage}% ({option._count.votes})
                  </span>
                </div>
              </div>
            );
          }

          // Voting view
          return (
            <button
              key={option.id}
              type="button"
              disabled={isPending}
              onClick={() => handleVote(option.id)}
              className={cn(
                "w-full text-left rounded-lg px-4 py-2.5 border transition-all text-sm",
                "border-[rgba(224,120,80,0.30)] bg-[rgba(75,35,120,0.15)]",
                "hover:border-[#e8a840] hover:bg-[rgba(232,168,64,0.08)]",
                "text-[rgba(240,230,255,0.85)] hover:text-white",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {option.text}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          {totalVotes} {totalVotes === 1 ? t("vote") : t("votePlural")}
        </span>
        {hasVoted && (
          <>
            <span className="text-border">·</span>
            <span className="text-[#e8a840]">{t("youVoted")}</span>
          </>
        )}
      </div>
    </div>
  );
}
