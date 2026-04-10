"use client";

import { useTransition, useState } from "react";
import { useTranslations } from "next-intl";
import { resetPassword } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const t = useTranslations("auth");
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.append("token", token);
    startTransition(async () => {
      const result = await resetPassword(formData);
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error);
      }
    });
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle className="h-12 w-12 text-green-400 mx-auto" />
        <p className="text-sm text-muted-foreground">{t("passwordResetSuccess")}</p>
        <Link href="/login" className="text-sm text-[#e07850] hover:underline block">{t("signInLink")}</Link>
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
        <Label htmlFor="password">{t("newPassword")}</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="new-password"
            required
            minLength={8}
            disabled={isPending}
            className="pr-10"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{t("confirmNewPassword")}</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          autoComplete="new-password"
          required
          minLength={8}
          disabled={isPending}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isPending ? t("resetting") : t("resetPassword")}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        <Link href="/login" className="text-[#e07850] hover:underline">{t("backToLogin")}</Link>
      </p>
    </form>
  );
}
