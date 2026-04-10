import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { requestVerification } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BadgeCheck, Building2 } from "lucide-react"
import { getTranslations } from "next-intl/server"

export const metadata = { title: "Request Spot Verification - Pattaya Nice City" }

export default async function VerifyPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const t = await getTranslations("verify")

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[rgba(232,168,64,0.10)] flex items-center justify-center">
            <BadgeCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border satine-border bg-card p-6 space-y-2">
        <h2 className="font-semibold flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          {t("whatYouGet")}
        </h2>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>{t("benefit1")}</li>
          <li>{t("benefit2")}</li>
          <li>{t("benefit3")}</li>
          <li>{t("benefit4")}</li>
        </ul>
      </div>

      <form action={async (formData: FormData) => { "use server"; await requestVerification(formData); }} className="space-y-5 rounded-xl border satine-border bg-card p-6">
        <h2 className="font-semibold">{t("verificationRequest")}</h2>

        <div className="space-y-2">
          <Label htmlFor="businessName">{t("businessName")}</Label>
          <Input id="businessName" name="businessName" placeholder="e.g. Windmill Club" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessType">{t("spotType")}</Label>
          <select
            name="businessType"
            id="businessType"
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">{t("selectType")}</option>
            <option value="Bar">Bar</option>
            <option value="BJ Bar">BJ Bar</option>
            <option value="Restaurant">Restaurant</option>
            <option value="Gentlemen's Club">Gentlemen's Club</option>
            <option value="Club">Club</option>
            <option value="Massage">Massage</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactEmail">{t("contactEmail")}</Label>
          <Input id="contactEmail" name="contactEmail" type="email" placeholder="owner@spot.com" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">{t("messageToAdmin")}</Label>
          <Textarea
            id="message"
            name="message"
            placeholder={t("messagePlaceholder")}
            rows={4}
            className="resize-none"
          />
        </div>

        <Button type="submit" className="w-full">{t("submitRequest")}</Button>
        <p className="text-xs text-muted-foreground text-center">
          {t("reviewNotice")}
        </p>
      </form>
    </div>
  )
}
