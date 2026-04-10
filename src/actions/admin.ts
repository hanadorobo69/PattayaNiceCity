"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/auth/password"
import { revalidatePath } from "next/cache"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Not authenticated")
  const profile = await prisma.profile.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  })
  if (!profile?.isAdmin) throw new Error("Not authorized")
  return session.user.id
}

export async function getAdmins() {
  await requireAdmin()
  return prisma.profile.findMany({
    where: { isAdmin: true },
    select: { id: true, username: true, email: true, displayName: true, avatarUrl: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  })
}

export async function createAdmin(formData: FormData) {
  await requireAdmin()

  const username = (formData.get("username") as string)?.trim()
  const email = (formData.get("email") as string)?.trim()
  const password = formData.get("password") as string

  if (!username || !email || !password) {
    return { success: false, error: "All fields are required" }
  }
  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" }
  }

  const existingUsername = await prisma.profile.findUnique({ where: { username } })
  if (existingUsername) return { success: false, error: "Username already taken" }

  const existingEmail = await prisma.profile.findUnique({ where: { email } })
  if (existingEmail) return { success: false, error: "Email already in use" }

  const hashed = await hashPassword(password)

  await prisma.profile.create({
    data: {
      username,
      email,
      password: hashed,
      displayName: username,
      isAdmin: true,
      isVerified: true,
    },
  })

  revalidatePath("/admin/admins")
  return { success: true }
}

export async function removeAdmin(id: string) {
  const currentUserId = await requireAdmin()

  if (id === currentUserId) {
    return { success: false, error: "You cannot remove yourself as admin" }
  }

  const target = await prisma.profile.findUnique({ where: { id }, select: { isAdmin: true } })
  if (!target?.isAdmin) return { success: false, error: "User is not an admin" }

  await prisma.profile.update({
    where: { id },
    data: { isAdmin: false, isVerified: false },
  })

  revalidatePath("/admin/admins")
  return { success: true }
}

export async function getUsers(search?: string) {
  await requireAdmin()
  const where = search
    ? {
        OR: [
          { username: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { displayName: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {}
  return prisma.profile.findMany({
    where,
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      isAdmin: true,
      isVerified: true,
      nationality: true,
      createdAt: true,
      _count: { select: { posts: true, comments: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })
}

export async function adminDeleteUser(userId: string) {
  const currentUserId = await requireAdmin()

  if (userId === currentUserId) {
    return { success: false, error: "You cannot delete yourself" }
  }

  const target = await prisma.profile.findUnique({ where: { id: userId }, select: { isAdmin: true, email: true } })
  if (!target) return { success: false, error: "User not found" }
  if (target.isAdmin) return { success: false, error: "Cannot delete an admin account. Remove admin status first." }

  try {
    await prisma.$transaction([
      prisma.post.updateMany({ where: { authorId: userId }, data: { deletedAt: new Date() } }),
      prisma.comment.updateMany({ where: { authorId: userId }, data: { deletedAt: new Date() } }),
      prisma.venueComment.updateMany({ where: { authorId: userId }, data: { deletedAt: new Date() } }),
      prisma.vote.deleteMany({ where: { userId } }),
      prisma.notification.deleteMany({ where: { OR: [{ recipientId: userId }, { actorId: userId }] } }),
      prisma.passwordResetToken.deleteMany({ where: { email: target.email } }),
      prisma.profile.delete({ where: { id: userId } }),
    ])
    revalidatePath("/admin/users")
    return { success: true }
  } catch (error) {
    console.error("Admin delete user error:", error)
    return { success: false, error: "Failed to delete user" }
  }
}

export async function promoteToAdmin(formData: FormData) {
  await requireAdmin()

  const email = (formData.get("email") as string)?.trim()
  if (!email) return { success: false, error: "Email is required" }

  const profile = await prisma.profile.findUnique({ where: { email } })
  if (!profile) return { success: false, error: "No user found with this email" }
  if (profile.isAdmin) return { success: false, error: "User is already an admin" }

  await prisma.profile.update({
    where: { id: profile.id },
    data: { isAdmin: true, isVerified: true },
  })

  revalidatePath("/admin/admins")
  return { success: true }
}
