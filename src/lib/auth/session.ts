import { auth } from "@/auth"

export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

export { auth as getServerSession }
