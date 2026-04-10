import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { VlogForm } from "@/components/admin/vlog-form"

export const metadata = { title: "Add Article - Admin" }

export default async function NewVlogPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const profile = await prisma.profile.findUnique({ where: { id: session.user.id }, select: { isAdmin: true } })
  if (!profile?.isAdmin) redirect("/")

  const categories = await prisma.blogCategory.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true, slug: true, color: true } })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-orbitron)] bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">Add Article</h1>
      </div>
      <VlogForm categories={categories} />
    </div>
  )
}
