import { redirect } from "next/navigation"
import { Link } from "@/i18n/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { formatRelativeDate } from "@/lib/utils"
import { DeleteButton } from "@/components/admin/delete-button"
import { ExternalLink } from "lucide-react"
import { getTranslations, getLocale } from "next-intl/server"

export const metadata = { title: "Manage Posts - Admin" }

export default async function AdminPostsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const profile = await prisma.profile.findUnique({ where: { id: session.user.id }, select: { isAdmin: true } })
  if (!profile?.isAdmin) redirect("/")

  const t = await getTranslations("adminPosts")
  const tc = await getTranslations("categoryNames")
  const locale = await getLocale()
  const td = await getTranslations("adminDashboard")

  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      author: { select: { username: true } },
      category: { select: { name: true, slug: true, icon: true } },
      _count: { select: { comments: { where: { deletedAt: null } }, votes: true } },
    },
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-[family-name:var(--font-orbitron)]">
          <span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">{t("title")}</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{posts.length} posts</p>
      </div>

      <div className="rounded-xl border satine-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(232,168,64,0.20)] bg-[rgba(75,35,120,0.12)]">
              <th className="text-left p-3 font-medium text-muted-foreground">{t("titleCol")}</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">{t("author")}</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">{t("category")}</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">{t("score")}</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">{t("date")}</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(232,168,64,0.06)]">
            {posts.map(post => (
              <tr key={post.id} className="hover:bg-[rgba(75,35,120,0.08)] transition-colors">
                <td className="p-3 max-w-xs">
                  <span className="font-medium line-clamp-1">{post.title}</span>
                </td>
                <td className="p-3 hidden sm:table-cell text-muted-foreground text-xs">@{post.author.username}</td>
                <td className="p-3 hidden md:table-cell">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {post.category.icon} {tc.has(post.category.slug) ? tc(post.category.slug) : post.category.name}
                  </span>
                </td>
                <td className="p-3 hidden lg:table-cell">
                  <span className={`text-xs font-semibold ${post.score > 0 ? "text-orange-400" : post.score < 0 ? "text-blue-400" : "text-muted-foreground"}`}>
                    {post.score > 0 ? "+" : ""}{post.score}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">· {post._count.comments} comments</span>
                </td>
                <td className="p-3 hidden lg:table-cell text-xs text-muted-foreground">
                  {formatRelativeDate(post.createdAt, locale)}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1 justify-end">
                    <Link href={`/post/${post.slug}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      {t("view")} <ExternalLink className="h-3 w-3" />
                    </Link>
                    <DeleteButton id={post.id} type="post" itemName={post.title} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
