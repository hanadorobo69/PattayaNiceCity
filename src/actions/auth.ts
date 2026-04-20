"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, safeError } from "@/lib/prisma";
import { auth, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "@/auth";
import { hashPassword } from "@/lib/auth/password";
import { loginSchema, registerSchema } from "@/validations/auth";
import type { ActionResult, AuthUser } from "@/types";
import type { Profile } from "@prisma/client";
import { AuthError } from "next-auth";
import { rateLimit } from "@/lib/rate-limit";
import { randomBytes } from "crypto";
import { sendPasswordResetEmail } from "@/lib/mail";

export async function signIn(formData: FormData): Promise<ActionResult<void>> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  // Rate limit: 5 attempts per email per 15 minutes
  const rl = rateLimit(`login:${raw.email?.toLowerCase()}`, 5, 15 * 60_000)
  if (!rl.ok) return { success: false, error: "Too many login attempts. Please try again later." }

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  try {
    await nextAuthSignIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/",
    });
  } catch (error: unknown) {
    const err = error as { digest?: string; type?: string; message?: string; name?: string };
    console.error("[LOGIN DEBUG]", {
      name: err?.name,
      type: err?.type,
      message: err?.message,
      digest: err?.digest,
      isAuthError: error instanceof AuthError,
    });
    if (error instanceof AuthError) {
      return { success: false, error: "Invalid email or password" };
    }
    // Auth.js throws a NEXT_REDIRECT on successful login - let it propagate
    if (err?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    return { success: false, error: "Invalid email or password" };
  }
}

export async function signUp(formData: FormData): Promise<ActionResult<void>> {
  const raw = {
    username: formData.get("username") as string,
    email: formData.get("email") as string,
    dateOfBirth: formData.get("dateOfBirth") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
    nationality: (formData.get("nationality") as string) || undefined,
    residentType: (formData.get("residentType") as string) || undefined,
  };

  // Rate limit: 3 registrations per IP-like key per hour
  const rl = rateLimit(`register:${raw.email?.toLowerCase()}`, 3, 60 * 60_000)
  if (!rl.ok) return { success: false, error: "TOO_MANY_ATTEMPTS" }

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const { username, email, password, dateOfBirth, nationality, residentType } = parsed.data;

  const existingUsername = await prisma.profile.findUnique({ where: { username } });
  if (existingUsername) {
    return { success: false, error: "USERNAME_TAKEN" };
  }

  const existingEmail = await prisma.profile.findUnique({ where: { email } });
  if (existingEmail) {
    return { success: false, error: "EMAIL_TAKEN" };
  }

  try {
    const hashed = await hashPassword(password);

    await (prisma.profile as any).create({
      data: {
        username,
        email,
        password: hashed,
        displayName: username,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        nationality: nationality?.trim() || null,
        residentType: residentType || null,
      },
    });

    // Auto sign-in after registration
    try {
      await nextAuthSignIn("credentials", {
        email,
        password,
        redirect: false,
      });
    } catch (error) {
      if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    }

    revalidatePath("/", "layout");
    redirect("/");
  } catch (error) {
    if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Registration error:", error);
    return { success: false, error: "An error occurred. Please try again." };
  }
}

export async function signOut(): Promise<void> {
  await nextAuthSignOut({ redirect: false });
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signInWithGoogle(): Promise<void> {
  await nextAuthSignIn("google", { redirectTo: "/" });
}

export async function signInWithDiscord(): Promise<void> {
  await nextAuthSignIn("discord", { redirectTo: "/" });
}

export async function signInWithFacebook(): Promise<void> {
  await nextAuthSignIn("facebook", { redirectTo: "/" });
}

export async function signInWithReddit(): Promise<void> {
  await nextAuthSignIn("reddit", { redirectTo: "/" });
}

export async function getCurrentUser(): Promise<ActionResult<AuthUser | null>> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: true, data: null };

    const profile = await prisma.profile.findUnique({ where: { id: session.user.id } });
    if (!profile) return { success: true, data: null };

    return {
      success: true,
      data: { id: profile.id, email: profile.email, profile },
    };
  } catch {
    return { success: false, error: "Failed to get current user" };
  }
}

export async function getUserProfile(userId: string): Promise<ActionResult<Profile | null>> {
  try {
    const profile = await prisma.profile.findUnique({ where: { id: userId } });
    return { success: true, data: profile };
  } catch {
    return { success: false, error: "Failed to get profile" };
  }
}

