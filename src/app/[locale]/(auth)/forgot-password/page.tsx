import type { Metadata } from "next";
import Image from "next/image";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your Pattaya Nice City account password",
};

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth");
  return (
    <Card className="shadow-lg">
      <CardHeader className="space-y-1">
        <div className="flex justify-center mb-2">
          <Image src="/assets/about/logo_noreflect.png" alt="Pattaya Nice City" width={160} height={54} className="h-14 w-auto object-contain" priority />
        </div>
        <CardDescription>
          {t("forgotPasswordSubtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
      </CardContent>
    </Card>
  );
}
