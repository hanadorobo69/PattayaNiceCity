"use client";

import { useTransition, useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUp } from "@/actions/auth";
import { registerSchema, type RegisterInput } from "@/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { CountrySelect } from "@/components/ui/country-select";

export function RegisterForm() {
  const t = useTranslations("auth");
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const nationalityValue = watch("nationality") ?? "";

  // Scroll to first error field
  useEffect(() => {
    const firstErrorKey = Object.keys(errors)[0];
    if (firstErrorKey && formRef.current) {
      const el = formRef.current.querySelector(`[name="${firstErrorKey}"], #${firstErrorKey}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        (el as HTMLElement).focus?.();
      }
    }
  }, [errors]);

  // Map server error keys to field + translated message
  const fieldErrorMap: Record<string, { field: string; message: string }> = {
    "EMAIL_TAKEN": { field: "email", message: t("emailTaken") },
    "USERNAME_TAKEN": { field: "username", message: t("usernameTaken") },
  };

  function onSubmit(data: RegisterInput) {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const formData = new FormData();
      formData.append("username", data.username);
      formData.append("email", data.email);
      formData.append("dateOfBirth", data.dateOfBirth);
      formData.append("password", data.password);
      formData.append("confirmPassword", data.confirmPassword);
      if (data.nationality) formData.append("nationality", data.nationality);
      if (data.residentType) formData.append("residentType", data.residentType);

      const result = await signUp(formData);
      if (result && !result.success) {
        const mapped = fieldErrorMap[result.error];
        if (mapped) {
          setFieldErrors({ [mapped.field]: mapped.message });
          // Scroll to the field
          const el = formRef.current?.querySelector(`#${mapped.field}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            (el as HTMLElement).focus?.();
          }
        } else if (result.error === "TOO_MANY_ATTEMPTS") {
          setError(t("tooManyAttempts"));
        } else {
          setError(result.error);
        }
      }
    });
  }

  const fieldErrorClass = "border-destructive focus-visible:ring-destructive/40";

  return (
    <form ref={formRef} onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {error && (
        <div className="bg-[rgba(239,68,68,0.10)] border border-[rgba(239,68,68,0.20)] text-destructive text-sm rounded-md px-4 py-3">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="username">{t("username")} *</Label>
        <Input
          id="username"
          placeholder={t("usernamePlaceholder")}
          autoComplete="username"
          {...register("username")}
          disabled={isPending}
          className={(errors.username || fieldErrors.username) ? fieldErrorClass : ""}
        />
        {errors.username && (
          <p className="text-sm text-destructive font-medium">{errors.username.message}</p>
        )}
        {fieldErrors.username && (
          <p className="text-sm text-destructive font-medium">{fieldErrors.username}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {t("usernameHint")}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">{t("email")} *</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          {...register("email")}
          disabled={isPending}
          className={(errors.email || fieldErrors.email) ? fieldErrorClass : ""}
        />
        {errors.email && (
          <p className="text-sm text-destructive font-medium">{errors.email.message}</p>
        )}
        {fieldErrors.email && (
          <p className="text-sm text-destructive font-medium">{fieldErrors.email}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="dateOfBirth">{t("dateOfBirth")} *</Label>
        <Input
          id="dateOfBirth"
          type="date"
          {...register("dateOfBirth")}
          disabled={isPending}
          className={errors.dateOfBirth ? fieldErrorClass : ""}
        />
        {errors.dateOfBirth && (
          <p className="text-sm text-destructive font-medium">{t("ageError")}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="nationality">{t("nationality")}</Label>
          <CountrySelect
            value={nationalityValue}
            onChange={(code) => setValue("nationality", code)}
            placeholder={t("nationalityPlaceholder")}
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="residentType">{t("status")}</Label>
          <select
            id="residentType"
            {...register("residentType")}
            disabled={isPending}
            className="flex h-10 w-full rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 text-foreground cursor-pointer [&>option]:bg-[#1a1510] [&>option]:text-foreground"
            style={{ background: "var(--input)", border: "1px solid var(--border)" }}
          >
            <option value="">{t("notSpecified")}</option>
            <option value="resident">{t("resident")}</option>
            <option value="tourist">{t("tourist")}</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t("password")} *</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="new-password"
            {...register("password")}
            disabled={isPending}
            className={`pr-10 ${errors.password ? fieldErrorClass : ""}`}
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
        {errors.password && (
          <p className="text-sm text-destructive font-medium">{errors.password.message}</p>
        )}
        <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{t("confirmPassword")} *</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirm ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="new-password"
            {...register("confirmPassword")}
            disabled={isPending}
            className={`pr-10 ${errors.confirmPassword ? fieldErrorClass : ""}`}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowConfirm(!showConfirm)}
            tabIndex={-1}
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-destructive font-medium">{errors.confirmPassword.message}</p>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        {t("legalDisclaimer")}
      </p>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isPending ? t("creatingAccount") : t("createAccount")}
      </Button>
    </form>
  );
}