export async function updateProfile(formData: FormData): Promise<ActionResult<Profile>> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "You must be logged in" };

  const displayName = (formData.get("displayName") as string)?.trim() || null;
  const bio = (formData.get("bio") as string)?.trim() || null;
  const avatarUrl = (formData.get("avatarUrl") as string)?.trim() || null;
  const dateOfBirthStr = (formData.get("dateOfBirth") as string)?.trim() || null;
  const nationality = (formData.get("nationality") as string)?.trim() || null;
  const residentType = (formData.get("residentType") as string)?.trim() || null;

  const dateOfBirth = dateOfBirthStr ? new Date(dateOfBirthStr) : undefined;

  try {
    const profile = await prisma.profile.update({
      where: { id: session.user.id },
      data: {
        displayName,
        bio,
        avatarUrl,
        nationality,
        ...(dateOfBirth && !isNaN(dateOfBirth.getTime()) ? { dateOfBirth } : {}),
        ...(residentType !== undefined ? { residentType } : {}),
      },
    });
    revalidatePath(`/profile/${profile.username}`);
    return { success: true, data: profile };
  } catch (error) {
    return { success: false, error: safeError("Failed to update profile", error) };
  }
}

export async function requestVerification(formData: FormData): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "You must be logged in" };

  const businessName = formData.get("businessName") as string;
  const businessType = formData.get("businessType") as string;
  const contactEmail = formData.get("contactEmail") as string;
  const message = formData.get("message") as string;

  if (!businessName?.trim() || !businessType?.trim()) {
    return { success: false, error: "Business name and type are required" };
  }

  try {
    await prisma.verificationRequest.upsert({
      where: { profileId: session.user.id },
      create: {
        profileId: session.user.id,
        businessName: businessName.trim(),
        businessType: businessType.trim(),
        contactEmail: contactEmail?.trim() || null,
        message: message?.trim() || null,
      },
      update: {
        businessName: businessName.trim(),
        businessType: businessType.trim(),
        contactEmail: contactEmail?.trim() || null,
        message: message?.trim() || null,
        status: "pending",
      },
    });
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: safeError("Failed to submit verification request", error) };
  }
}

// ═══════ Delete Account ═══════

export async function deleteAccount(): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "You must be logged in" };

  try {
    const profile = await prisma.profile.findUnique({ where: { id: session.user.id } });
    if (!profile) return { success: false, error: "Account not found" };

    // Prevent admin from deleting their own account
    if (profile.isAdmin) return { success: false, error: "Admin accounts cannot be deleted this way" };

    // Soft-delete user content, then delete profile
    await prisma.$transaction([
      prisma.post.updateMany({ where: { authorId: profile.id }, data: { deletedAt: new Date() } }),
      prisma.comment.updateMany({ where: { authorId: profile.id }, data: { deletedAt: new Date() } }),
      prisma.venueComment.updateMany({ where: { authorId: profile.id }, data: { deletedAt: new Date() } }),
      prisma.vote.deleteMany({ where: { userId: profile.id } }),
      prisma.notification.deleteMany({ where: { OR: [{ recipientId: profile.id }, { actorId: profile.id }] } }),
      prisma.passwordResetToken.deleteMany({ where: { email: profile.email } }),
      prisma.profile.delete({ where: { id: profile.id } }),
    ]);

    await nextAuthSignOut({ redirect: false });
    revalidatePath("/", "layout");
    redirect("/");
  } catch (error) {
    if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Delete account error:", error);
    return { success: false, error: "An error occurred. Please try again." };
  }
}

// ═══════ Password Reset ═══════

export async function requestPasswordReset(formData: FormData): Promise<ActionResult<void>> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  if (!email) return { success: false, error: "Email is required" };

  // Rate limit: 3 reset requests per email per hour
  const rl = rateLimit(`reset:${email}`, 3, 60 * 60_000);
  if (!rl.ok) return { success: false, error: "Too many reset requests. Please try again later." };

  try {
    // Always return success to prevent email enumeration
    const profile = await prisma.profile.findUnique({ where: { email } });
    if (!profile) return { success: true, data: undefined };

    // Delete any existing tokens for this email
    await prisma.passwordResetToken.deleteMany({ where: { email } });

    // Generate token (64 hex chars)
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60_000); // 1 hour

    await prisma.passwordResetToken.create({
      data: { email, token, expiresAt },
    });

    try {
      await sendPasswordResetEmail({ email, token });
    } catch (err) {
      console.error("Failed to send password reset email:", err);
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Password reset request error:", error);
    return { success: false, error: "An error occurred. Please try again." };
  }
}

export async function resetPassword(formData: FormData): Promise<ActionResult<void>> {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!token) return { success: false, error: "Invalid reset link" };
  if (!password || password.length < 8) return { success: false, error: "Password must be at least 8 characters" };
  if (password !== confirmPassword) return { success: false, error: "Passwords do not match" };

  try {
    const record = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!record) return { success: false, error: "Invalid or expired reset link" };
    if (record.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({ where: { id: record.id } });
      return { success: false, error: "This reset link has expired. Please request a new one." };
    }

    const profile = await prisma.profile.findUnique({ where: { email: record.email } });
    if (!profile) return { success: false, error: "Account not found" };

    const hashed = await hashPassword(password);

    await prisma.profile.update({
      where: { id: profile.id },
      data: { password: hashed },
    });

    // Clean up token
    await prisma.passwordResetToken.delete({ where: { id: record.id } });

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Password reset error:", error);
    return { success: false, error: "An error occurred. Please try again." };
  }
}
