import type { Metadata } from "next"
import { Link } from "@/i18n/navigation"
import Image from "next/image"
import { prisma } from "@/lib/prisma"
import { getKarmaTier } from "@/lib/karma"
import { getCountryName } from "@/lib/countries"
import { formatRelativeDate } from "@/lib/utils"
import { Users, Crown, Calendar, MessageSquare, FileText, Shield, Flame, MapPin } from "lucide-react"
import Script from "next/script"
import { buildWebPageJsonLd } from "@/lib/jsonld"
import { getLocale } from "next-intl/server"

export const revalidate = 120

export const metadata: Metadata = {
  title: "Squad - Pattaya Nice City Members",
  description: "Meet the members of Pattaya Nice City - the community behind the #1 Pattaya guide guide. Rankings, karma, and reputation.",
  openGraph: {
    title: "Squad - Pattaya Nice City Members",
    description: "The community behind Pattaya's most trusted guide guide.",
  },
}

const ADMIN_TIER = { label: "Admin", color: "#e8a840", gradient: true, emoji: "👑" }

export default async function MembersPage() {
  const locale = await getLocale()

  const allMembers = await prisma.profile.findMany({
    where: { isVenueAccount: false },
    select: {
      username: true,
      displayName: true,
      avatarUrl: true,
      karma: true,
      isAdmin: true,
      isVerified: true,
      country: true,
      residentType: true,
      createdAt: true,
      bio: true,
      _count: {
        select: {
          posts: { where: { deletedAt: null } },
          comments: { where: { deletedAt: null } },
          venueRatings: true,
        },
      },
    },
    orderBy: { karma: "desc" },
  })

  // Admins always on top (no ranking between them), then others ranked
  const admins = allMembers.filter(m => m.isAdmin)
  const others = allMembers.filter(m => !m.isAdmin)
  const members = [...admins, ...others]

  const totalMembers = members.length
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pattayanicecity.com"

  const webPageJsonLd = buildWebPageJsonLd({
    title: "Squad - Pattaya Nice City Members",
    description: "Meet the members of Pattaya Nice City - the community behind the #1 Pattaya guide guide. Rankings, karma, and reputation.",
    url: `${siteUrl}/members`,
    siteUrl,
  })

  return (
    <>
    <Script id="webpage-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-orbitron)] leading-none flex items-center gap-3">
          <span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">Squad</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-2">
          {totalMembers} member{totalMembers !== 1 ? "s" : ""} strong - the community behind Pattaya&apos;s most trusted guide guide.
        </p>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border satine-border bg-card text-xs">
          <Users className="h-4 w-4 text-[#3db8a0]" />
          <span className="text-muted-foreground">{totalMembers} members</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[rgba(232,168,64,0.30)] bg-[rgba(232,168,64,0.06)] text-xs">
          <Shield className="h-4 w-4 text-[#e8a840]" />
          <span className="text-[#e8a840] font-semibold">{members.filter(m => m.isAdmin).length} Admins</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border satine-border bg-card text-xs">
          <Crown className="h-4 w-4 text-[#EC4899]" />
          <span className="text-muted-foreground">{members.filter(m => !m.isAdmin && m.karma >= 1000).length} Legends</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border satine-border bg-card text-xs">
          <Flame className="h-4 w-4 text-[#F59E0B]" />
          <span className="text-muted-foreground">{members.filter(m => !m.isAdmin && m.karma >= 400).length} OGs</span>
        </div>
      </div>

      {/* Members list */}
      <div className="space-y-2">
        {members.map((member, idx) => {
          const baseTier = getKarmaTier(member.karma)
          const tier = member.isAdmin ? ADMIN_TIER : baseTier
          const isAdminMember = member.isAdmin
          // Rank only applies to non-admins (admins are unranked at top)
          const memberRank = isAdminMember ? null : idx - admins.length
          const isTop3 = memberRank !== null && memberRank < 3

          return (
            <Link
              key={member.username}
              href={`/profile/${member.username}`}
              className={`group w-full flex items-center gap-3 sm:gap-4 px-4 py-3 rounded-xl border transition-all ${
                isAdminMember
                  ? "border-[rgba(232,168,64,0.30)] bg-gradient-to-r from-[rgba(232,168,64,0.06)] via-[rgba(224,120,80,0.06)] to-[rgba(61,184,160,0.06)] hover:border-[rgba(232,168,64,0.50)] shadow-[0_0_20px_rgba(232,168,64,0.08)]"
                  : "satine-border bg-card hover:border-[rgba(232,168,64,0.30)]"
              }`}
            >
              {/* Rank */}
              <div className="w-8 text-center shrink-0 font-bold text-sm">
                {isAdminMember ? (
                  <div className="mx-auto h-7 w-7 rounded-full bg-gradient-to-br from-[#e8a840] via-[#e07850] to-[#3db8a0] flex items-center justify-center shadow-[0_0_10px_rgba(232,168,64,0.50)]">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                ) : isTop3 ? (
                  <span className={`text-lg ${
                    memberRank === 0 ? "text-[#FFD700]" :
                    memberRank === 1 ? "text-[#C0C0C0]" :
                    "text-[#CD7F32]"
                  }`}>{memberRank === 0 ? "🥇" : memberRank === 1 ? "🥈" : "🥉"}</span>
                ) : (
                  <span className="text-muted-foreground/50">#{memberRank! + 1}</span>
                )}
              </div>

              {/* Avatar */}
              <div className="relative shrink-0">
                {member.avatarUrl ? (
                  <div className={`h-11 w-11 rounded-full overflow-hidden ${isAdminMember ? "ring-2 ring-[#e8a840]" : isTop3 ? "ring-2 ring-[rgba(232,168,64,0.40)]" : ""}`}>
                    <Image
                      src={member.avatarUrl}
                      alt={member.displayName || member.username}
                      width={44}
                      height={44}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="h-11 w-11 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: isAdminMember ? "linear-gradient(135deg, #e8a840, #e07850, #3db8a0)" : `linear-gradient(135deg, ${tier.color}88, ${tier.color}44)` }}
                  >
                    {(member.displayName || member.username).charAt(0).toUpperCase()}
                  </div>
                )}
                {isAdminMember && (
                  <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-br from-[#e8a840] via-[#e07850] to-[#3db8a0] flex items-center justify-center shadow-[0_0_10px_rgba(232,168,64,0.60)]" title="Admin">
                    <Shield className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {isAdminMember ? (
                    <span className="font-bold text-sm font-[family-name:var(--font-orbitron)] bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">
                      {member.displayName || member.username}
                    </span>
                  ) : (
                    <span className="font-semibold text-sm group-hover:text-[#e8a840] transition-colors truncate">
                      {member.displayName || member.username}
                    </span>
                  )}
                  {/* Karma tier badge */}
                  {isAdminMember ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 text-white bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] shadow-[0_0_12px_rgba(232,168,64,0.40)]">
                      <Shield className="h-3 w-3" />
                      <span>Admin</span>
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0"
                      style={{
                        backgroundColor: tier.color + "22",
                        color: tier.color,
                        border: `1px solid ${tier.color}44`,
                      }}
                    >
                      <span>{tier.emoji}</span>
                      <span>{tier.label}</span>
                    </span>
                  )}
                  {member.isVerified && (
                    <span className="text-[#3db8a0]" title="Verified">✓</span>
                  )}
                </div>

                {/* Secondary info */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Joined {formatRelativeDate(member.createdAt, locale)}
                  </span>
                  {member.country && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {getCountryName(member.country)}
                    </span>
                  )}
                  {!isAdminMember && member.residentType && (
                    <span className="capitalize">{member.residentType === "resident" ? "🌴 Resident" : "✈️ Tourist"}</span>
                  )}
                </div>
              </div>

              {/* Stats - desktop */}
              <div className="hidden sm:flex items-center gap-4 shrink-0 text-xs text-muted-foreground">
                <div className="text-center min-w-[48px]">
                  {isAdminMember ? (
                    <div className="font-bold text-sm bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">∞</div>
                  ) : (
                    <div className="font-bold text-sm" style={{ color: tier.color }}>{member.karma}</div>
                  )}
                  <div className="text-[10px]">karma</div>
                </div>
                {member._count.posts > 0 && (
                  <div className="flex items-center gap-1" title="Posts">
                    <FileText className="h-3 w-3" />
                    {member._count.posts}
                  </div>
                )}
                {member._count.comments > 0 && (
                  <div className="flex items-center gap-1" title="Comments">
                    <MessageSquare className="h-3 w-3" />
                    {member._count.comments}
                  </div>
                )}
                {!isAdminMember && member._count.venueRatings > 0 && (
                  <div className="flex items-center gap-1" title="Venue reviews">
                    ⭐ {member._count.venueRatings}
                  </div>
                )}
              </div>

              {/* Karma - mobile (compact) */}
              <div className="sm:hidden text-center shrink-0">
                {isAdminMember ? (
                  <div className="font-bold text-sm bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">∞</div>
                ) : (
                  <div className="font-bold text-sm" style={{ color: tier.color }}>{member.karma}</div>
                )}
                <div className="text-[10px] text-muted-foreground">pts</div>
              </div>
            </Link>
          )
        })}
      </div>

      {members.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p>No members yet. Be the first to join!</p>
        </div>
      )}
    </div>
    </>
  )
}
