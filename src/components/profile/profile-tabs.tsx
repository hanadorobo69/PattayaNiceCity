"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { Link } from "@/i18n/navigation"
import { useRouter } from "@/i18n/navigation"
import { formatRelativeDate } from "@/lib/utils"
import { MessageSquare, FileText, Heart, ChevronUp, ArrowUpDown, Star, MapPin, Bell } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"

interface PostItem {
  slug: string
  title: string
  createdAt: string | Date
  score: number
  _count: { comments: number }
}

interface CommentItem {
  id: string
  content: string
  score: number
  createdAt: string | Date
  targetType: "post" | "spot"
  targetSlug: string
  targetTitle: string
  linkHref: string
  replyCount: number
}

interface LikedPostItem {
  votedAt: string | Date
  post: PostItem
}

interface VenueFavoriteItem {
  id: string
  createdAt: string | Date
  venue: {
    slug: string
    name: string
    imageUrl: string | null
    category: { id: string; name: string; slug: string; color: string; icon: string | null }
    _count: { venueRatings: number; posts: number }
  }
}

interface NotificationItem {
  id: string
  type: string
  read: boolean
  createdAt: string | Date
  actor: { username: string; displayName: string | null; avatarUrl: string | null }
  post: { slug: string; title: string } | null
}

type SortMode = "recent" | "most-upvoted" | "most-commented"
type FavSortMode = "recent" | "name" | "category"

interface ProfileTabsProps {
  posts: PostItem[]
  comments: CommentItem[]
  likedPosts: LikedPostItem[]
  venueFavorites?: VenueFavoriteItem[]
  notifications?: NotificationItem[]
  isOwnProfile?: boolean
  username: string
}

function useSortOptions() {
  const t = useTranslations("profile")
  return [
    { value: "recent" as SortMode, label: t("recent"), icon: <ArrowUpDown className="h-3 w-3" /> },
    { value: "most-upvoted" as SortMode, label: t("mostUpvoted"), icon: <ChevronUp className="h-3 w-3" /> },
    { value: "most-commented" as SortMode, label: t("mostCommented"), icon: <MessageSquare className="h-3 w-3" /> },
  ]
}

function SortPills<T extends string>({ current, onChange, options }: { current: T; onChange: (v: T) => void; options: { value: T; label: string; icon: React.ReactNode }[] }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            current === opt.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-[rgba(75,35,120,0.24)] text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          {opt.icon} {opt.label}
        </button>
      ))}
    </div>
  )
}

type ProfileTab = "favorites" | "posts" | "comments" | "liked" | "notifications"
const VALID_PROFILE_TABS = new Set<string>(["favorites", "posts", "comments", "liked", "notifications"])

function getProfileTabFromHash(): ProfileTab {
  if (typeof window === "undefined") return "favorites"
  const hash = window.location.hash.replace("#", "")
  return VALID_PROFILE_TABS.has(hash) ? (hash as ProfileTab) : "favorites"
}

