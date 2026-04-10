import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { VenueForm } from "@/components/admin/venue-form"
import { getTranslations } from "next-intl/server"

export const metadata = { title: "Add Spot - Admin" }

export default async function NewVenuePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const profile = await prisma.profile.findUnique({ where: { id: session.user.id }, select: { isAdmin: true } })
  if (!profile?.isAdmin) redirect("/")

  const t = await getTranslations("adminVenues")
  const categories = await prisma.category.findMany()
  categories.sort((a: any, b: any) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-orbitron)] bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">{t("addNewSpot")}</h1>
        <p className="text-sm text-muted-foreground">{t("fillSpotDetails")}</p>
      </div>
      <VenueForm categories={categories} />
    </div>
  )
}
