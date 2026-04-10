import { redirect } from "next/navigation"
import { Link } from "@/i18n/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Shield, Users, FileText, MapPin, BadgeCheck, Eye, TrendingUp, MessageSquare, Crown, Video, Bell, Mail, AtSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatRelativeDate } from "@/lib/utils"
import { getTranslations, getLocale } from "next-intl/server"

export const metadata = { title: "Admin - Pattaya Nice City" }

export default async function AdminPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const profile = await prisma.profile.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  })
  if (!profile?.isAdmin) redirect("/")

  const [
    userCount,
    postCount,
    venueCount,
    pendingVerifications,
    recentPosts,
    recentUsers,
    pageViews7d,
    pageViewsToday,
    unreadContacts,
    adminNotifications,
  ] = await Promise.all([
    prisma.profile.count(),
    prisma.post.count(),
    prisma.venue.count(),
    prisma.verificationRequest.count({ where: { status: "pending" } }),
    prisma.post.findMany({
      take: 5, orderBy: { createdAt: "desc" },
      include: { author: { select: { id: true, username: true, displayName: true, avatarUrl: true } }, category: true },
    }),
    prisma.profile.findMany({ take: 5, orderBy: { createdAt: "desc" }, select: { id: true, username: true, displayName: true, avatarUrl: true, createdAt: true, isAdmin: true } }),
    prisma.pageView.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.pageView.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
    prisma.contactMessage.findMany({
      where: { read: false },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.notification.findMany({
      where: { recipientId: session.user.id, read: false },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        actor: { select: { username: true, displayName: true, avatarUrl: true } },
        post: { select: { title: true, slug: true } },
      },
    }),
  ])

  const t = await getTranslations("adminDashboard")
  const locale = await getLocale()

  const stats = [
    { label: t("totalUsers"),   value: userCount,              icon: Users,        color: "text-blue-400" },
    { label: t("totalPosts"),   value: postCount,              icon: FileText,     color: "text-purple-400" },
    { label: t("spots"),          value: venueCount,             icon: MapPin,       color: "text-green-400" },
    { label: t("viewsToday"),   value: pageViewsToday,         icon: Eye,          color: "text-rose-400" },
    { label: t("pendingVerif"), value: pendingVerifications,   icon: BadgeCheck,   color: "text-yellow-400" },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-[rgba(232,168,64,0.10)] flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold font-[family-name:var(--font-orbitron)]"><span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">{t("title")}</span></h1>
          <p className="text-muted-foreground text-sm">{t("siteManagement")}</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border satine-border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{label}</p>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Notifications */}
      {(unreadContacts.length > 0 || adminNotifications.length > 0) && (
        <div className="rounded-xl border border-[rgba(232,168,64,0.20)] bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Bell className="h-4 w-4 text-[#e8a840]" />
            {t("notifications")}
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-[rgba(232,168,64,0.15)] text-[#e8a840] font-bold">
              {unreadContacts.length + adminNotifications.length}
            </span>
          </h2>

          {/* Unread contact messages */}
          {unreadContacts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Mail className="h-3 w-3" /> {t("contactMessages")}</p>
              {unreadContacts.map((msg) => (
                <div key={msg.id} className="flex items-start gap-3 p-3 rounded-lg bg-[rgba(232,168,64,0.05)] border border-[rgba(232,168,64,0.10)]">
                  <Mail className="h-4 w-4 text-[rgba(232,168,64,0.6)] shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{msg.subject}</p>
                    <p className="text-xs text-muted-foreground">{msg.name} · {msg.email} · {formatRelativeDate(msg.createdAt, locale)}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{msg.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Admin mentions */}
          {adminNotifications.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5"><AtSign className="h-3 w-3" /> {t("mentions")}</p>
              {adminNotifications.map((notif) => (
                <div key={notif.id} className="flex items-start gap-3 p-3 rounded-lg bg-[rgba(224,120,80,0.05)] border border-[rgba(224,120,80,0.10)]">
                  <AtSign className="h-4 w-4 text-[#e07850] shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium text-[#e8a840]">@{notif.actor.username}</span>
                      {" "}{notif.type === "mention_post" ? t("mentionedYouInPost") : notif.type === "reply" ? t("repliedToYou") : t("mentionedYou")}
                      {notif.post && (
                        <Link href={`/post/${notif.post.slug}`} className="text-primary hover:underline ml-1">
                          {notif.post.title}
                        </Link>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatRelativeDate(notif.createdAt, locale)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent posts */}
        <div className="rounded-xl border satine-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-[rgba(232,168,64,0.60)]" />
              {t("recentPosts")}
            </h2>
            <Link href="/admin/posts" className="text-xs text-primary hover:underline">{t("viewAll")}</Link>
          </div>
          <div className="space-y-3">
            {recentPosts.map((post) => (
              <div key={post.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/post/${post.slug}`} className="text-sm font-medium hover:text-primary truncate block">
                    {post.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    by {post.author.username} · {formatRelativeDate(post.createdAt, locale)}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                  {post.category.icon}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent users */}
        <div className="rounded-xl border satine-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-[rgba(232,168,64,0.60)]" />
              {t("newMembers")}
            </h2>
          </div>
          <div className="space-y-3">
            {recentUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{user.displayName || user.username}</p>
                  <p className="text-xs text-muted-foreground">@{user.username} · {formatRelativeDate(user.createdAt, locale)}</p>
                </div>
                <div className="flex gap-1">
                  {user.isVerified && <span className="text-xs text-primary">{t("verified")}</span>}
                  {user.isAdmin && <span className="text-xs text-yellow-400">{t("admin")}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending verifications */}
      {pendingVerifications > 0 && (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BadgeCheck className="h-5 w-5 text-yellow-400" />
            <div>
              <p className="font-medium text-sm">{t("pendingVerification", { count: pendingVerifications })}</p>
              <p className="text-xs text-muted-foreground">{t("venueOwnersWaiting")}</p>
            </div>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link href="/admin/verifications">{t("review")}</Link>
          </Button>
        </div>
      )}

      {/* Quick links */}
      <div className="flex gap-3 flex-wrap">
        <Link href="/admin/users"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-[#e8a840] to-[#e07850] text-white shadow-[0_0_18px_rgba(232,168,64,0.4)] transition-all hover:shadow-[0_0_24px_rgba(232,168,64,0.5)]">
          <Users className="h-4 w-4" />
          Manage Users
        </Link>
        <Link href="/admin/analytics"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-[#e8a840] to-[#e07850] text-white shadow-[0_0_18px_rgba(232,168,64,0.4)] transition-all hover:shadow-[0_0_24px_rgba(232,168,64,0.5)]">
          <TrendingUp className="h-4 w-4" />
          {t("analytics")}
        </Link>
        <Link href="/admin/posts"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-[#e8a840] to-[#e07850] text-white shadow-[0_0_18px_rgba(232,168,64,0.4)] transition-all hover:shadow-[0_0_24px_rgba(232,168,64,0.5)]">
          <FileText className="h-4 w-4" />
          {t("managePosts")}
        </Link>
        <Link href="/admin/comments"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-[#e8a840] to-[#e07850] text-white shadow-[0_0_18px_rgba(232,168,64,0.4)] transition-all hover:shadow-[0_0_24px_rgba(232,168,64,0.5)]">
          <MessageSquare className="h-4 w-4" />
          {t("manageComments")}
        </Link>
        <Link href="/admin/venues"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-[#e8a840] to-[#e07850] text-white shadow-[0_0_18px_rgba(232,168,64,0.4)] transition-all hover:shadow-[0_0_24px_rgba(232,168,64,0.5)]">
          <MapPin className="h-4 w-4" />
          {t("manageSpots")}
        </Link>
        <Link href="/admin/vlogs"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-[#e8a840] to-[#e07850] text-white shadow-[0_0_18px_rgba(232,168,64,0.4)] transition-all hover:shadow-[0_0_24px_rgba(232,168,64,0.5)]">
          <Video className="h-4 w-4" />
          Manage Blog
        </Link>
        <Link href="/admin/admins"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-[#e8a840] to-[#e07850] text-white shadow-[0_0_18px_rgba(232,168,64,0.4)] transition-all hover:shadow-[0_0_24px_rgba(232,168,64,0.5)]">
          <Crown className="h-4 w-4" />
          {t("manageAdmins")}
        </Link>
      </div>
    </div>
  )
}
