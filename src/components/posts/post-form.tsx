"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@/i18n/navigation";
import { createPost, updatePost } from "@/actions/posts";
import { createPostSchema, type CreatePostInput } from "@/validations/post";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { MediaUploader, type MediaItem } from "@/components/ui/media-uploader";
import { MentionInput } from "@/components/ui/mention-input";
import { PollCreator } from "@/components/posts/poll-creator";
import { useTranslations } from "next-intl";
import type { Category } from "@prisma/client";

const MAX_CATEGORIES = 5;

interface PostFormProps {
  initialData?: Partial<CreatePostInput> & { id?: string; slug?: string };
  categories?: Category[];
  defaultCategoryId?: string;
  defaultCategoryIds?: string[];
  defaultContent?: string;
  isEditing?: boolean;
}

export function PostForm({ initialData, categories = [], defaultCategoryId, defaultCategoryIds, defaultContent = "", isEditing = false }: PostFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("posts");
  const tc = useTranslations("common");
  const tcat = useTranslations("categoryNames");
  const [isPending, startTransition] = useTransition();
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [pollData, setPollData] = useState<{ question: string; options: string[] } | null>(null);


  // Multi-category selection state
  const initIds = defaultCategoryIds?.length
    ? defaultCategoryIds
    : initialData?.categoryId
      ? [initialData.categoryId]
      : defaultCategoryId
        ? [defaultCategoryId]
        : [];
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(initIds);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreatePostInput>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      title: initialData?.title || "",
      content: initialData?.content || defaultContent || "",
      categoryId: initIds[0] || undefined,
      imageUrl: initialData?.imageUrl || "",
    },
  });

  function toggleCategory(catId: string) {
    setSelectedCategoryIds(prev => {
      if (prev.includes(catId)) {
        const next = prev.filter(id => id !== catId);
        // Update primary categoryId in form
        setValue("categoryId", next[0] || "");
        return next;
      }
      if (prev.length >= MAX_CATEGORIES) {
        toast({ title: t("maxCategories", { max: MAX_CATEGORIES }), variant: "destructive" });
        return prev;
      }
      const next = [...prev, catId];
      // First selected becomes the primary categoryId
      if (!prev.length) setValue("categoryId", catId);
      return next;
    });
  }

  function onSubmit(data: CreatePostInput) {
    if (selectedCategoryIds.length === 0) {
      toast({ title: t("selectAtLeastOneCategory"), variant: "destructive" });
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("content", data.content);
      // Primary category
      formData.append("categoryId", selectedCategoryIds[0]);
      // All selected categories (JSON array)
      formData.append("categoryIds", JSON.stringify(selectedCategoryIds));
      if (mediaItems.length > 0) {
        formData.append("mediaItems", JSON.stringify(mediaItems));
      }
      if (pollData && pollData.question.trim() && pollData.options.filter(o => o.trim()).length >= 2) {
        formData.append("pollData", JSON.stringify(pollData));
      }

      let result;
      if (isEditing && initialData?.id) {
        formData.append("id", initialData.id);
        result = await updatePost(formData);
      } else {
        result = await createPost(formData);
      }

      if (result.success) {
        toast({
          title: isEditing ? t("postUpdated") || "Post updated!" : t("postPublished"),
          description: isEditing ? "" : t("postPublishedDesc"),
        });
        router.replace(`/post/${result.data.slug}`);
      } else {
        toast({
          title: tc("error"),
          description: result.error,
          variant: "destructive",
        });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="font-[family-name:var(--font-orbitron)]"><span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">{t("titleRequired")}</span></Label>
        <Input
          id="title"
          placeholder={t("catchyTitlePlaceholder")}
          {...register("title")}
          disabled={isPending}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Category - multi-select (max 5) */}
      {categories.length > 0 && (() => {
        const generalCat = categories.find(c => c.slug === "general");
        const mainCats = categories.filter(c => c.slug !== "general");

        const renderCatButton = (cat: Category) => {
          const isSelected = selectedCategoryIds.includes(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              disabled={isPending}
              onClick={() => toggleCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                isSelected
                  ? "border-transparent text-white"
                  : "bg-[rgba(75,35,120,0.20)] border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              style={isSelected ? { backgroundColor: cat.color + "cc", borderColor: cat.color } : {}}
            >
              {cat.icon && <span className="mr-1">{cat.icon}</span>}
              {tcat.has(cat.slug) ? tcat(cat.slug) : cat.name}
            </button>
          );
        };

        const sectionHeader = (label: string, color: string) => (
          <div className="flex items-center gap-2 pt-2 pb-0.5">
            <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, ${color}66, transparent)` }} />
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: `${color}bb` }}>{label}</span>
            <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, ${color}66, transparent)` }} />
          </div>
        );

        return (
          <div className="space-y-2">
            <Label className="font-[family-name:var(--font-orbitron)]">
              <span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">{t("categories")}</span>
              <span className="ml-2 text-xs text-muted-foreground font-normal font-sans">({t("maxCategories", { max: MAX_CATEGORIES })})</span>
            </Label>

            {/* General */}
            {generalCat && (
              <div className="flex flex-wrap gap-2">{renderCatButton(generalCat)}</div>
            )}

            {/* All categories */}
            {mainCats.length > 0 && (
              <div className="flex flex-wrap gap-2">{mainCats.map(renderCatButton)}</div>
            )}

            {selectedCategoryIds.length === 0 && (
              <p className="text-sm text-destructive">{t("selectAtLeastOneCategory")}</p>
            )}
          </div>
        );
      })()}

      {/* Content */}
      <div className="space-y-2">
        <Label htmlFor="content" className="font-[family-name:var(--font-orbitron)]">
          <span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">{t("contentRequired")}</span>
        </Label>
        <MentionInput
          name="content"
          value={watch("content")}
          onChange={(v) => setValue("content", v)}
          placeholder={t("contentDetailedPlaceholder")}
          rows={8}
          showGifPicker
        />
        {errors.content && (
          <p className="text-sm text-destructive">{errors.content.message}</p>
        )}
      </div>

      {/* Media upload (optional) */}
      <div className="space-y-2">
        <Label className="font-[family-name:var(--font-orbitron)]">
          <span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">{t("media")}</span>{" "}
          <span className="text-muted-foreground font-normal font-sans">({t("mediaHint")})</span>
        </Label>
        <MediaUploader value={mediaItems} onChange={setMediaItems} maxFiles={10} />
      </div>

      {/* Poll (optional) */}
      <PollCreator value={pollData} onChange={setPollData} />

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        By publishing, you confirm that your content complies with our{" "}
        <a href="/legal" target="_blank" className="text-primary hover:underline">Terms of Service</a> and{" "}
        <a href="/legal#community-guidelines" target="_blank" className="text-primary hover:underline">Community Guidelines</a>.
        You are solely responsible for your content. The platform may remove content that violates these rules.
      </p>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isPending ? (isEditing ? "Saving..." : t("publishing")) : (isEditing ? "Save Changes" : t("publish"))}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          {tc("cancel")}
        </Button>
      </div>
    </form>
  );
}
