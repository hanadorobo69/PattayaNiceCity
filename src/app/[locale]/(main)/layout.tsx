import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Header } from "@/components/layout/header";
import { SunsetBackground } from "@/components/layout/sunset-background";
import { BackButton } from "@/components/ui/back-button";
import { PullToRefresh } from "@/components/layout/pull-to-refresh";
import { getTranslations } from "next-intl/server";
import { syncLanguagePreference } from "@/actions/language";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("layout");
  // Lazily sync cookie locale to DB for logged-in users
  try { await syncLanguagePreference(); } catch {}
  return (
    <div className="site-bg min-h-screen flex flex-col relative overflow-x-clip">
      {/* Neon breathing background + scanlines */}
      <SunsetBackground />

      {/* All content above the decorative layers */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header />
        <PullToRefresh />
        <BackButton floating />
        <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
          {children}
        </main>
        <footer className="site-footer border-t border-[rgba(232,168,64,0.15)] py-4 pb-20 md:pb-4 mt-auto">
          {/* Mobile footer: centered */}
          <div className="md:hidden max-w-7xl mx-auto px-4 flex flex-col items-center gap-2">
            <Link href="/" className="shrink-0"><Image src="/assets/about/logo_noreflect.png" alt="Pattaya Nice City" width={132} height={44} className="h-[36px] w-auto object-contain" /></Link>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-base text-muted-foreground">
              <Link href="/legal" className="hover:text-primary transition-colors whitespace-nowrap">Legal</Link>
              <span className="text-border">-</span>
              <Link href="/contact" className="hover:text-primary transition-colors whitespace-nowrap">{t("footerContact")}</Link>
              <span className="text-border">-</span>
              <Link href="/vlogs" className="hover:text-primary transition-colors whitespace-nowrap">Blog</Link>
            </div>
            <span className="text-xs text-muted-foreground/60">© {new Date().getFullYear()} Pattaya Nice City</span>
          </div>
          {/* Desktop footer: logo left - links center - year right */}
          <div className="hidden md:flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 items-center justify-between gap-4">
            <Link href="/" className="shrink-0"><Image src="/assets/about/logo_noreflect.png" alt="Pattaya Nice City" width={132} height={44} className="h-[36px] w-auto object-contain" /></Link>
            <div className="flex items-center gap-x-6 text-base text-muted-foreground">
              <Link href="/legal" className="hover:text-primary transition-colors whitespace-nowrap">Legal</Link>
              <span className="text-border">-</span>
              <Link href="/contact" className="hover:text-primary transition-colors whitespace-nowrap">{t("footerContact")}</Link>
              <span className="text-border">-</span>
              <Link href="/vlogs" className="hover:text-primary transition-colors whitespace-nowrap">Blog</Link>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">© {new Date().getFullYear()} Pattaya Nice City</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
