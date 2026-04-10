import { redirect } from "next/navigation"

interface PlacesPageProps {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function PlacesPage({ searchParams }: PlacesPageProps) {
  const params = await searchParams
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, v)
  }
  const s = qs.toString()
  redirect(s ? `/?${s}` : "/")
}
