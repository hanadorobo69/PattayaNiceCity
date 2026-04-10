import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { VlogForm } from "@/components/admin/vlog-form"
import { BlogMediaManager } from "@/components/admin/blog-media-manager"

export const metadata = { title: "Edit Article - Admin" }

interface EditVlogPageProps {
  params: Promise<{ id: string }>
}

export default async function EditVlogPage({ params }: EditVlogPageProps) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const profile = await prisma.profile.findUnique({ where: { id: session.user.id }, select: { isAdmin: true } })
  if (!profile?.isAdmin) redirect("/")

  const { id } = await params
  const [vlog, categories] = await Promise.all([
    prisma.vlog.findUnique({
      where: { id },
      include: {
        tags: { select: { id: true, name: true, slug: true } },
        media: { orderBy: { order: "asc" } },
        blogCategory: { select: { id: true } },
      },
    }),
    prisma.blogCategory.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true, slug: true, color: true } }),
  ])
  if (!vlog) redirect("/admin/vlogs")

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-orbitron)] bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">Edit Article</h1>
        <p className="text-sm text-muted-foreground">{vlog.title}</p>
      </div>

      <VlogForm initialData={JSON.parse(JSON.stringify(vlog))} categories={categories} />

      {/* Media manager - only available after article is created */}
      <BlogMediaManager vlogId={vlog.id} initialMedia={JSON.parse(JSON.stringify(vlog.media))} />
    </div>
  )
}
