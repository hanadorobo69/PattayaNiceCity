import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/actions/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarLightbox } from "@/components/ui/avatar-lightbox";
import { KarmaProgress } from "@/components/ui/karma-badge";
import { AdminBadge } from "@/components/ui/admin-badge";
import { ProfileEditForm } from "@/components/profile/profile-edit-form";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { formatRelativeDate } from "@/lib/utils";
import { CalendarDays, MessageSquare, FileText, BadgeCheck, Crown, Globe } from "lucide-react";
import { ChatButton } from "@/components/messages/chat-button";
import { ProfileActions } from "@/components/profile/profile-actions";
import { getCountryName } from "@/lib/countries";
import { getTranslations, getLocale } from "next-intl/server";
import { getUserVenueFavorites } from "@/actions/venue-favorites";
import { signOut, deleteAccount } from "@/actions/auth";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await prisma.profile.findUnique({ where: { username } });
  if (!profile) return { title: "Profile not found" };
  return {
    title: `${profile.displayName || profile.username}`,
    description: profile.bio || `${profile.username}'s profile on Pattaya Nice City`,
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const t = await getTranslations("profile");
  const locale = await getLocale();

  const [profile, currentUserResult] = await Promise.all([
    prisma.profile.findUnique({
      where: { username },
      include: { _count: { select: { posts: { where: { deletedAt: null } }, comments: { where: { deletedAt: null } } } } },
    }),
    getCurrentUser(),
  ]);

  if (!profile) notFound();

  const isOwnProfile = currentUserResult.success && currentUserResult.data?.id === profile.id;

  const [posts, postComments, venueComments, likedVotes, venueFavorites, notifications] = await Promise.all([
    prisma.post.findMany({
      where: { authorId: profile.id, deletedAt: null },
      select: {
        slug: true,
        title: true,
        createdAt: true,
        score: true,
        _count: { select: { comments: { where: { deletedAt: null } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.comment.findMany({
      where: { authorId: profile.id, deletedAt: null },
      select: {
        id: true,
        content: true,
        score: true,
        createdAt: true,
        post: { select: { slug: true, title: true } },
        _count: { select: { replies: { where: { deletedAt: null } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.venueComment.findMany({
      where: { authorId: profile.id, deletedAt: null },
      select: {
        id: true,
        content: true,
        score: true,
        createdAt: true,
        venue: { select: { slug: true, name: true } },
        _count: { select: { replies: { where: { deletedAt: null } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    // Liked posts (upvotes by this user)
    prisma.vote.findMany({
      where: { userId: profile.id, value: 1 },
      select: {
        createdAt: true,
        post: {
          select: {
            slug: true,
            title: true,
            createdAt: true,
            score: true,
            _count: { select: { comments: { where: { deletedAt: null } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    getUserVenueFavorites(profile.id),
    // Notifications (own profile only)
    isOwnProfile
      ? prisma.notification.findMany({
          where: { recipientId: profile.id },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            actor: { select: { username: true, displayName: true, avatarUrl: true } },
            post: { select: { slug: true, title: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  // Merge post comments + venue comments into a unified list
  const comments = [
    ...postComments.map(c => ({
      id: c.id,
      content: c.content,
      score: c.score,
      createdAt: c.createdAt.toISOString(),
      targetType: "post" as const,
      targetSlug: c.post.slug,
      targetTitle: c.post.title,
      linkHref: `/post/${c.post.slug}?comment=${c.id}`,
      replyCount: c._count.replies,
    })),
    ...venueComments.map(c => ({
      id: c.id,
      content: c.content,
      score: c.score,
      createdAt: c.createdAt.toISOString(),
      targetType: "spot" as const,
      targetSlug: c.venue.slug,
      targetTitle: c.venue.name,
      linkHref: `/places/${c.venue.slug}?comment=${c.id}#reviews`,
      replyCount: c._count.replies,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const initials = (profile.displayName || profile.username)
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const karma = profile.karma ?? 0;

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="rounded-2xl border satine-border bg-card p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
          <div className="relative shrink-0">
            <AvatarLightbox src={profile.avatarUrl} alt={profile.username}>
              <Avatar className="h-20 w-20 ring-2 ring-[rgba(232,168,64,0.20)]">
                <AvatarImage src={profile.avatarUrl || undefined} alt={profile.username} />
                <AvatarFallback className="text-xl bg-[rgba(232,168,64,0.10)] text-primary font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </AvatarLightbox>
            {profile.isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1">
                <BadgeCheck className="h-3.5 w-3.5 text-white" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-3 text-center sm:text-left w-full">
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h1 className={`text-xl sm:text-2xl font-bold ${profile.isAdmin ? "bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent" : ""}`}>
                  {profile.displayName || profile.username}
                </h1>
                {profile.isVerified && (
                  <span className="text-xs text-primary font-medium flex items-center gap-0.5">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified
                  </span>
                )}
                {profile.isAdmin && <AdminBadge />}
              </div>
              <p className="text-muted-foreground text-sm">@{profile.username}</p>
            </div>

            {profile.bio && (
              <p className="text-sm leading-relaxed max-w-lg text-muted-foreground">{profile.bio}</p>
            )}

            <div className="flex items-center justify-center sm:justify-start gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {t("postCount", { count: profile._count.posts })}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                {t("commentCount", { count: comments.length })}
              </span>
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {t("joined", { time: formatRelativeDate(profile.createdAt, locale) })}
              </span>
              {profile.nationality && (
                <span className="flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" />
                  {getCountryName(profile.nationality)}
                </span>
              )}
            </div>

            {!profile.isAdmin && (
              <div className="pt-1 max-w-xs mx-auto sm:mx-0">
                <KarmaProgress karma={karma} />
              </div>
            )}

            {isOwnProfile ? (
              <div className="pt-2 flex flex-col sm:flex-row items-center sm:items-start gap-2">
                <ProfileEditForm
                  profile={{
                    displayName: profile.displayName,
                    bio: profile.bio,
                    avatarUrl: profile.avatarUrl,
                    dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.toISOString().split("T")[0] : null,
                    nationality: profile.nationality,
                    residentType: profile.residentType,
                  }}
                />
                <ProfileActions signOutAction={signOut} deleteAccountAction={deleteAccount} isAdmin={profile.isAdmin} />
              </div>
            ) : currentUserResult.success && currentUserResult.data && (
              <div className="pt-1 flex justify-center sm:justify-start">
                <ChatButton recipientId={profile.id} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Posts & Comments Tabs */}
      <ProfileTabs
        posts={posts.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }))}
        comments={comments}
        likedPosts={likedVotes.map((v) => ({
          votedAt: v.createdAt.toISOString(),
          post: { ...v.post, createdAt: v.post.createdAt.toISOString() },
        }))}
        venueFavorites={venueFavorites.map((f) => ({
          id: f.id,
          createdAt: f.createdAt.toISOString(),
          venue: {
            slug: f.venue.slug,
            name: f.venue.name,
            imageUrl: f.venue.imageUrl,
            category: f.venue.category,
            _count: f.venue._count,
          },
        }))}
        notifications={notifications.map((n: any) => ({
          id: n.id,
          type: n.type,
          read: n.read,
          createdAt: n.createdAt.toISOString(),
          actor: n.actor,
          post: n.post,
        }))}
        isOwnProfile={isOwnProfile}
        username={profile.username}
      />
    </div>
  );
}
