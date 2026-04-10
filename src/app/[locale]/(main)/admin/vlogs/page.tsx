import { redirect } from "next/navigation"
import { Link } from "@/i18n/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { deleteVlog } from "@/actions/vlogs"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2, FileText, Eye, EyeOff, Clock } from "lucide-react"
import { formatRelativeDate } from "@/lib/utils"

export const metadata = { title: "Manage Blog - Admin" }

export default async function AdminVlogsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const profile = await prisma.profile.findUnique({ where: { id: session.user.id }, select: { isAdmin: true } })
  if (!profile?.isAdmin) redirect("/")

  const vlogs = await prisma.vlog.findMany({
    include: {
      author: { select: { username: true } },
      tags: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold font-[family-name:var(--font-orbitron)] bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">Manage Blog</h1>
          <Button asChild size="sm">
            <Link href="/admin/vlogs/new" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add Article
            </Link>
          </Button>
        </div>
      </div>

      {vlogs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No articles yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border satine-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(232,168,64,0.15)] text-xs text-muted-foreground">
                <th className="text-left p-3 font-medium">Title</th>
                <th className="text-left p-3 font-medium hidden sm:table-cell">Author</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Date</th>
                <th className="text-center p-3 font-medium hidden lg:table-cell">Views</th>
                <th className="text-center p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vlogs.map((vlog) => (
                <tr key={vlog.id} className="border-b border-[rgba(232,168,64,0.08)] hover:bg-[rgba(232,168,64,0.03)]">
                  <td className="p-3">
                    <Link href={`/vlogs/${vlog.slug}`} className="hover:text-[#e8a840] font-medium">
                      {vlog.title}
                    </Link>
                    {vlog.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {vlog.tags.slice(0, 3).map((t, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(224,120,80,0.15)] text-[#e07850]">{t.name}</span>
                        ))}
                      </div>
                    )}
                    {vlog.readingTime > 0 && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-2.5 w-2.5" /> {vlog.readingTime} min
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground hidden sm:table-cell">{vlog.author.username}</td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">{formatRelativeDate(vlog.createdAt, "en")}</td>
                  <td className="p-3 text-center text-muted-foreground hidden lg:table-cell">{vlog.viewCount.toLocaleString()}</td>
                  <td className="p-3 text-center">
                    {vlog.isPublished ? (
                      <span className="inline-flex items-center gap-1 text-green-400 text-xs"><Eye className="h-3 w-3" /> Live</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-yellow-400 text-xs"><EyeOff className="h-3 w-3" /> Draft</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                        <Link href={`/admin/vlogs/${vlog.id}/edit`}><Pencil className="h-3.5 w-3.5" /></Link>
                      </Button>
                      <form action={async () => { "use server"; await deleteVlog(vlog.id) }}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" type="submit">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
