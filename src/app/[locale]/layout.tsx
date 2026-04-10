import { NextIntlClientProvider, hasLocale } from "next-intl"
import { getMessages } from "next-intl/server"
import { notFound } from "next/navigation"
import { cookies } from "next/headers"
import { routing } from "@/i18n/routing"
import { auth } from "@/auth"
import { AgeGate } from "@/components/layout/age-gate"

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  const messages = await getMessages()

  // Skip age gate entirely if user already verified or is authenticated
  const cookieStore = await cookies()
  const alreadyVerified = cookieStore.has("pvc_age_verified")
  const session = alreadyVerified ? null : await auth()
  const showAgeGate = !alreadyVerified && !session?.user

  return (
    <NextIntlClientProvider messages={messages}>
      <div className="main-app-content">
        {children}
      </div>
      {showAgeGate && <AgeGate />}
    </NextIntlClientProvider>
  )
}
