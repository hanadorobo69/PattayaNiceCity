"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PollInput {
  question: string;
  options: string[];
}

interface PollCreatorProps {
  value: PollInput | null;
  onChange: (poll: PollInput | null) => void;
}

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;

export function PollCreator({ value, onChange }: PollCreatorProps) {
  const t = useTranslations("polls");
  const [isOpen, setIsOpen] = useState(value !== null);

  function handleToggle() {
    if (isOpen) {
      // Close and clear
      setIsOpen(false);
      onChange(null);
    } else {
      // Open with defaults
      setIsOpen(true);
      onChange({ question: "", options: ["", ""] });
    }
  }

  function updateQuestion(question: string) {
    if (!value) return;
    onChange({ ...value, question });
  }

  function updateOption(index: number, text: string) {
    if (!value) return;
    const newOptions = [...value.options];
    newOptions[index] = text;
    onChange({ ...value, options: newOptions });
  }

  function addOption() {
    if (!value || value.options.length >= MAX_OPTIONS) return;
    onChange({ ...value, options: [...value.options, ""] });
  }

  function removeOption(index: number) {
    if (!value || value.options.length <= MIN_OPTIONS) return;
    const newOptions = value.options.filter((_, i) => i !== index);
    onChange({ ...value, options: newOptions });
  }

  return (
    <div className="space-y-3">
      {/* Toggle button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleToggle}
          className={cn(
            "inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all border",
            isOpen
              ? "border-[#e8a840] bg-[rgba(232,168,64,0.12)] text-[#e8a840]"
              : "border-[rgba(61,184,160,0.35)] bg-gradient-to-r from-[rgba(61,184,160,0.10)] to-[rgba(224,120,80,0.10)] text-[#3db8a0] hover:from-[rgba(61,184,160,0.18)] hover:to-[rgba(224,120,80,0.18)] hover:border-[rgba(61,184,160,0.5)] hover:shadow-[0_0_12px_rgba(61,184,160,0.2)]"
          )}
        >
          <BarChart3 className="h-4 w-4" />
          {t("addPoll")}
        </button>
      </div>

      {/* Poll form */}
      {isOpen && value && (
        <div className="rounded-xl border border-[rgba(224,120,80,0.25)] bg-[rgba(20,10,35,0.40)] backdrop-blur-sm p-4 space-y-4">
          {/* Question */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[rgba(240,230,255,0.70)]">
              {t("question")}
            </Label>
            <Input
              value={value.question}
              onChange={(e) => updateQuestion(e.target.value)}
              placeholder={t("questionPlaceholder")}
              className="bg-[rgba(75,35,120,0.15)] border-[rgba(224,120,80,0.25)]"
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-[rgba(240,230,255,0.70)]">
              {t("options")}
            </Label>
            {value.options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5 text-right shrink-0">
                  {index + 1}.
                </span>
                <Input
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={t("optionPlaceholder", { number: index + 1 })}
                  className="bg-[rgba(75,35,120,0.15)] border-[rgba(224,120,80,0.25)] flex-1"
                />
                {value.options.length > MIN_OPTIONS && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(index)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            {value.options.length < MAX_OPTIONS && (
              <button
                type="button"
                onClick={addOption}
                className="inline-flex items-center gap-1.5 text-xs text-[#e07850] hover:text-[#e8a840] transition-colors mt-1"
              >
                <Plus className="h-3.5 w-3.5" />
                {t("addOption")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
