import { Link } from "@/i18n/navigation"
import { prisma } from "@/lib/prisma"
import { unstable_cache } from "next/cache"
import { Megaphone } from "lucide-react"
import { getTranslations } from "next-intl/server"

const getPinnedPosts = unstable_cache(async () => {
  return prisma.post.findMany({
    where: { isPinned: true, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      category: { select: { icon: true, name: true, slug: true } },
      author: { select: { displayName: true, username: true, isAdmin: true } },
    },
  })
}, ["pinned-posts"], { revalidate: 120 })

export async function Announcements() {
  const posts = await getPinnedPosts()
  const t = await getTranslations("sidebar")

  if (posts.length === 0) return null

  return (
    <div className="rounded-xl border satine-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Megaphone className="h-4 w-4 text-[#e8a840]" />
        <h3 className="text-sm font-bold font-[family-name:var(--font-orbitron)] bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">{t("announcements")}</h3>
      </div>
      <div className="space-y-3">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/post/${post.slug}`}
            className="flex gap-3 group"
          >
            <span className="text-[#e8a840] text-sm pt-0.5 shrink-0">📌</span>
            <div className="min-w-0">
              <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                {post.title}
              </p>
              <span className="text-[10px] text-muted-foreground">
                {post.author.isAdmin && <span className="text-[#e8a840] font-bold">Admin</span>}
                {post.author.isAdmin && " · "}
                {post.category.icon} {post.category.name}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
