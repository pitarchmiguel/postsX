"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { format } from "date-fns";
import { TrashIcon } from "lucide-react";

type FeedbackItem = {
  id: string;
  text: string;
  type: string;
  createdAt: string;
  user: {
    email: string;
    xUsername: string | null;
    xName: string | null;
  };
};

const TYPE_LABELS: Record<string, string> = {
  bug: "Bug",
  feature: "Feature",
  suggestion: "Suggestion",
  other: "Other",
};

export function FeedbackAdminList() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/feedback/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to delete");
        return;
      }
      setFeedback((prev) => prev.filter((f) => f.id !== id));
      setDeleteId(null);
      toast.success("Feedback deleted");
    } catch {
      toast.error("Failed to delete feedback");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    fetch("/api/feedback")
      .then((r) => {
        if (r.status === 403) {
          setError("You don't have permission to view feedback");
          return [];
        }
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then(setFeedback)
      .catch(() => {
        setError("Failed to load feedback");
        toast.error("Failed to load");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">Loading feedback...</div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">{error}</p>
          <p className="text-muted-foreground text-sm mt-2">
            Set ADMIN_EMAILS in your environment variables with your email to access.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (feedback.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">No feedback yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {feedback.map((item) => (
          <Card key={item.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-sm font-medium">
                  {item.user.xUsername ? `@${item.user.xUsername}` : item.user.email}
                  {item.user.xName && (
                    <span className="text-muted-foreground font-normal ml-1">
                      ({item.user.xName})
                    </span>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {TYPE_LABELS[item.type] ?? item.type}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {format(new Date(item.createdAt), "MMM d, yyyy, HH:mm")}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteId(item.id)}
                    aria-label="Delete feedback"
                  >
                    <TrashIcon className="size-4" />
                  </Button>
                </div>
              </div>
              {!item.user.xUsername && (
                <p className="text-muted-foreground text-xs">{item.user.email}</p>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{item.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => !deleting && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete feedback?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
