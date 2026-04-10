import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { VenueForm } from "@/components/admin/venue-form"
import { DeleteVenueButton } from "@/components/admin/delete-venue-button"
import { VenueMenuMediaManager } from "@/components/admin/venue-menu-media-manager"
import { Separator } from "@/components/ui/separator"

export const metadata = { title: "Edit Spot - Admin" }

interface EditVenuePageProps {
  params: Promise<{ id: string }>
}

export default async function EditVenuePage({ params }: EditVenuePageProps) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const profile = await prisma.profile.findUnique({ where: { id: session.user.id }, select: { isAdmin: true } })
  if (!profile?.isAdmin) redirect("/")

  const { id } = await params
  const venue = await prisma.venue.findUnique({ where: { id }, include: { media: { orderBy: { order: "asc" } }, menuMedia: { orderBy: { order: "asc" } } } })
  if (!venue) redirect("/admin/venues")

  const categories = await prisma.category.findMany()
  categories.sort((a: any, b: any) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99))

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-orbitron)] bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">Edit Spot</h1>
          <p className="text-sm text-muted-foreground">{venue.name}</p>
        </div>
        <DeleteVenueButton venueId={venue.id} venueName={venue.name} />
      </div>
      <VenueForm
        categories={categories}
        initialData={JSON.parse(JSON.stringify(venue))}
      />

      <Separator />

      <div className="rounded-xl border bg-card p-6 space-y-4">
        <VenueMenuMediaManager
          venueId={venue.id}
          venueSlug={venue.slug}
          initialMedia={venue.menuMedia}
        />
      </div>
    </div>
  )
}
