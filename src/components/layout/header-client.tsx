"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { User } from "lucide-react";
import { LanguageSelector } from "./language-selector";
import { ThemeSelector } from "./theme-selector";
import { NotificationBadge } from "@/components/notifications/notification-badge";
import { useTranslations } from "next-intl";

// Plain serialized user - no Prisma objects
interface HeaderUser {
  id: string;
  email: string | undefined;
  profile: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isAdmin: boolean;
  } | null;
}

// ── Main export ──
export function HeaderActions({
  user,
}: {
  user: HeaderUser | null;
  signOutAction: () => Promise<void>;
}) {
  const t = useTranslations("header");

  return (
    <div className="flex items-center gap-3 shrink-0">
      <ThemeSelector />
      <LanguageSelector />
      {user?.profile?.username ? (
        <Link
          href={`/profile/${user.profile.username}`}
          className="relative"
          title={t("myProfile")}
        >
          <NotificationBadge />
          <span className="h-9 w-9 rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#e8a840] to-[#e07850] text-white text-xs font-bold hover:opacity-90 transition-opacity">
            {user.profile.avatarUrl ? (
              <Image src={user.profile.avatarUrl} alt={user.profile.displayName || user.profile.username} width={36} height={36} className="h-full w-full object-cover" />
            ) : (
              (user.profile.displayName || user.profile.username).split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
            )}
          </span>
        </Link>
      ) : (
        <Link
          href="/login"
          className="h-9 w-9 rounded-lg flex items-center justify-center text-[#e8a840] hover:text-[#3db8a0] hover:bg-[rgba(232,168,64,0.12)] transition-colors"
          title={t("signIn")}
        >
          <User className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
