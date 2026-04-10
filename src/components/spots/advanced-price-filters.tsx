"use client";

import { useState } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";

const DRINK_FIELDS = [
  { key: "softMax",      labelKey: "softDrink",  emoji: "🥤", step: 10 },
  { key: "beerMax",      labelKey: "beer",       emoji: "🍺", step: 10 },
  { key: "alcoholMax",   labelKey: "alcohol",    emoji: "🥃", step: 10 },
  { key: "bottleMax",    labelKey: "bottle",     emoji: "🍾", step: 100 },
  { key: "ladyDrinkMax", labelKey: "ladyDrink",  emoji: "💋", step: 10 },
] as const;

const BARFINE_FIELDS = [
  { key: "barfineMax",     labelKey: "barfine",    emoji: "💸", step: 1000 },
  { key: "shortTimeMax",   labelKey: "shortTime",  emoji: "⏱", step: 1000 },
  { key: "longTimeMax",    labelKey: "longTime",   emoji: "🌙", step: 1000 },
] as const;

const SERVICE_FIELDS = [
  { key: "smallRoomMax",  labelKey: "smallRoom",   emoji: "🛏", step: 100 },
  { key: "roomMax",       labelKey: "room",        emoji: "🛏", step: 100 },
  { key: "bjMax",         labelKey: "bj",          emoji: "💦", step: 1000 },
  { key: "boomBoomMax",   labelKey: "boomBoom",    emoji: "🔥", step: 1000 },
] as const;

const TABLE_FIELDS = [
  { key: "tableSmallMax",  labelKey: "smallTable",  emoji: "🪑", step: 1000 },
  { key: "tableMediumMax", labelKey: "mediumTable", emoji: "🪑", step: 1000 },
  { key: "tableLargeMax",  labelKey: "vipTable",    emoji: "👑", step: 1000 },
] as const;

const MASSAGE_FIELDS = [
  { key: "thaiMassageMax", labelKey: "thaiMassage", emoji: "🙏", step: 100 },
  { key: "footMassageMax", labelKey: "footMassage", emoji: "🦶", step: 100 },
  { key: "oilMassageMax",  labelKey: "oilMassage",  emoji: "💆", step: 100 },
] as const;

const COFFEE_FIELDS = [
  { key: "coffeeMax", labelKey: "coffee", emoji: "🌿", step: 10 },
  { key: "foodMax",   labelKey: "food",   emoji: "🚬", step: 10 },
] as const;

const ALL_FIELDS = [...DRINK_FIELDS, ...BARFINE_FIELDS, ...SERVICE_FIELDS, ...TABLE_FIELDS, ...MASSAGE_FIELDS, ...COFFEE_FIELDS];

type PriceKey = typeof ALL_FIELDS[number]["key"];

interface AdvancedPriceFiltersProps {
  currentValues: Partial<Record<PriceKey, string>>;
  hasActive: boolean;
  visibleFields?: string[];
}

