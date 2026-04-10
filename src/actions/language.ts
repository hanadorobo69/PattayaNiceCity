"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import { isValidLocale, type Locale } from "@/i18n/config";

export async function setLanguage(locale: string) {
  if (!isValidLocale(locale)) {
    return { success: false, error: "Invalid locale" };
  }

  // Set cookie for all users (logged in or not)
  const cookieStore = await cookies();
  cookieStore.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  // If logged in, persist to DB
  const userId = await getCurrentUserId();
  if (userId) {
    const profile = await prisma.profile.findFirst({
      where: { id: userId },
      select: { id: true },
    });
    if (profile) {
      await prisma.profile.update({
        where: { id: profile.id },
        data: { preferredLanguage: locale },
      });
    }
  }

  return { success: true };
}

export async function getLanguage(): Promise<Locale> {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value;
  return locale && isValidLocale(locale) ? locale : "en";
}

/** Sync cookie locale to DB for logged-in users (fire-and-forget from layout) */
export async function syncLanguagePreference() {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  if (!cookieLocale || !isValidLocale(cookieLocale)) return;

  const userId = await getCurrentUserId();
  if (!userId) return;

  const profile = await prisma.profile.findFirst({
    where: { id: userId },
    select: { id: true, preferredLanguage: true },
  });
  if (profile && profile.preferredLanguage !== cookieLocale) {
    await prisma.profile.update({
      where: { id: profile.id },
      data: { preferredLanguage: cookieLocale },
    });
  }
}
