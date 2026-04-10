import { redirect } from "next/navigation"
import { Link } from "@/i18n/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { VenueTable } from "@/components/admin/venue-table"
import { Plus } from "lucide-react"
import { getTranslations } from "next-intl/server"

export const metadata = { title: "Manage Spots - Admin" }

export default async function AdminVenuesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const profile = await prisma.profile.findUnique({ where: { id: session.user.id }, select: { isAdmin: true } })
  if (!profile?.isAdmin) redirect("/")

  const t = await getTranslations("adminVenues")
  const tc = await getTranslations("categoryNames")

  const venues = await prisma.venue.findMany({
    select: {
      id: true, slug: true, name: true, address: true, district: true,
      isVerified: true, isActive: true, permanentlyClosed: true, needsVerification: true,
      description: true, hours: true, lat: true, lng: true, imageUrl: true, phone: true, createdAt: true,
      category: { select: { name: true, slug: true, icon: true } },
      _count: { select: { media: true } },
    },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  })

  // Build labels object for the client component
  const categories = await prisma.category.findMany({ select: { slug: true, name: true } })
  const labels: Record<string, string> = {
    name: t("name"), category: t("category"), district: t("district" as any) || "District",
    status: t("status"), verified: t("verified"), inactive: t("inactive"), active: t("active"),
    closed: t("closed" as any) || "Closed",
    searchPlaceholder: t("searchPlaceholder" as any) || "Search spots...",
    noResults: t("noResults" as any) || "No spots found",
    prev: t("prev" as any) || "Previous", next: t("next" as any) || "Next",
  }
  for (const cat of categories) {
    labels[`cat_${cat.slug}`] = tc.has(cat.slug) ? tc(cat.slug) : cat.name
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-[family-name:var(--font-orbitron)]">
            <span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">{t("title")}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("spotsTotal", { count: venues.length })}</p>
        </div>
        <Link href="/admin/venues/new"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-[#e8a840] to-[#e07850] text-white shadow-[0_0_18px_rgba(232,168,64,0.4)] transition-all hover:shadow-[0_0_24px_rgba(232,168,64,0.5)]">
          <Plus className="h-4 w-4" /> {t("addSpot")}
        </Link>
      </div>

      <VenueTable venues={JSON.parse(JSON.stringify(venues))} labels={labels} />
    </div>
  )
}