export function AdvancedPriceFilters({ currentValues, hasActive, visibleFields }: AdvancedPriceFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("priceFilters");
  const ts = useTranslations("spots");
  const [open, setOpen] = useState(hasActive);
  const [local, setLocal] = useState<Partial<Record<PriceKey, string>>>(currentValues);

  const vis = visibleFields ? new Set(visibleFields) : null;
  const drinks = DRINK_FIELDS.filter(f => !vis || vis.has(f.key));
  const barfine = BARFINE_FIELDS.filter(f => !vis || vis.has(f.key));
  const services = SERVICE_FIELDS.filter(f => !vis || vis.has(f.key));
  const tables = TABLE_FIELDS.filter(f => !vis || vis.has(f.key));
  const massages = MASSAGE_FIELDS.filter(f => !vis || vis.has(f.key));
  const coffees = COFFEE_FIELDS.filter(f => !vis || vis.has(f.key));

  function apply() {
    const params = new URLSearchParams(window.location.search);
    for (const { key } of ALL_FIELDS) {
      const val = local[key]?.trim();
      if (val && !isNaN(Number(val)) && Number(val) > 0) {
        params.set(key, val);
      } else {
        params.delete(key);
      }
    }
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false } as any);
  }

  function clearAll() {
    const params = new URLSearchParams(window.location.search);
    for (const { key } of ALL_FIELDS) params.delete(key);
    setLocal({});
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false } as any);
  }

  const totalVisible = drinks.length + barfine.length + services.length + tables.length + massages.length + coffees.length;
  if (totalVisible === 0) return null;

  function renderFields(fields: readonly { key: string; labelKey: string; emoji: string; step: number }[]) {
    return fields.map(({ key, labelKey, emoji, step }) => (
      <div key={key} className="space-y-1">
        <label className="text-xs text-muted-foreground">{emoji} {t(labelKey)}</label>
        <input
          type="number"
          min={0}
          step={step}
          placeholder="max ฿"
          value={local[key as PriceKey] ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            setLocal(prev => ({ ...prev, [key]: v === "0" ? "" : v }));
          }}
          className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(232,168,64,0.30)] focus:border-[rgba(232,168,64,0.50)] transition-colors placeholder:text-[rgba(183,148,212,0.60)]"
        />
      </div>
    ));
  }

  function renderSeparator(label: string, color: string) {
    return (
      <div className="col-span-full flex items-center gap-2 pt-2 pb-0.5">
        <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, ${color}40, transparent)` }} />
        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: `${color}aa` }}>{label}</span>
        <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, ${color}40, transparent)` }} />
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors w-full cursor-pointer ${
          hasActive
            ? "bg-[rgba(61,184,160,0.12)] text-[#3db8a0] border border-[rgba(61,184,160,0.30)] shadow-[0_0_8px_rgba(61,184,160,0.15)]"
            : "bg-[rgba(61,184,160,0.06)] text-[rgba(61,184,160,0.70)] border border-[rgba(61,184,160,0.15)] hover:bg-[rgba(61,184,160,0.12)] hover:text-[#3db8a0] hover:shadow-[0_0_8px_rgba(61,184,160,0.15)]"
        }`}
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {hasActive ? t("advancedActive") : t("advanced")}
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="mt-2 p-3 rounded-xl border border-[rgba(232,168,64,0.22)] bg-[rgba(36,28,20,0.60)] space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">{t("maxBudget")}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
            {drinks.length > 0 && (
              <>
                {renderSeparator(t("drinks"), "#3db8a0")}
                {renderFields(drinks)}
              </>
            )}
            {tables.length > 0 && (
              <>
                {renderSeparator(t("tables"), "#e07850")}
                {renderFields(tables)}
              </>
            )}
            {barfine.length > 0 && (
              <>
                {renderSeparator(t("barfineStLt"), "#ff9f43")}
                {renderFields(barfine)}
              </>
            )}
            {services.length > 0 && (
              <>
                {renderSeparator(t("services"), "#e8a840")}
                {renderFields(services)}
              </>
            )}
            {coffees.length > 0 && (
              <>
                {renderSeparator(t("coffeeFood"), "#22C55E")}
                {renderFields(coffees)}
              </>
            )}
            {massages.length > 0 && (
              <>
                {renderSeparator(t("massage"), "#10B981")}
                {renderFields(massages)}
              </>
            )}
          </div>
          <div className="flex items-center gap-2 pt-3">
            <button
              type="button"
              onClick={apply}
              className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-[rgba(232,168,64,0.90)] transition-colors cursor-pointer"
            >
              {t("applyFilters")}
            </button>
            {hasActive && (
              <button
                type="button"
                onClick={clearAll}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-destructive bg-[rgba(239,68,68,0.10)] hover:bg-[rgba(239,68,68,0.20)] transition-colors cursor-pointer"
              >
                {ts("clear")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
