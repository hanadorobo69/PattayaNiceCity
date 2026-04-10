"use client";

import { useTransition, useState } from "react";
import { useTranslations } from "next-intl";
import { requestPasswordReset } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await requestPasswordReset(formData);
      if (result.success) {
        setSent(true);
      } else {
        setError(result.error);
      }
    });
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle className="h-12 w-12 text-green-400 mx-auto" />
        <p className="text-sm text-muted-foreground">{t("resetEmailSent")}</p>
        <Link href="/login" className="text-sm text-[#e07850] hover:underline block">{t("backToLogin")}</Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="bg-[rgba(239,68,68,0.10)] border border-[rgba(239,68,68,0.20)] text-destructive text-sm rounded-md px-4 py-3">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
          disabled={isPending}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isPending ? t("sending") : t("sendResetLink")}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        <Link href="/login" className="text-[#e07850] hover:underline">{t("backToLogin")}</Link>
      </p>
    </form>
  );
}
