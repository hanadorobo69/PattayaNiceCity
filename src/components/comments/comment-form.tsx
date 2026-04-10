"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createComment } from "@/actions/comments";
import { createCommentSchema, type CreateCommentInput } from "@/validations/comment";
import { Button } from "@/components/ui/button";
import { MentionInput } from "@/components/ui/mention-input";
import { MediaUploader, type MediaItem } from "@/components/ui/media-uploader";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Send, Paperclip } from "lucide-react";
import { useTranslations } from "next-intl";

interface CommentFormProps {
  postId: string;
  parentId?: string;
  onSuccess?: () => void;
}

export function CommentForm({ postId, parentId, onSuccess }: CommentFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const t = useTranslations("comments");
  const tc = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [showMedia, setShowMedia] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);

  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateCommentInput>({
    resolver: zodResolver(createCommentSchema),
    defaultValues: {
      content: "",
      postId,
      parentId,
    },
  });

  function onSubmit(data: CreateCommentInput) {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("content", data.content);
      formData.append("postId", data.postId);
      if (data.parentId) formData.append("parentId", data.parentId);
      if (mediaItems.length > 0) {
        formData.append("mediaItems", JSON.stringify(mediaItems));
      }

      const result = await createComment(formData);

      if (result.success) {
        reset();
        setMediaItems([]);
        setShowMedia(false);
        toast({ title: t("commentPosted"), description: t("commentAddedDesc") });
        router.refresh();
        onSuccess?.();
      } else {
        toast({ title: tc("error"), description: result.error, variant: "destructive" });
      }
    });
  }

  return (
    <form onSubmit={(e) => { e.stopPropagation(); handleSubmit(onSubmit)(e); }} className="space-y-3">
      <MentionInput
        name="content"
        value={watch("content")}
        onChange={(v) => setValue("content", v, { shouldValidate: true })}
        placeholder={t("mentionPlaceholder")}
        rows={3}
        showGifPicker
      />
      {errors.content && (
        <p className="text-sm text-destructive">{errors.content.message}</p>
      )}

      {/* Media section (collapsible) */}
      {showMedia && (
        <MediaUploader value={mediaItems} onChange={setMediaItems} maxFiles={4} />
      )}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-md hover:bg-muted"
          onClick={() => setShowMedia(!showMedia)}
          title={t("attach")}
        >
          <Paperclip className="h-4 w-4" />
          {mediaItems.length > 0 && (
            <span className="text-xs font-medium text-primary">{mediaItems.length}</span>
          )}
        </button>

        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          {isPending ? t("posting") : t("send")}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        By posting, you agree to our <a href="/legal" target="_blank" className="text-primary hover:underline">Terms</a> and <a href="/legal" target="_blank" className="text-primary hover:underline">Guidelines</a>. You are responsible for your content.
      </p>
    </form>
  );
}
