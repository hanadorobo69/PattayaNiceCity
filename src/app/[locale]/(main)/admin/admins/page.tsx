import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getAdmins } from "@/actions/admin"
import { AdminManager } from "@/components/admin/admin-manager"
import { getTranslations } from "next-intl/server"

export const metadata = { title: "Manage Admins - Pattaya Nice City" }

export default async function ManageAdminsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const profile = await prisma.profile.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  })
  if (!profile?.isAdmin) redirect("/")

  const t = await getTranslations("adminDashboard")
  const admins = await getAdmins()

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold font-[family-name:var(--font-orbitron)] leading-none mb-8">
        <span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">{t("manageAdmins")}</span>
      </h1>

      <AdminManager admins={JSON.parse(JSON.stringify(admins))} currentUserId={session.user.id} />
    </div>
  )
}
