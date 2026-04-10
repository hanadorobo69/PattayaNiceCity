"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { submitContactMessage } from "@/actions/contact";

interface ContactFormProps {
  userName: string;
  userEmail: string;
  defaultSubject?: string;
}

export function ContactForm({ userName, userEmail, defaultSubject }: ContactFormProps) {
  const t = useTranslations("contact");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);

  const [form, setForm] = useState({
    name: userName,
    email: userEmail,
    subject: defaultSubject || "",
    message: "",
  });

  function validate() {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = t("required");
    if (!form.email.trim()) newErrors.email = t("required");
    if (!form.subject.trim()) newErrors.subject = t("required");
    if (!form.message.trim()) newErrors.message = t("required");
    return newErrors;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    startTransition(async () => {
      const result = await submitContactMessage({
        name: form.name,
        email: form.email,
        subject: form.subject,
        message: form.message,
      });
      if (result.success) {
        setShowSuccess(true);
      } else {
        setErrors({ form: t("errorDesc") });
      }
    });
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  const inputClass =
    "w-full bg-[rgba(26,21,16,0.6)] border border-[rgba(232,168,64,0.2)] rounded-lg px-3 py-2 text-sm text-foreground focus:border-[#e8a840] focus:ring-1 focus:ring-[#e8a840] outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[rgba(232,168,64,0.25)] bg-[rgba(36,28,20,0.6)] p-6 sm:p-8 space-y-5"
      >
        {/* User info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium text-foreground">
              {t("name")} *
            </label>
            <input
              id="name"
              type="text"
              placeholder="Your name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              disabled={isPending}
              className={inputClass}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              {t("email")} *
            </label>
            <input
              id="email"
              type="email"
              placeholder="Your email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              disabled={isPending}
              className={inputClass}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>
        </div>

        {/* Subject */}
        <div className="space-y-1.5">
          <label htmlFor="subject" className="text-sm font-medium text-foreground">
            {t("subject")} *
          </label>
          <input
            id="subject"
            type="text"
            placeholder={t("subjectPlaceholder")}
            value={form.subject}
            onChange={(e) => updateField("subject", e.target.value)}
            disabled={isPending}
            className={inputClass}
          />
          {errors.subject && (
            <p className="text-sm text-destructive">{errors.subject}</p>
          )}
        </div>

        {/* Message */}
        <div className="space-y-1.5">
          <label htmlFor="message" className="text-sm font-medium text-foreground">
            {t("message")} *
          </label>
          <textarea
            id="message"
            rows={5}
            placeholder={t("messagePlaceholder")}
            value={form.message}
            onChange={(e) => updateField("message", e.target.value)}
            disabled={isPending}
            className={`${inputClass} resize-none`}
          />
          {errors.message && (
            <p className="text-sm text-destructive">{errors.message}</p>
          )}
        </div>

        {errors.form && (
          <p className="text-sm text-destructive text-center">{errors.form}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#e8a840] to-[#e07850] hover:from-[#e8a840]/90 hover:to-[#e07850]/90 text-white font-medium py-2.5 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("sending")}
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              {t("send")}
            </>
          )}
        </button>
      </form>

      {/* Success modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-[rgba(36,28,20,0.98)] border border-[rgba(232,168,64,0.25)] rounded-2xl p-8 max-w-sm mx-4 text-center space-y-4 shadow-2xl">
            <CheckCircle2 className="h-12 w-12 text-[#3db8a0] mx-auto" />
            <h2 className="text-xl font-bold text-foreground">{t("success")}</h2>
            <p className="text-sm text-muted-foreground">{t("successDesc")}</p>
            <button
              onClick={() => router.push("/")}
              className="w-full bg-gradient-to-r from-[#e8a840] to-[#e07850] text-white font-medium py-2.5 px-6 rounded-lg transition-all hover:from-[#e8a840]/90 hover:to-[#e07850]/90 cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}
