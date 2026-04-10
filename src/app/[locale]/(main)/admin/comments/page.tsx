import { redirect } from "next/navigation"
import { Link } from "@/i18n/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { formatRelativeDate } from "@/lib/utils"
import { DeleteButton } from "@/components/admin/delete-button"
import { MessageSquare } from "lucide-react"
import { getTranslations, getLocale } from "next-intl/server"

const prismaAny = prisma as any

export const metadata = { title: "Manage Comments - Admin" }

export default async function AdminCommentsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const profile = await prisma.profile.findUnique({ where: { id: session.user.id }, select: { isAdmin: true } })
  if (!profile?.isAdmin) redirect("/")

  const t = await getTranslations("adminComments")
  const locale = await getLocale()
  const td = await getTranslations("adminDashboard")

  const postComments = await prisma.comment.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      author: { select: { username: true } },
      post: { select: { title: true, slug: true } },
    },
  })

  let venueComments: any[] = []
  if (prismaAny.venueComment) {
    try {
      venueComments = await prismaAny.venueComment.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          author: { select: { username: true } },
          venue: { select: { name: true, slug: true } },
        },
      })
    } catch {}
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-[family-name:var(--font-orbitron)]">
          <span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">{t("title")}</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {postComments.length} community · {venueComments.length} spots
        </p>
      </div>

      {/* Post comments */}
      <div>
        <h2 className="font-semibold text-sm flex items-center gap-2 mb-3">
          <MessageSquare className="h-4 w-4 text-purple-400" />
          {t("communityComments")}
          <span className="text-xs text-muted-foreground font-normal">({postComments.length})</span>
        </h2>
        <div className="rounded-xl border satine-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(232,168,64,0.20)] bg-[rgba(75,35,120,0.12)]">
                <th className="text-left p-3 font-medium text-muted-foreground">{t("commentCol")}</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">{t("author")}</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">{t("post")}</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">{t("date")}</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(232,168,64,0.06)]">
              {postComments.map(c => (
                <tr key={c.id} className="hover:bg-[rgba(75,35,120,0.08)] transition-colors">
                  <td className="p-3 max-w-xs"><span className="line-clamp-1 text-xs">{c.content}</span></td>
                  <td className="p-3 hidden sm:table-cell text-muted-foreground text-xs">@{c.author.username}</td>
                  <td className="p-3 hidden md:table-cell">
                    <Link href={`/post/${c.post.slug}`} className="text-xs text-primary hover:underline line-clamp-1">{c.post.title}</Link>
                  </td>
                  <td className="p-3 hidden lg:table-cell text-xs text-muted-foreground">{formatRelativeDate(c.createdAt, locale)}</td>
                  <td className="p-3 text-right">
                    <DeleteButton id={c.id} type="comment" itemName={c.content.slice(0, 40)} />
                  </td>
                </tr>
              ))}
              {postComments.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center text-xs text-muted-foreground">{t("noComments")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Venue (Spot) comments */}
      <div>
        <h2 className="font-semibold text-sm flex items-center gap-2 mb-3">
          <MessageSquare className="h-4 w-4 text-green-400" />
          {t("spotComments")}
          <span className="text-xs text-muted-foreground font-normal">({venueComments.length})</span>
        </h2>
        <div className="rounded-xl border satine-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(232,168,64,0.20)] bg-[rgba(75,35,120,0.12)]">
                <th className="text-left p-3 font-medium text-muted-foreground">{t("commentCol")}</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">{t("author")}</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">{t("spot")}</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">{t("date")}</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(232,168,64,0.06)]">
              {venueComments.map((c: any) => (
                <tr key={c.id} className="hover:bg-[rgba(75,35,120,0.08)] transition-colors">
                  <td className="p-3 max-w-xs"><span className="line-clamp-1 text-xs">{c.content}</span></td>
                  <td className="p-3 hidden sm:table-cell text-muted-foreground text-xs">@{c.author.username}</td>
                  <td className="p-3 hidden md:table-cell">
                    <Link href={`/places/${c.venue.slug}`} className="text-xs text-primary hover:underline line-clamp-1">{c.venue.name}</Link>
                  </td>
                  <td className="p-3 hidden lg:table-cell text-xs text-muted-foreground">{formatRelativeDate(c.createdAt, locale)}</td>
                  <td className="p-3 text-right">
                    <DeleteButton id={c.id} type="venue-comment" itemName={c.content.slice(0, 40)} />
                  </td>
                </tr>
              ))}
              {venueComments.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center text-xs text-muted-foreground">{t("noComments")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
