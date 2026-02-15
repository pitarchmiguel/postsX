"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TrashIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

interface TopPostItemProps {
  post: {
    id: string;
    text: string;
  };
  index: number;
  impressions: number;
  likes: number;
}

export function TopPostItem({ post, index, impressions, likes }: TopPostItemProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        throw new Error("Failed to delete");
      }

      toast.success("Post deleted");
      setDeleteDialogOpen(false);

      // Refresh server component data
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete post");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <li className="flex gap-2 rounded-md border border-border p-2 group hover:bg-muted/50 transition-colors">
        <span className="text-muted-foreground">{index + 1}.</span>
        <span className="min-w-0 flex-1 truncate text-sm">
          {post.text.slice(0, 80)}
          {post.text.length > 80 ? "..." : ""}
        </span>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {impressions} imp · {likes} likes
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setDeleteDialogOpen(true)}
          disabled={isDeleting}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          title="Delete post"
        >
          {isDeleting ? (
            <Loader2Icon className="size-3 animate-spin" />
          ) : (
            <TrashIcon className="size-3" />
          )}
        </Button>
      </li>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this post and all its metrics.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
