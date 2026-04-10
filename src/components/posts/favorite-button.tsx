"use client";

import { useOptimistic, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toggleFavorite } from "@/actions/favorites";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  postId: string;
  initialFavorited: boolean;
  isAuthenticated: boolean;
}

export function FavoriteButton({
  postId,
  initialFavorited,
  isAuthenticated,
}: FavoriteButtonProps) {
  const { toast } = useToast();
  const t = useTranslations("favorites");
  const [isPending, startTransition] = useTransition();

  const [optimisticFavorited, updateOptimistic] = useOptimistic(
    initialFavorited,
    (_, newValue: boolean) => newValue
  );

  function handleToggle() {
    if (!isAuthenticated) {
      toast({
        title: t("loginRequired"),
        description: t("mustBeLoggedIn"),
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      updateOptimistic(!optimisticFavorited);
      const result = await toggleFavorite(postId);

      if (!result.success) {
        toast({
          title: t("error"),
          description: result.error,
          variant: "destructive",
        });
      } else if (result.data.favorited) {
        toast({
          title: t("saved"),
          description: t("addedToFavorites"),
        });
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "h-8 w-8",
        optimisticFavorited &&
          "text-red-500 bg-red-500/10 hover:bg-red-500/20 hover:text-red-500"
      )}
      onClick={handleToggle}
      disabled={isPending}
      aria-label={optimisticFavorited ? t("removeFromFavorites") : t("save")}
    >
      <Heart
        className={cn("h-4 w-4", optimisticFavorited && "fill-current")}
      />
    </Button>
  );
}
