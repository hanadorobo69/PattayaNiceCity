"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Search, X, Clock } from "lucide-react";
import { useTranslations } from "next-intl";

const MAX_HISTORY = 5;

function getHistory(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function saveToHistory(key: string, query: string) {
  if (!query.trim()) return;
  const history = getHistory(key).filter((h) => h !== query.trim());
  history.unshift(query.trim());
  localStorage.setItem(key, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

interface SearchInputProps {
  placeholder?: string;
  paramName?: string;
  defaultValue?: string;
  className?: string;
  historyKey?: string;
}

export function SearchInput({
  placeholder = "Search...",
  paramName = "q",
  defaultValue = "",
  className = "",
  historyKey = "pvc_search_spots",
}: SearchInputProps) {
  const [value, setValue] = useState(defaultValue);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("common");

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    setHistory(getHistory(historyKey));
  }, [historyKey]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function navigate(searchVal: string) {
    if (searchVal.trim()) saveToHistory(historyKey, searchVal);
    const params = new URLSearchParams(window.location.search);
    if (searchVal.trim()) {
      params.set(paramName, searchVal.trim());
    } else {
      params.delete(paramName);
    }
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShowHistory(false);
    navigate(value);
  }

  function handleClear() {
    setValue("");
    navigate("");
  }

  function handleHistoryClick(query: string) {
    setValue(query);
    setShowHistory(false);
    navigate(query);
  }

  function handleRemoveHistory(query: string, e: React.MouseEvent) {
    e.stopPropagation();
    const updated = history.filter((h) => h !== query);
    setHistory(updated);
    localStorage.setItem(historyKey, JSON.stringify(updated));
  }

  const hasSearch = defaultValue.length > 0;
  const isTypingNew = value.trim() !== "" && value.trim() !== defaultValue.trim();
  const filteredHistory = isTypingNew
    ? history.filter((h) => h.toLowerCase().includes(value.toLowerCase()))
    : history;

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} action="/" method="GET" className="flex gap-1.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            name={paramName}
            type="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setShowHistory(true)}
            placeholder={placeholder}
            className="search-input w-full h-9 pl-9 pr-3 rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none transition-colors"
            style={{
              background: "rgba(75,35,120,0.4)",
              border: "1px solid rgba(232,168,64,0.25)",
              color: "#ededed",
            }}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </div>
        <button
          type="submit"
          className="h-9 px-3 rounded-lg text-xs font-medium shrink-0 text-white hover:opacity-90 transition-all cursor-pointer"
          style={{ background: "linear-gradient(to right, #e8a840, #e07850)", boxShadow: "0 0 14px rgba(232,168,64,0.35)" }}
        >
          OK
        </button>
        {hasSearch && (
          <button
            type="button"
            onClick={handleClear}
            className="h-9 px-3 rounded-lg text-xs font-medium shrink-0 text-muted-foreground hover:text-white border border-[rgba(232,168,64,0.25)] hover:border-[rgba(232,168,64,0.5)] hover:bg-[rgba(232,168,64,0.1)] transition-all flex items-center gap-1 cursor-pointer"
          >
            <X className="h-3 w-3" />
            {t("cancel")}
          </button>
        )}
      </form>

      {/* Search history dropdown */}
      {showHistory && filteredHistory.length > 0 && (
        <div className="search-history absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-[rgba(232,168,64,0.20)] bg-[rgba(36,28,20,0.98)] backdrop-blur-sm shadow-xl overflow-hidden">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-[rgba(232,168,64,0.10)]">
            {t("recentSearches")}
          </div>
          {filteredHistory.map((query) => (
            <button
              key={query}
              type="button"
              onClick={() => handleHistoryClick(query)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-[rgba(75,35,120,0.30)] transition-colors cursor-pointer group"
            >
              <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="flex-1 text-left truncate">{query}</span>
              <button
                type="button"
                onClick={(e) => handleRemoveHistory(query, e)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
