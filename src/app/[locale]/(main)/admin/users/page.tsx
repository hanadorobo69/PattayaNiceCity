import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getUsers } from "@/actions/admin"
import { AdminUserList } from "@/components/admin/admin-user-list"

export const metadata = { title: "Manage Users - Pattaya Nice City" }

export default async function ManageUsersPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const profile = await prisma.profile.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  })
  if (!profile?.isAdmin) redirect("/")

  const users = await getUsers()

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold font-[family-name:var(--font-orbitron)] leading-none mb-8">
        <span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">Manage Users</span>
      </h1>

      <AdminUserList users={JSON.parse(JSON.stringify(users))} currentUserId={session.user.id} />
    </div>
  )
}
