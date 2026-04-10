export const DISTRICTS = [
  { id: "walking-street", label: "Walking Street Pattaya" },
  { id: "soi-6", label: "Soi 6" },
  { id: "tree-town", label: "Tree Town" },
  { id: "bong-koch-8", label: "Bong Koch 8" },
  { id: "pattaya-beach", label: "Pattaya Beach" },
  { id: "jomtien", label: "Jomtien" },
  { id: "pratumnak", label: "Pratumnak" },
  { id: "n-a", label: "N/A" },
] as const

export type DistrictId = (typeof DISTRICTS)[number]["id"]

export function getDistrictLabel(id: string): string | undefined {
  return DISTRICTS.find((d) => d.id === id)?.label
}
