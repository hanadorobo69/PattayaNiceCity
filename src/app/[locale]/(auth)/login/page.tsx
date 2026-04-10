import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Pattaya Nice City account",
};

export default async function LoginPage() {
  const t = await getTranslations("auth");
  return (
    <>
    <Card className="shadow-lg">
      <CardHeader className="space-y-1">
        <div className="flex justify-center mb-2">
          <Image src="/assets/about/logo_noreflect.png" alt="Pattaya Nice City" width={160} height={54} className="h-14 w-auto object-contain" priority />
        </div>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          {t("noAccount")}{" "}
          <Link
            href="/register"
            className="text-primary font-medium hover:underline"
          >
            {t("signUpLink")}
          </Link>
        </p>
      </CardFooter>
    </Card>
    </>
  );
}
