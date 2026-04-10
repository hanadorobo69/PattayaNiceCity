import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { EscapeHandler } from "@/components/auth/escape-handler";
import { AuthLanguageSelector } from "@/components/auth/auth-language-selector";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <EscapeHandler />
      {/* Subtle gradient top bar */}
      <div className="h-1 bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0]" />

      {/* Language selector - top right */}
      <div className="flex justify-end px-4 pt-3">
        <AuthLanguageSelector />
      </div>

      <main className="flex-1 flex items-center justify-center px-4 py-4">
        <div className="w-full max-w-[420px]">
          {children}
        </div>
      </main>

      <footer className="px-6 py-5 text-center text-xs text-muted-foreground">
        <span className="font-bold font-[family-name:var(--font-orbitron)] bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">Pattaya Nice City</span>
        <span className="ml-2">&copy; {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