export function ProfileTabs({ posts, comments, likedPosts, venueFavorites = [], notifications = [], isOwnProfile = false, username }: ProfileTabsProps) {
  const t = useTranslations("profile")
  const tcat = useTranslations("categoryNames")
  const locale = useLocale()
  const router = useRouter()
  const sortOptions = useSortOptions()
  const [notifItems, setNotifItems] = useState(notifications)
  const [tab, setTabState] = useState<ProfileTab>(() => getProfileTabFromHash())

  // Listen to popstate (browser back/forward) to restore tab
  useEffect(() => {
    function onPopState() {
      setTabState(getProfileTabFromHash())
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const tabBarRef = useRef<HTMLDivElement>(null)

  const scrollToTabs = useCallback(() => {
    if (!tabBarRef.current) return
    const y = tabBarRef.current.getBoundingClientRect().top + window.scrollY - 56
    window.scrollTo({ top: y, behavior: "smooth" })
  }, [])

  const setTab = useCallback((t: ProfileTab) => {
    setTabState(t)
    const url = new URL(window.location.href)
    url.hash = t === "favorites" ? "" : t
    window.history.pushState(null, "", url.toString())
    // Always scroll to tabs so content below is visible and centered
    setTimeout(scrollToTabs, 50)
  }, [scrollToTabs])

  const [postSort, setPostSort] = useState<SortMode>("recent")
  const [commentSort, setCommentSort] = useState<SortMode>("recent")
  const [likedSort, setLikedSort] = useState<SortMode>("recent")
  const [favSort, setFavSort] = useState<FavSortMode>("recent")

  const favSortOptions: { value: FavSortMode; label: string; icon: React.ReactNode }[] = [
    { value: "recent", label: t("recent"), icon: <ArrowUpDown className="h-3 w-3" /> },
    { value: "name", label: t("byName"), icon: <MapPin className="h-3 w-3" /> },
    { value: "category", label: t("byCategory"), icon: <Star className="h-3 w-3" /> },
  ]

  const sortedPosts = useMemo(() => {
    const items = [...posts]
    switch (postSort) {
      case "recent":
        return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      case "most-upvoted":
        return items.sort((a, b) => b.score - a.score)
      case "most-commented":
        return items.sort((a, b) => b._count.comments - a._count.comments)
      default:
        return items
    }
  }, [posts, postSort])

  const sortedComments = useMemo(() => {
    const items = [...comments]
    switch (commentSort) {
      case "recent":
        return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      case "most-upvoted":
        return items.sort((a, b) => b.score - a.score)
      case "most-commented":
        return items.sort((a, b) => b.replyCount - a.replyCount)
      default:
        return items
    }
  }, [comments, commentSort])

  const sortedLiked = useMemo(() => {
    const items = [...likedPosts]
    switch (likedSort) {
      case "recent":
        return items.sort((a, b) => new Date(b.votedAt).getTime() - new Date(a.votedAt).getTime())
      case "most-upvoted":
        return items.sort((a, b) => b.post.score - a.post.score)
      case "most-commented":
        return items.sort((a, b) => b.post._count.comments - a.post._count.comments)
      default:
        return items
    }
  }, [likedPosts, likedSort])

  const sortedFavorites = useMemo(() => {
    const items = [...venueFavorites]
    switch (favSort) {
      case "recent":
        return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      case "name":
        return items.sort((a, b) => a.venue.name.localeCompare(b.venue.name))
      case "category":
        return items.sort((a, b) => a.venue.category.name.localeCompare(b.venue.category.name))
      default:
        return items
    }
  }, [venueFavorites, favSort])

  const commentSortOptions = sortOptions

  const unreadCount = notifItems.filter(n => !n.read).length

  const tabs: { key: typeof tab; icon: React.ReactNode; label: string; count: number; badge?: number }[] = [
    { key: "favorites", icon: <Star className="h-4 w-4" />, label: t("favorites"), count: venueFavorites.length },
    { key: "posts", icon: <FileText className="h-4 w-4" />, label: t("posts"), count: posts.length },
    { key: "comments", icon: <MessageSquare className="h-4 w-4" />, label: t("comments"), count: comments.length },
    { key: "liked", icon: <Heart className="h-4 w-4" />, label: t("liked"), count: likedPosts.length },
    ...(isOwnProfile ? [{ key: "notifications" as const, icon: <Bell className="h-4 w-4" />, label: "Mentions", count: notifItems.length, badge: unreadCount }] : []),
  ]

  // Mobile swipe support - attached to document so it works anywhere on the page
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
    }
    function onTouchEnd(e: TouchEvent) {
      const dx = e.changedTouches[0].clientX - touchStartX.current
      const dy = e.changedTouches[0].clientY - touchStartY.current
      if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return
      const currentIdx = tabs.findIndex(t => t.key === tab)
      if (dx < 0 && currentIdx < tabs.length - 1) {
        setTab(tabs[currentIdx + 1].key)
      } else if (dx > 0 && currentIdx > 0) {
        setTab(tabs[currentIdx - 1].key)
      }
    }
    document.addEventListener("touchstart", onTouchStart, { passive: true })
    document.addEventListener("touchend", onTouchEnd, { passive: true })
    return () => {
      document.removeEventListener("touchstart", onTouchStart)
      document.removeEventListener("touchend", onTouchEnd)
    }
  }, [tab, tabs, setTab])


  const activeIndex = tabs.findIndex(t => t.key === tab)

  return (
    <div className="space-y-4">
      {/* Tab buttons - grid, no background wrapper, same style as venue detail tabs */}
      <div ref={tabBarRef}>
        <div
          className={`grid gap-2 ${
            tabs.length === 5 ? "grid-cols-5" : "grid-cols-4"
          }`}
        >
          {tabs.map(({ key, icon, label, count, badge }) => {
            const active = tab === key
            return (
              <button
                key={key}
                data-active={active}
                onClick={() => setTab(key)}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-3 sm:py-3.5 rounded-lg text-sm sm:text-base font-semibold transition-colors duration-200 cursor-pointer outline-none ring-0 focus:outline-none focus:ring-0 ${
                  active
                    ? "bg-gradient-to-r from-[#3db8a0] to-[#e07850] text-white shadow-[0_0_12px_rgba(61,184,160,0.3)]"
                    : "text-muted-foreground hover:text-[#3db8a0] hover:bg-[rgba(61,184,160,0.08)] border border-transparent hover:border-[rgba(61,184,160,0.20)]"
                }`}
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <span className="relative shrink-0">
                  {icon}
                  {badge !== undefined && badge > 0 && (
                    <span className="absolute -top-2 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[#e8a840] text-white text-[9px] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(232,168,64,0.5)]">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </span>
                <span className="hidden sm:inline truncate">{label}</span>
                <span className={`text-[10px] sm:text-xs font-bold sm:ml-auto ${active ? "text-white/80" : "text-muted-foreground/60"}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
        {/* Dot indicators - mobile only */}
        <div className="flex sm:hidden justify-center gap-2 mt-2">
          {tabs.map((t, i) => (
            <div
              key={t.key}
              className={`rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? "w-6 h-2 bg-gradient-to-r from-[#3db8a0] to-[#e07850]"
                  : "w-2 h-2 bg-[rgba(255,255,255,0.2)]"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Favorites tab */}
      <div className="space-y-3" style={{ display: tab === "favorites" ? undefined : "none" }}>
        {venueFavorites.length > 0 && (
          <SortPills current={favSort} onChange={setFavSort} options={favSortOptions} />
        )}
        {venueFavorites.length === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">{t("noFavorites")}</p>
        ) : (
          <div className="space-y-2">
            {sortedFavorites.map(({ venue, createdAt }) => (
              <Link
                key={venue.slug}
                href={`/places/${venue.slug}`}
                className="block rounded-xl border satine-border bg-card p-4 hover:bg-[rgba(75,35,120,0.20)] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-1">
                      {venue.name}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ backgroundColor: `${venue.category.color}18`, color: venue.category.color }}
                      >
                        {venue.category.icon} {tcat.has(venue.category.slug) ? tcat(venue.category.slug) : venue.category.name}
                      </span>
                      <span>{t("addedOn")} {formatRelativeDate(new Date(createdAt), locale)}</span>
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        {venue._count.venueRatings}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {venue._count.posts}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Posts tab */}
      <div className="space-y-3" style={{ display: tab === "posts" ? undefined : "none" }}>
        {posts.length > 0 && (
          <SortPills current={postSort} onChange={setPostSort} options={sortOptions} />
        )}
        {posts.length === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">{t("noPosts")}</p>
        ) : (
          <div className="space-y-2">
            {sortedPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/post/${post.slug}`}
                className="block rounded-xl border satine-border bg-card p-4 hover:bg-[rgba(75,35,120,0.20)] transition-colors group"
              >
                <p className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-1">
                  {post.title}
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span>{formatRelativeDate(new Date(post.createdAt), locale)}</span>
                  <span className="flex items-center gap-1">
                    <ChevronUp className="h-3 w-3" />
                    {post.score}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {post._count.comments}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Comments tab */}
      <div className="space-y-3" style={{ display: tab === "comments" ? undefined : "none" }}>
        {comments.length > 0 && (
          <SortPills current={commentSort} onChange={setCommentSort} options={commentSortOptions} />
        )}
        {comments.length === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">{t("noComments")}</p>
        ) : (
          <div className="space-y-2">
            {sortedComments.map((comment) => (
              <Link
                key={comment.id}
                href={comment.linkHref}
                className="block rounded-xl border satine-border bg-card p-4 hover:bg-[rgba(75,35,120,0.20)] transition-colors group"
              >
                <p className="text-xs text-muted-foreground mb-1">
                  {comment.targetType === "spot" ? t("onSpot") : t("onPost")}{" "}
                  <span className="font-medium text-[rgba(240,230,255,0.80)]">{comment.targetTitle}</span>
                </p>
                <p className="text-sm line-clamp-2 text-muted-foreground group-hover:text-foreground transition-colors">
                  {comment.content}
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span>{formatRelativeDate(new Date(comment.createdAt), locale)}</span>
                  <span className="flex items-center gap-1">
                    <ChevronUp className="h-3 w-3" />
                    {comment.score}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {comment.replyCount}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Liked tab */}
      <div className="space-y-3" style={{ display: tab === "liked" ? undefined : "none" }}>
        {likedPosts.length > 0 && (
          <SortPills current={likedSort} onChange={setLikedSort} options={sortOptions} />
        )}
        {sortedLiked.length === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">{t("noLikedPosts")}</p>
        ) : (
          <div className="space-y-2">
            {sortedLiked.map(({ post, votedAt }) => (
              <Link
                key={post.slug}
                href={`/post/${post.slug}`}
                className="block rounded-xl border satine-border bg-card p-4 hover:bg-[rgba(75,35,120,0.20)] transition-colors group"
              >
                <p className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-1">
                  {post.title}
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span>{t("liked")} {formatRelativeDate(new Date(votedAt), locale)}</span>
                  <span className="flex items-center gap-1">
                    <ChevronUp className="h-3 w-3" />
                    {post.score}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {post._count.comments}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Notifications tab (own profile only) */}
      {isOwnProfile && (
        <div className="space-y-3" style={{ display: tab === "notifications" ? undefined : "none" }}>
          {notifItems.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">No notifications yet</p>
          ) : (
            <>
              {unreadCount > 0 && (
                <button
                  onClick={async () => {
                    await fetch("/api/notifications", { method: "POST" }).catch(() => {})
                    setNotifItems(prev => prev.map(n => ({ ...n, read: true })))
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  Mark all as read
                </button>
              )}
              <div className="space-y-2">
                {notifItems.map((notif) => {
                  const href = notif.post
                    ? `/post/${notif.post.slug}${notif.type === "mention_comment" ? `?comment=${notif.id}` : ""}`
                    : "#"
                  const typeLabel = notif.type === "mention_post" ? "mentioned you in a post" : "mentioned you in a comment"
                  return (
                    <button
                      key={notif.id}
                      onClick={async () => {
                        // Mark as read
                        if (!notif.read) {
                          await fetch("/api/notifications", { method: "POST" }).catch(() => {})
                          setNotifItems(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))
                        }
                        // Navigate
                        if (notif.post) router.push(href)
                      }}
                      className={`w-full text-left block rounded-xl border p-4 transition-colors group ${
                        notif.read
                          ? "satine-border bg-card hover:bg-[rgba(75,35,120,0.20)]"
                          : "border-[rgba(232,168,64,0.30)] bg-[rgba(232,168,64,0.04)] hover:bg-[rgba(232,168,64,0.08)]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {!notif.read && (
                          <span className="shrink-0 h-2 w-2 rounded-full bg-[#e8a840] shadow-[0_0_6px_rgba(232,168,64,0.5)]" />
                        )}
                        {notif.actor.avatarUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={notif.actor.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
                        ) : (
                          <span className="h-8 w-8 rounded-full bg-[rgba(232,168,64,0.15)] flex items-center justify-center text-sm shrink-0">👤</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-semibold text-[#e8a840]">!{notif.actor.username}</span>
                            {" "}<span className="text-muted-foreground">{typeLabel}</span>
                          </p>
                          {notif.post && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {notif.post.title}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            {formatRelativeDate(new Date(notif.createdAt), locale)}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
