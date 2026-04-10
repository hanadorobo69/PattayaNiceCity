import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { getCurrentUser, signOut } from "@/actions/auth";
import { HeaderActions } from "./header-client";
import { MobileNav } from "./mobile-nav";
import { MobileLogoMenu } from "./mobile-logo-menu";
import { NavLinks } from "./nav-links";
import { getTranslations } from "next-intl/server";

export async function Header() {
  const t = await getTranslations("nav");
  const userResult = await getCurrentUser();
  const currentUser = userResult.success ? userResult.data : null;

  const serializedUser = currentUser
    ? JSON.parse(JSON.stringify({
        id: currentUser.id,
        email: currentUser.email,
        profile: currentUser.profile
          ? {
              username: currentUser.profile.username,
              displayName: currentUser.profile.displayName,
              avatarUrl: currentUser.profile.avatarUrl,
              isAdmin: currentUser.profile.isAdmin,
            }
          : null,
      }))
    : null;

  const mobileUser = serializedUser?.profile
    ? {
        username: serializedUser.profile.username,
        displayName: serializedUser.profile.displayName,
        avatarUrl: serializedUser.profile.avatarUrl,
        isAdmin: serializedUser.profile.isAdmin,
      }
    : null;

  return (
    <>
      <header className="sticky top-0 z-[160] w-full border-b border-[rgba(232,168,64,0.2)] header-bg" style={{ background: "rgba(26,21,16,0.88)", backdropFilter: "blur(12px)", boxShadow: "0 0 20px rgba(232,168,64,0.08), 0 1px 0 rgba(232,168,64,0.15)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex h-14 md:h-[4.25rem] items-center justify-between gap-4">
          {/* Logo - mobile: icon opens menu, text goes home; desktop: both go home */}
          <div className="flex items-center gap-2 shrink-0 md:ml-[30px]">
            {/* Wide logo */}
            <Link href="/">
              <Image src="/assets/about/logo_noreflect.png" alt="Pattaya Nice City" width={145} height={48} className="h-8 md:h-[44px] w-auto object-contain" priority />
            </Link>
            {/* Lady - accrochée en bas du header */}
            <Link href="/" className="shrink-0 self-end">
              <Image src="/assets/about/lady-background.png" alt="" width={53} height={53} className="object-cover object-top w-[42px] h-[53px] md:w-[53px] md:h-[62px]" priority />
            </Link>
          </div>

          {/* Nav - desktop only */}
          <nav className="hidden md:flex items-center gap-6 flex-1 justify-center">
            <NavLinks items={[
              { href: "/", label: t("spots"), icon: "MapPin" },
              { href: "/community", label: t("community"), icon: "Info" },
              ...(serializedUser ? [{ href: "/members", label: "Squad", icon: "Users" }] : []),
              { href: "/about", label: t("about"), icon: "Heart" },
              ...(serializedUser?.profile?.isAdmin
                ? [{ href: "/admin", label: t("admin"), icon: "Shield", adminOnly: true }]
                : []
              ),
            ]} />
          </nav>

          {/* Right - Theme / Profile */}
          <HeaderActions user={serializedUser} signOutAction={signOut} />
        </div>
      </header>

      {/* Mobile bottom nav bar */}
      <MobileNav user={mobileUser} />
    </>
  );
}
