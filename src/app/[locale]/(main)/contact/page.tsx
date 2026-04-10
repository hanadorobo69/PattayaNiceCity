import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { ContactForm } from "@/components/contact/contact-form"
import { getCurrentUserId } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"

export const metadata: Metadata = {
  title: "Contact - Pattaya Nice City",
}

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const t = await getTranslations("contact")
  const { subject: prefillSubject } = await searchParams
  const userId = await getCurrentUserId()

  if (!userId) {
    redirect("/login?callbackUrl=/contact")
  }

  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { username: true, email: true },
  })

  if (!profile) {
    redirect("/login?callbackUrl=/contact")
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8">
      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-orbitron)]">
          <span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">
            {t("title")}
          </span>
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          {t("subtitle")}
        </p>
      </div>

      <ContactForm userName={profile.username} userEmail={profile.email} defaultSubject={prefillSubject} />
    </div>
  )
}
