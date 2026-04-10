import type { Metadata } from "next";
import Image from "next/image";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Set a new password for your Pattaya Nice City account",
};

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams;
  const t = await getTranslations("auth");

  if (!token) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-2">
            <Image src="/assets/about/logo_noreflect.png" alt="Pattaya Nice City" width={160} height={54} className="h-14 w-auto object-contain" priority />
          </div>
          <CardDescription className="text-destructive">
            {t("invalidResetLink")}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="space-y-1">
        <div className="flex justify-center mb-2">
          <Image src="/assets/about/logo_noreflect.png" alt="Pattaya Nice City" width={160} height={54} className="h-14 w-auto object-contain" priority />
        </div>
        <CardDescription>
          {t("forgotPasswordTitle")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm token={token} />
      </CardContent>
    </Card>
  );
}
