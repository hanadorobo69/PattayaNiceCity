import { redirect } from "next/navigation"
import { Link } from "@/i18n/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { qi, param, timestampParam, extractHour } from "@/lib/db-utils"
import {
  BarChart3, Eye, Users, MapPin, Globe, Clock, TrendingUp,
  Calendar, Sun, Moon, Sunrise, ChevronUp, ChevronDown,
  MessageSquare, Heart, Star, FileText, Activity, UserPlus,
  MousePointerClick, ArrowUpRight, Zap,
} from "lucide-react"
import { getTranslations } from "next-intl/server"

export const metadata = { title: "Analytics - Admin - Pattaya Nice City" }
export const revalidate = 60

export default async function AnalyticsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const profile = await prisma.profile.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  })
  if (!profile?.isAdmin) redirect("/")

  const t = await getTranslations("adminAnalytics")

  // Get admin user IDs to exclude from metrics
  const adminProfiles = await prisma.profile.findMany({
    where: { isAdmin: true },
    select: { id: true, username: true },
  })
  const adminIds = adminProfiles.map(a => a.id)

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)
  const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthStart = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Build admin exclusion for raw SQL
  const adminExcludeSQL = adminIds.length > 0
    ? `AND (${qi("userId")} IS NULL OR ${qi("userId")} NOT IN (${adminIds.map((_, i) => `$${i + 1}`).join(", ")}))`
    : ""
  const adminExcludeSQLOffset = (offset: number) => adminIds.length > 0
    ? `AND (${qi("userId")} IS NULL OR ${qi("userId")} NOT IN (${adminIds.map((_, i) => `$${i + 1 + offset}`).join(", ")}))`
    : ""

  // Prisma exclusion for admin users
  const notAdmin = adminIds.length > 0
    ? { OR: [{ userId: null }, { userId: { notIn: adminIds } }] }
    : {}

  // ── Fetch all analytics in parallel ──
  const [
    // Page views (excluding admins)
    pvToday, pvYesterday, pvWeek, pvMonth, pvTotal,
    // Unique visitors (logged-in, excluding admins)
    uniqueToday, uniqueWeek, uniqueMonth,
    // Venue views (excluding admins)
    vvToday, vvWeek, vvMonth, vvTotal,
    // Top venues by views (last 30 days)
    topVenuesMonth,
    // Top venues all time
    topVenuesAllTime,
    // Hourly distribution (last 7 days)
    hourlyViews,
    // Daily views (last 7 days)
    dailyViews,
    // Top pages (last 30 days)
    topPages,
    // User stats (excluding admins)
    totalUsers, newUsersToday, newUsersWeek, newUsersMonth,
    // Active users (posted or commented in last 7 days)
    activeUsersWeek,
    // User demographics
    countryCounts, ageCounts,
    // Content stats
    totalPosts, totalVenues, totalComments, totalRatings,
    // Recent activity
    postsThisWeek, commentsThisWeek, votesThisWeek, favoritesThisWeek,
    // Recent signups
    recentSignups,
    // Most active users (by posts + comments, last 30 days)
    mostActiveUsers,
    // Avg rating
    avgVenueRating,
    // Messages count
    totalMessages,
    // Visitor geolocation
    visitorCountries,
    visitorCities,
    uniqueIpsWeek,
  ] = await Promise.all([
    // Page views (excluding admins)
    prisma.pageView.count({ where: { createdAt: { gte: todayStart }, ...notAdmin } }),
    prisma.pageView.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart }, ...notAdmin } }),
    prisma.pageView.count({ where: { createdAt: { gte: weekStart }, ...notAdmin } }),
    prisma.pageView.count({ where: { createdAt: { gte: monthStart }, ...notAdmin } }),
    prisma.pageView.count({ where: notAdmin }),
    // Unique logged-in visitors (excluding admins)
    prisma.$queryRawUnsafe(`
      SELECT COUNT(DISTINCT ${qi("userId")}) as ${qi("count")}
      FROM ${qi("PageView")}
      WHERE ${qi("createdAt")} >= ${timestampParam(adminIds.length + 1)}
        AND ${qi("userId")} IS NOT NULL
        ${adminIds.length > 0 ? `AND ${qi("userId")} NOT IN (${adminIds.map((_, i) => `$${i + 1}`).join(", ")})` : ""}
    `, ...adminIds, todayStart.toISOString()).then((r: any) => Number(r[0]?.count ?? 0)),
    prisma.$queryRawUnsafe(`
      SELECT COUNT(DISTINCT ${qi("userId")}) as ${qi("count")}
      FROM ${qi("PageView")}
      WHERE ${qi("createdAt")} >= ${timestampParam(adminIds.length + 1)}
        AND ${qi("userId")} IS NOT NULL
        ${adminIds.length > 0 ? `AND ${qi("userId")} NOT IN (${adminIds.map((_, i) => `$${i + 1}`).join(", ")})` : ""}
    `, ...adminIds, weekStart.toISOString()).then((r: any) => Number(r[0]?.count ?? 0)),
    prisma.$queryRawUnsafe(`
      SELECT COUNT(DISTINCT ${qi("userId")}) as ${qi("count")}
      FROM ${qi("PageView")}
      WHERE ${qi("createdAt")} >= ${timestampParam(adminIds.length + 1)}
        AND ${qi("userId")} IS NOT NULL
        ${adminIds.length > 0 ? `AND ${qi("userId")} NOT IN (${adminIds.map((_, i) => `$${i + 1}`).join(", ")})` : ""}
    `, ...adminIds, monthStart.toISOString()).then((r: any) => Number(r[0]?.count ?? 0)),
    // Venue views (excluding admins)
    prisma.venueView.count({ where: { createdAt: { gte: todayStart }, ...notAdmin } }),
    prisma.venueView.count({ where: { createdAt: { gte: weekStart }, ...notAdmin } }),
    prisma.venueView.count({ where: { createdAt: { gte: monthStart }, ...notAdmin } }),
    prisma.venueView.count({ where: notAdmin }),
    // Top venues by views last 30 days (excluding admins)
    prisma.$queryRawUnsafe(`
      SELECT v.${qi("id")}, v.${qi("name")}, v.${qi("slug")}, v.${qi("imageUrl")}, c.${qi("icon")} as ${qi("categoryIcon")}, c.${qi("name")} as ${qi("categoryName")},
        COUNT(vv.${qi("id")}) as ${qi("viewCount")}
      FROM ${qi("VenueView")} vv
      JOIN ${qi("Venue")} v ON v.${qi("id")} = vv.${qi("venueId")}
      JOIN ${qi("Category")} c ON c.${qi("id")} = v.${qi("categoryId")}
      WHERE vv.${qi("createdAt")} >= ${timestampParam(adminIds.length + 1)}
        ${adminExcludeSQLOffset(0).replace("$", "$")}
      GROUP BY v.${qi("id")}, v.${qi("name")}, v.${qi("slug")}, v.${qi("imageUrl")}, c.${qi("icon")}, c.${qi("name")}
      ORDER BY ${qi("viewCount")} DESC
      LIMIT 15
    `, ...adminIds, monthStart.toISOString()) as Promise<any[]>,
    // Top venues all time (excluding admins)
    prisma.$queryRawUnsafe(`
      SELECT v.${qi("id")}, v.${qi("name")}, v.${qi("slug")}, c.${qi("icon")} as ${qi("categoryIcon")}, c.${qi("name")} as ${qi("categoryName")},
        COUNT(vv.${qi("id")}) as ${qi("viewCount")}
      FROM ${qi("VenueView")} vv
      JOIN ${qi("Venue")} v ON v.${qi("id")} = vv.${qi("venueId")}
      JOIN ${qi("Category")} c ON c.${qi("id")} = v.${qi("categoryId")}
      ${adminIds.length > 0 ? `WHERE (vv.${qi("userId")} IS NULL OR vv.${qi("userId")} NOT IN (${adminIds.map((_, i) => `$${i + 1}`).join(", ")}))` : ""}
      GROUP BY v.${qi("id")}, v.${qi("name")}, v.${qi("slug")}, c.${qi("icon")}, c.${qi("name")}
      ORDER BY ${qi("viewCount")} DESC
      LIMIT 15
    `, ...adminIds) as Promise<any[]>,
    // Hourly distribution (last 7 days, excluding admins)
    prisma.$queryRawUnsafe(`
      SELECT ${extractHour("createdAt")} as ${qi("hour")}, COUNT(*) as ${qi("count")}
      FROM ${qi("PageView")}
      WHERE ${qi("createdAt")} >= ${timestampParam(adminIds.length + 1)}
        ${adminExcludeSQLOffset(0)}
      GROUP BY ${qi("hour")}
      ORDER BY ${qi("hour")}
    `, ...adminIds, weekStart.toISOString()) as Promise<any[]>,
    // Daily views (last 7 days, excluding admins)
    prisma.$queryRawUnsafe(`
      SELECT DATE(${qi("createdAt")}) as ${qi("day")}, COUNT(*) as ${qi("count")}
      FROM ${qi("PageView")}
      WHERE ${qi("createdAt")} >= ${timestampParam(adminIds.length + 1)}
        ${adminExcludeSQLOffset(0)}
      GROUP BY ${qi("day")}
      ORDER BY ${qi("day")}
    `, ...adminIds, weekStart.toISOString()) as Promise<any[]>,
    // Top pages (last 30 days, excluding admins)
    prisma.$queryRawUnsafe(`
      SELECT ${qi("path")}, COUNT(*) as ${qi("count")}
      FROM ${qi("PageView")}
      WHERE ${qi("createdAt")} >= ${timestampParam(adminIds.length + 1)}
        ${adminExcludeSQLOffset(0)}
        AND ${qi("path")} NOT LIKE '/admin%'
      GROUP BY ${qi("path")}
      ORDER BY ${qi("count")} DESC
      LIMIT 10
    `, ...adminIds, monthStart.toISOString()) as Promise<any[]>,
    // User stats (excluding admins)
    prisma.profile.count({ where: { isAdmin: false } }),
    prisma.profile.count({ where: { createdAt: { gte: todayStart }, isAdmin: false } }),
    prisma.profile.count({ where: { createdAt: { gte: weekStart }, isAdmin: false } }),
    prisma.profile.count({ where: { createdAt: { gte: monthStart }, isAdmin: false } }),
    // Active users last 7 days (posted or commented, excluding admins)
    prisma.$queryRawUnsafe(`
      SELECT COUNT(DISTINCT ${qi("uid")}) as ${qi("count")} FROM (
        SELECT ${qi("authorId")} as ${qi("uid")} FROM ${qi("Post")} WHERE ${qi("createdAt")} >= ${timestampParam(adminIds.length + 1)}
        UNION
        SELECT ${qi("authorId")} as ${qi("uid")} FROM ${qi("Comment")} WHERE ${qi("createdAt")} >= ${timestampParam(adminIds.length + 2)}
      ) sub
      ${adminIds.length > 0 ? `WHERE ${qi("uid")} NOT IN (${adminIds.map((_, i) => `$${i + 1}`).join(", ")})` : ""}
    `, ...adminIds, weekStart.toISOString(), weekStart.toISOString()).then((r: any) => Number(r[0]?.count ?? 0)),
    // Demographics
    prisma.$queryRawUnsafe(`
      SELECT ${qi("country")}, COUNT(*) as ${qi("count")}
      FROM ${qi("Profile")}
      WHERE ${qi("country")} IS NOT NULL AND ${qi("country")} != '' AND ${qi("isAdmin")} = false
      GROUP BY ${qi("country")}
      ORDER BY ${qi("count")} DESC
      LIMIT 15
    `) as Promise<any[]>,
    prisma.$queryRawUnsafe(`
      SELECT
        CASE
          WHEN EXTRACT(YEAR FROM AGE(${qi("dateOfBirth")})) < 20 THEN '< 20'
          WHEN EXTRACT(YEAR FROM AGE(${qi("dateOfBirth")})) BETWEEN 20 AND 25 THEN '20-25'
          WHEN EXTRACT(YEAR FROM AGE(${qi("dateOfBirth")})) BETWEEN 26 AND 30 THEN '26-30'
          WHEN EXTRACT(YEAR FROM AGE(${qi("dateOfBirth")})) BETWEEN 31 AND 35 THEN '31-35'
          WHEN EXTRACT(YEAR FROM AGE(${qi("dateOfBirth")})) BETWEEN 36 AND 40 THEN '36-40'
          WHEN EXTRACT(YEAR FROM AGE(${qi("dateOfBirth")})) BETWEEN 41 AND 50 THEN '41-50'
          WHEN EXTRACT(YEAR FROM AGE(${qi("dateOfBirth")})) > 50 THEN '50+'
          ELSE 'N/A'
        END as ${qi("ageRange")},
        COUNT(*) as ${qi("count")}
      FROM ${qi("Profile")}
      WHERE ${qi("dateOfBirth")} IS NOT NULL AND ${qi("isAdmin")} = false
      GROUP BY ${qi("ageRange")}
      ORDER BY MIN(${qi("dateOfBirth")}) DESC
    `) as Promise<any[]>,
    // Content stats
    prisma.post.count(),
    prisma.venue.count({ where: { isActive: true } }),
    prisma.comment.count(),
    prisma.venueRating.count(),
    // Recent activity this week
    prisma.post.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.comment.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.vote.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.favorite.count({ where: { createdAt: { gte: weekStart } } }),
    // Recent signups (last 10, excluding admins)
    prisma.profile.findMany({
      where: { isAdmin: false },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { username: true, displayName: true, avatarUrl: true, createdAt: true, country: true },
    }),
    // Most active users (last 30 days, excluding admins)
    prisma.$queryRawUnsafe(`
      SELECT p.${qi("username")}, p.${qi("displayName")}, p.${qi("avatarUrl")},
        (SELECT COUNT(*) FROM ${qi("Post")} WHERE ${qi("authorId")} = p.${qi("id")} AND ${qi("createdAt")} >= ${timestampParam(adminIds.length + 1)}) as ${qi("posts")},
        (SELECT COUNT(*) FROM ${qi("Comment")} WHERE ${qi("authorId")} = p.${qi("id")} AND ${qi("createdAt")} >= ${timestampParam(adminIds.length + 2)}) as ${qi("comments")}
      FROM ${qi("Profile")} p
      WHERE p.${qi("isAdmin")} = false
      ORDER BY (
        (SELECT COUNT(*) FROM ${qi("Post")} WHERE ${qi("authorId")} = p.${qi("id")} AND ${qi("createdAt")} >= ${timestampParam(adminIds.length + 3)}) +
        (SELECT COUNT(*) FROM ${qi("Comment")} WHERE ${qi("authorId")} = p.${qi("id")} AND ${qi("createdAt")} >= ${timestampParam(adminIds.length + 4)})
      ) DESC
      LIMIT 10
    `, ...adminIds, monthStart.toISOString(), monthStart.toISOString(), monthStart.toISOString(), monthStart.toISOString()) as Promise<any[]>,
    // Avg venue rating
    prisma.venueRating.aggregate({ _avg: { overall: true } }),
    // Total messages
    prisma.message.count(),
    // Visitor locations from page view geolocation (last 30 days, excluding admins)
    prisma.$queryRawUnsafe(`
      SELECT ${qi("country")}, COUNT(*) as ${qi("count")}
      FROM ${qi("PageView")}
      WHERE ${qi("createdAt")} >= ${timestampParam(adminIds.length + 1)}
        AND ${qi("country")} IS NOT NULL AND ${qi("country")} != ''
        ${adminExcludeSQLOffset(0)}
      GROUP BY ${qi("country")}
      ORDER BY ${qi("count")} DESC
      LIMIT 15
    `, ...adminIds, monthStart.toISOString()) as Promise<any[]>,
    // Visitor cities from geolocation (last 30 days, excluding admins)
    prisma.$queryRawUnsafe(`
      SELECT ${qi("city")}, ${qi("country")}, COUNT(*) as ${qi("count")}
      FROM ${qi("PageView")}
      WHERE ${qi("createdAt")} >= ${timestampParam(adminIds.length + 1)}
        AND ${qi("city")} IS NOT NULL AND ${qi("city")} != ''
        ${adminExcludeSQLOffset(0)}
      GROUP BY ${qi("city")}, ${qi("country")}
      ORDER BY ${qi("count")} DESC
      LIMIT 20
    `, ...adminIds, monthStart.toISOString()) as Promise<any[]>,
    // Unique IPs this week (non-admin)
    prisma.$queryRawUnsafe(`
      SELECT COUNT(DISTINCT ${qi("ip")}) as ${qi("count")}
      FROM ${qi("PageView")}
      WHERE ${qi("createdAt")} >= ${timestampParam(adminIds.length + 1)}
        AND ${qi("ip")} IS NOT NULL
        ${adminExcludeSQLOffset(0)}
    `, ...adminIds, weekStart.toISOString()).then((r: any) => Number(r[0]?.count ?? 0)),
  ])

  // Compute day-over-day change
  const pvDayChange = pvYesterday > 0 ? Math.round(((pvToday - pvYesterday) / pvYesterday) * 100) : 0

  // Build hourly data (fill gaps)
  const hourlyData: { hour: number; count: number }[] = []
  const hourMap = new Map(hourlyViews.map((h: any) => [Number(h.hour), Number(h.count)]))
  for (let h = 0; h < 24; h++) {
    hourlyData.push({ hour: h, count: hourMap.get(h) ?? 0 })
  }
  const maxHourly = Math.max(...hourlyData.map(h => h.count), 1)

  // Time of day breakdown
  const morningViews = hourlyData.filter(h => h.hour >= 6 && h.hour < 12).reduce((s, h) => s + h.count, 0)
  const afternoonViews = hourlyData.filter(h => h.hour >= 12 && h.hour < 18).reduce((s, h) => s + h.count, 0)
  const eveningViews = hourlyData.filter(h => h.hour >= 18 && h.hour < 24).reduce((s, h) => s + h.count, 0)
  const nightViews = hourlyData.filter(h => h.hour >= 0 && h.hour < 6).reduce((s, h) => s + h.count, 0)

  // Daily chart data (fill gaps for last 7 days)
  const dailyData: { day: string; label: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().split("T")[0]
    const label = d.toLocaleDateString("en", { weekday: "short" })
    const found = dailyViews.find((dv: any) => String(dv.day).startsWith(key))
    dailyData.push({ day: key, label, count: found ? Number(found.count) : 0 })
  }
  const maxDaily = Math.max(...dailyData.map(d => d.count), 1)

  // Avg pages per session estimate (total views / unique visitors this month)
  const avgPagesPerVisit = uniqueMonth > 0 ? (pvMonth / uniqueMonth).toFixed(1) : "-"

  const avgRating = avgVenueRating._avg?.overall ? avgVenueRating._avg.overall.toFixed(1) : "-"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-[rgba(61,184,160,0.10)] flex items-center justify-center">
          <BarChart3 className="h-5 w-5 text-[#3db8a0]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-orbitron)]"><span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">{t("title")}</span></h1>
          <p className="text-muted-foreground text-xs">Real visitors only - admin traffic excluded</p>
        </div>
      </div>

      {/* ── Row 1: Traffic overview ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label={t("viewsToday")} value={pvToday} icon={Eye} color="text-cyan-400" change={pvDayChange} />
        <StatCard label={t("viewsWeek")} value={pvWeek} icon={Calendar} color="text-blue-400" />
        <StatCard label={t("viewsMonth")} value={pvMonth} icon={TrendingUp} color="text-purple-400" />
        <StatCard label={t("totalViews")} value={pvTotal} icon={BarChart3} color="text-pink-400" />
      </div>

      {/* ── Row 2: Unique visitors + engagement ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Unique Today" value={uniqueToday} icon={MousePointerClick} color="text-emerald-400" />
        <StatCard label="Unique This Week" value={uniqueWeek} icon={MousePointerClick} color="text-green-400" />
        <StatCard label="Unique This Month" value={uniqueMonth} icon={MousePointerClick} color="text-teal-400" />
        <div className="rounded-xl border satine-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Avg Pages/Visit</p>
            <Zap className="h-4 w-4 text-yellow-400" />
          </div>
          <p className="text-2xl font-bold">{avgPagesPerVisit}</p>
        </div>
      </div>

      {/* ── Row 3: Venue views ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label={t("spotViewsToday")} value={vvToday} icon={MapPin} color="text-green-400" />
        <StatCard label={t("spotViewsWeek")} value={vvWeek} icon={MapPin} color="text-emerald-400" />
        <StatCard label={t("spotViewsMonth")} value={vvMonth} icon={MapPin} color="text-teal-400" />
        <StatCard label={t("totalSpotViews")} value={vvTotal} icon={MapPin} color="text-lime-400" />
      </div>

      {/* ── Row 4: Users ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label={t("totalUsers")} value={totalUsers} icon={Users} color="text-blue-400" />
        <StatCard label={t("newUsersToday")} value={newUsersToday} icon={UserPlus} color="text-cyan-400" />
        <StatCard label={t("newUsersWeek")} value={newUsersWeek} icon={UserPlus} color="text-indigo-400" />
        <StatCard label="New This Month" value={newUsersMonth} icon={UserPlus} color="text-violet-400" />
      </div>

      {/* ── Row 5: Activity this week ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Active Users (7d)" value={activeUsersWeek} icon={Activity} color="text-orange-400" />
        <StatCard label="Posts (7d)" value={postsThisWeek} icon={FileText} color="text-blue-400" />
        <StatCard label="Comments (7d)" value={commentsThisWeek} icon={MessageSquare} color="text-green-400" />
        <StatCard label="Votes (7d)" value={votesThisWeek} icon={ArrowUpRight} color="text-purple-400" />
        <StatCard label="Favorites (7d)" value={favoritesThisWeek} icon={Heart} color="text-pink-400" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">

        {/* ── Daily traffic chart (7 days) ── */}
        <div className="rounded-xl border satine-border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#3db8a0]" />
            Daily Traffic - Last 7 Days
          </h2>
          <div className="flex items-end gap-1.5 h-32">
            {dailyData.map(({ day, label, count }) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] font-bold text-muted-foreground">{count}</span>
                <div
                  className="w-full rounded-t transition-all"
                  style={{
                    height: `${Math.max((count / maxDaily) * 100, 3)}%`,
                    background: "linear-gradient(to top, #e07850, #3db8a080)",
                  }}
                  title={`${day}: ${count} views`}
                />
                <span className="text-[9px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Hourly traffic distribution ── */}
        <div className="rounded-xl border satine-border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#3db8a0]" />
            {t("hourlyTraffic")}
          </h2>
          <div className="flex items-end gap-0.5 h-32">
            {hourlyData.map(({ hour, count }) => (
              <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t transition-all"
                  style={{
                    height: `${Math.max((count / maxHourly) * 100, 2)}%`,
                    background: hour >= 18 || hour < 6
                      ? "linear-gradient(to top, #e8a840, #e8a84080)"
                      : "linear-gradient(to top, #3db8a0, #3db8a080)",
                  }}
                  title={`${hour}:00 - ${count} views`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground px-0.5">
            <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>23h</span>
          </div>

          {/* Time of day summary */}
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[rgba(232,168,64,0.10)]">
            <div className="text-center">
              <Moon className="h-3.5 w-3.5 mx-auto text-indigo-400 mb-1" />
              <p className="text-xs font-bold">{nightViews}</p>
              <p className="text-[9px] text-muted-foreground">{t("night")}</p>
            </div>
            <div className="text-center">
              <Sunrise className="h-3.5 w-3.5 mx-auto text-amber-400 mb-1" />
              <p className="text-xs font-bold">{morningViews}</p>
              <p className="text-[9px] text-muted-foreground">{t("morning")}</p>
            </div>
            <div className="text-center">
              <Sun className="h-3.5 w-3.5 mx-auto text-yellow-400 mb-1" />
              <p className="text-xs font-bold">{afternoonViews}</p>
              <p className="text-[9px] text-muted-foreground">{t("afternoon")}</p>
            </div>
            <div className="text-center">
              <Moon className="h-3.5 w-3.5 mx-auto text-pink-400 mb-1" />
              <p className="text-xs font-bold">{eveningViews}</p>
              <p className="text-[9px] text-muted-foreground">{t("evening")}</p>
            </div>
          </div>
        </div>

        {/* ── Top pages ── */}
        <div className="rounded-xl border satine-border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Eye className="h-4 w-4 text-cyan-400" />
            Top Pages - Last 30 Days
          </h2>
          {topPages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
          ) : (
            <div className="space-y-1.5">
              {topPages.map((p: any, i: number) => {
                const maxP = Number(topPages[0]?.count ?? 1)
                const pct = (Number(p.count) / maxP) * 100
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs font-bold w-5 shrink-0 text-muted-foreground">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="h-6 relative rounded overflow-hidden bg-muted/30">
                        <div
                          className="absolute inset-y-0 left-0 rounded bg-gradient-to-r from-[rgba(61,184,160,0.15)] to-[rgba(61,184,160,0.05)]"
                          style={{ width: `${pct}%` }}
                        />
                        <p className="absolute inset-0 flex items-center px-2 text-[11px] font-medium truncate">{p.path}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold w-10 text-right text-[#3db8a0]">{Number(p.count)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Top venues this month ── */}
        <div className="rounded-xl border satine-border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#e8a840]" />
            {t("topSpotsMonth")}
          </h2>
          {topVenuesMonth.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t("noVenueViews")}</p>
          ) : (
            <div className="space-y-2">
              {topVenuesMonth.map((v: any, i: number) => (
                <Link
                  key={v.id}
                  href={`/places/${v.slug}`}
                  className="flex items-center gap-3 hover:bg-muted/30 rounded-lg px-2 py-1.5 -mx-2 transition-colors"
                >
                  <span
                    className="text-sm font-bold w-5 shrink-0"
                    style={{ color: i === 0 ? "#F59E0B" : i === 1 ? "#9CA3AF" : i === 2 ? "#CD7C2F" : undefined }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{v.name}</p>
                    <p className="text-[10px] text-muted-foreground">{v.categoryIcon} {v.categoryName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[#3db8a0]">{Number(v.viewCount)}</p>
                    <p className="text-[9px] text-muted-foreground">{t("views")}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Top venues all time ── */}
        <div className="rounded-xl border satine-border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Eye className="h-4 w-4 text-purple-400" />
            {t("topSpotsAllTime")}
          </h2>
          {topVenuesAllTime.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t("noVenueViews")}</p>
          ) : (
            <div className="space-y-2">
              {topVenuesAllTime.map((v: any, i: number) => (
                <Link
                  key={v.id}
                  href={`/places/${v.slug}`}
                  className="flex items-center gap-3 hover:bg-muted/30 rounded-lg px-2 py-1.5 -mx-2 transition-colors"
                >
                  <span
                    className="text-sm font-bold w-5 shrink-0"
                    style={{ color: i === 0 ? "#F59E0B" : i === 1 ? "#9CA3AF" : i === 2 ? "#CD7C2F" : undefined }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{v.name}</p>
                    <p className="text-[10px] text-muted-foreground">{v.categoryIcon} {v.categoryName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-purple-400">{Number(v.viewCount)}</p>
                    <p className="text-[9px] text-muted-foreground">{t("views")}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Recent signups ── */}
        <div className="rounded-xl border satine-border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-green-400" />
            Recent Signups
          </h2>
          {recentSignups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No signups yet</p>
          ) : (
            <div className="space-y-2">
              {recentSignups.map((u: any) => (
                <div key={u.username} className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full overflow-hidden bg-muted shrink-0">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-muted-foreground bg-gradient-to-br from-[rgba(224,120,80,0.20)] to-[rgba(61,184,160,0.20)]">
                        {(u.displayName || u.username)[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{u.displayName || u.username}</p>
                    <p className="text-[10px] text-muted-foreground">@{u.username}{u.country ? ` · ${u.country}` : ""}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground shrink-0">{formatTimeAgo(u.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Most active users (30d) ── */}
        <div className="rounded-xl border satine-border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-orange-400" />
            Most Active Users - 30 Days
          </h2>
          {mostActiveUsers.filter((u: any) => Number(u.posts) + Number(u.comments) > 0).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
          ) : (
            <div className="space-y-2">
              {mostActiveUsers.filter((u: any) => Number(u.posts) + Number(u.comments) > 0).map((u: any, i: number) => (
                <div key={u.username} className="flex items-center gap-3">
                  <span
                    className="text-sm font-bold w-5 shrink-0"
                    style={{ color: i === 0 ? "#F59E0B" : i === 1 ? "#9CA3AF" : i === 2 ? "#CD7C2F" : undefined }}
                  >
                    {i + 1}
                  </span>
                  <div className="h-7 w-7 rounded-full overflow-hidden bg-muted shrink-0">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-muted-foreground bg-gradient-to-br from-[rgba(224,120,80,0.20)] to-[rgba(61,184,160,0.20)]">
                        {(u.displayName || u.username)[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{u.displayName || u.username}</p>
                  </div>
                  <div className="flex gap-3 text-[10px] shrink-0">
                    <span className="text-blue-400">{Number(u.posts)} posts</span>
                    <span className="text-green-400">{Number(u.comments)} comments</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Demographics ── */}
        <div className="rounded-xl border satine-border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Globe className="h-4 w-4 text-green-400" />
            {t("userDemographics")}
          </h2>

          {/* Countries */}
          <div className="space-y-2">
            <h3 className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{t("byCountry")}</h3>
            {countryCounts.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("noCountryData")}</p>
            ) : (
              <div className="space-y-1.5">
                {countryCounts.map((c: any) => {
                  const maxCount = Number(countryCounts[0]?.count ?? 1)
                  const pct = (Number(c.count) / maxCount) * 100
                  return (
                    <div key={c.country} className="flex items-center gap-2">
                      <span className="text-xs w-20 shrink-0 truncate font-medium">{c.country}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold w-8 text-right">{Number(c.count)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Age distribution */}
          <div className="space-y-2 pt-2 border-t border-[rgba(232,168,64,0.10)]">
            <h3 className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{t("byAge")}</h3>
            {ageCounts.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("noAgeData")}</p>
            ) : (
              <div className="flex items-end gap-1 h-24">
                {ageCounts.filter((a: any) => a.ageRange !== "N/A").map((a: any) => {
                  const maxAge = Math.max(...ageCounts.filter((x: any) => x.ageRange !== "N/A").map((x: any) => Number(x.count)), 1)
                  const pct = (Number(a.count) / maxAge) * 100
                  return (
                    <div key={a.ageRange} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[9px] font-bold text-muted-foreground">{Number(a.count)}</span>
                      <div
                        className="w-full rounded-t bg-gradient-to-t from-[#e8a840] to-[#e8a84060]"
                        style={{ height: `${Math.max(pct, 5)}%` }}
                      />
                      <span className="text-[8px] text-muted-foreground whitespace-nowrap">{a.ageRange}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Visitor Locations (from IP geolocation) ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border satine-border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Globe className="h-4 w-4 text-emerald-400" />
            Visitor Countries - Last 30 Days
            <span className="ml-auto text-[10px] text-muted-foreground">{uniqueIpsWeek} unique IPs this week</span>
          </h2>
          {visitorCountries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No geo data yet - tracking starts now</p>
          ) : (
            <div className="space-y-1.5">
              {visitorCountries.map((c: any, i: number) => {
                const maxC = Number(visitorCountries[0]?.count ?? 1)
                const pct = (Number(c.count) / maxC) * 100
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs w-24 shrink-0 truncate font-medium">{c.country}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold w-10 text-right">{Number(c.count)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border satine-border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4 text-cyan-400" />
            Top Cities - Last 30 Days
          </h2>
          {visitorCities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No geo data yet - tracking starts now</p>
          ) : (
            <div className="space-y-1.5">
              {visitorCities.map((c: any, i: number) => {
                const maxC = Number(visitorCities[0]?.count ?? 1)
                const pct = (Number(c.count) / maxC) * 100
                const isPattaya = (c.city || "").toLowerCase().includes("pattaya") || (c.city || "").toLowerCase().includes("chon buri") || (c.city || "").toLowerCase().includes("bang lamung")
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`text-xs w-28 shrink-0 truncate font-medium ${isPattaya ? "text-[#e8a840]" : ""}`}>
                      {c.city}{c.country ? `, ${c.country}` : ""}
                      {isPattaya && " 📍"}
                    </span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: isPattaya ? "linear-gradient(to right, #e8a840, #e07850)" : "linear-gradient(to right, #3db8a0, #e0785080)" }}
                      />
                    </div>
                    <span className="text-xs font-bold w-10 text-right">{Number(c.count)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Content summary ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-xl border satine-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{totalVenues}</p>
          <p className="text-xs text-muted-foreground">{t("activeVenues")}</p>
        </div>
        <div className="rounded-xl border satine-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{totalPosts}</p>
          <p className="text-xs text-muted-foreground">{t("totalPosts")}</p>
        </div>
        <div className="rounded-xl border satine-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{totalComments}</p>
          <p className="text-xs text-muted-foreground">{t("totalComments")}</p>
        </div>
        <div className="rounded-xl border satine-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{totalRatings}</p>
          <p className="text-xs text-muted-foreground">{t("totalRatings")}</p>
        </div>
        <div className="rounded-xl border satine-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{totalMessages}</p>
          <p className="text-xs text-muted-foreground">Messages</p>
        </div>
      </div>

      {/* ── Avg Rating + quick stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border satine-border bg-card p-4 flex items-center gap-3">
          <Star className="h-6 w-6 text-yellow-400" />
          <div>
            <p className="text-xl font-bold">{avgRating}</p>
            <p className="text-xs text-muted-foreground">Avg Venue Rating</p>
          </div>
        </div>
        <div className="rounded-xl border satine-border bg-card p-4 flex items-center gap-3">
          <TrendingUp className="h-6 w-6 text-green-400" />
          <div>
            <p className="text-xl font-bold">{totalVenues > 0 ? (vvTotal / totalVenues).toFixed(0) : 0}</p>
            <p className="text-xs text-muted-foreground">Avg Views / Spot</p>
          </div>
        </div>
        <div className="rounded-xl border satine-border bg-card p-4 flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-blue-400" />
          <div>
            <p className="text-xl font-bold">{totalPosts > 0 ? (totalComments / totalPosts).toFixed(1) : 0}</p>
            <p className="text-xs text-muted-foreground">Avg Comments / Post</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Stat card component ──
function StatCard({
  label, value, icon: Icon, color, change,
}: {
  label: string; value: number; icon: any; color: string; change?: number
}) {
  return (
    <div className="rounded-xl border satine-border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="flex items-end gap-2">
        <p className="text-2xl font-bold">{value.toLocaleString()}</p>
        {change !== undefined && change !== 0 && (
          <span className={`text-xs flex items-center gap-0.5 ${change > 0 ? "text-green-400" : "text-red-400"}`}>
            {change > 0 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
    </div>
  )
}

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}
