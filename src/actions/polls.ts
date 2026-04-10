"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import type { ActionResult } from "@/types";

interface PollVoteResult {
  options: { id: string; _count: { votes: number } }[];
  totalVotes: number;
  userVotedOptionId: string;
}

export async function votePoll(
  optionId: string,
  postSlug: string
): Promise<ActionResult<PollVoteResult>> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "You must be logged in to vote" };

  // Get the option and its poll (with all sibling options)
  const option = await prisma.pollOption.findUnique({
    where: { id: optionId },
    include: {
      poll: {
        include: {
          options: { select: { id: true } },
        },
      },
    },
  });

  if (!option) return { success: false, error: "Option not found" };

  const poll = option.poll;

  // Check if user already voted on ANY option in this poll
  const allOptionIds = poll.options.map((o) => o.id);
  const existingVote = await prisma.pollVote.findFirst({
    where: {
      userId,
      optionId: { in: allOptionIds },
    },
  });

  if (existingVote) {
    return { success: false, error: "You have already voted on this poll" };
  }

  // Check if poll has ended
  if (poll.endsAt && new Date() > poll.endsAt) {
    return { success: false, error: "This poll has ended" };
  }

  // Create the vote
  await prisma.pollVote.create({
    data: { userId, optionId },
  });

  // Fetch updated counts
  const updatedOptions = await prisma.pollOption.findMany({
    where: { pollId: poll.id },
    select: {
      id: true,
      _count: { select: { votes: true } },
    },
  });

  const totalVotes = updatedOptions.reduce((sum, o) => sum + o._count.votes, 0);

  revalidatePath(`/post/${postSlug}`);
  revalidatePath("/");

  return {
    success: true,
    data: {
      options: updatedOptions,
      totalVotes,
      userVotedOptionId: optionId,
    },
  };
}

export async function getPollByPostId(postId: string) {
  const userId = await getCurrentUserId();

  const poll = await prisma.poll.findUnique({
    where: { postId },
    include: {
      options: {
        orderBy: { order: "asc" },
        include: {
          _count: { select: { votes: true } },
        },
      },
    },
  });

  if (!poll) return null;

  const totalVotes = poll.options.reduce((sum, o) => sum + o._count.votes, 0);

  let userVotedOptionId: string | null = null;
  if (userId) {
    const allOptionIds = poll.options.map((o) => o.id);
    const userVote = await prisma.pollVote.findFirst({
      where: {
        userId,
        optionId: { in: allOptionIds },
      },
    });
    if (userVote) {
      userVotedOptionId = userVote.optionId;
    }
  }

  return {
    id: poll.id,
    question: poll.question,
    endsAt: poll.endsAt,
    options: poll.options.map((o) => ({
      id: o.id,
      text: o.text,
      order: o.order,
      _count: o._count,
    })),
    totalVotes,
    userVotedOptionId,
  };
}
