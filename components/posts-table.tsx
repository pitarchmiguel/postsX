"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  MoreHorizontalIcon,
  PencilIcon,
  CopyIcon,
  CalendarIcon,
  TrashIcon,
  RefreshCwIcon,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatInTimezone, getDefaultTimezone } from "@/lib/timezone";

type Post = {
  id: string;
  status: string;
  text: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  tags: string;
  updatedAt: string;
};

export function PostsTable() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("drafts");
  const [userTimezone, setUserTimezone] = useState<string>(getDefaultTimezone());

  const fetchPosts = async (status?: string) => {
    setLoading(true);
    try {
      const url = status ? `/api/posts?status=${status}` : "/api/posts";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) setPosts(data);
    } catch {
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const statusMap = { drafts: "DRAFT", scheduled: "SCHEDULED", published: "PUBLISHED", failed: "FAILED" };
    fetchPosts(statusMap[activeTab as keyof typeof statusMap]);
  }, [activeTab]);

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((data: { timezone?: string }) => {
        if (data.timezone) {
          setUserTimezone(data.timezone);
        }
      })
      .catch(console.error);
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Post deleted");
      setDeleteId(null);
      setSelected((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
      const statusMap: Record<string, string> = { drafts: "DRAFT", scheduled: "SCHEDULED", published: "PUBLISHED", failed: "FAILED" };
      fetchPosts(statusMap[activeTab]);
    } catch {
      toast.error("Failed to delete post");
    }
  };

  const handleDuplicate = async (post: Post) => {
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: post.text,
          tags: post.tags,
          status: "DRAFT",
        }),
      });
      if (!res.ok) throw new Error("Failed to duplicate");
      toast.success("Post duplicated");
      fetchPosts("DRAFT");
    } catch {
      toast.error("Failed to duplicate post");
    }
  };

  const handleRetry = async (id: string) => {
    try {
      toast.loading("Retrying...", { id: "retry" });
      const res = await fetch(`/api/posts/${id}/retry`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to retry");
      toast.success(data.message || "Post published successfully", { id: "retry" });
      // Refresh the current tab
      const statusMap = { drafts: "DRAFT", scheduled: "SCHEDULED", published: "PUBLISHED", failed: "FAILED" };
      fetchPosts(statusMap[activeTab as keyof typeof statusMap]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to retry post", { id: "retry" });
    }
  };

  const handleBulkDelete = async () => {
    for (const id of selected) {
      await fetch(`/api/posts/${id}`, { method: "DELETE" });
    }
    toast.success(`${selected.size} posts deleted`);
    setSelected(new Set());
    const statusMap: Record<string, string> = { drafts: "DRAFT", scheduled: "SCHEDULED", published: "PUBLISHED", failed: "FAILED" };
    fetchPosts(statusMap[activeTab]);
  };

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === posts.length) setSelected(new Set());
    else setSelected(new Set(posts.map((p) => p.id)));
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case "DRAFT": return "secondary";
      case "SCHEDULED": return "outline";
      case "PUBLISHED": return "default";
      case "FAILED": return "destructive";
      default: return "secondary";
    }
  };

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="drafts">Drafts</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
        </TabsList>

        {selected.size > 0 && (
          <div className="mt-4 flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleBulkDelete}>
              Delete selected ({selected.size})
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear selection
            </Button>
          </div>
        )}

        <TabsContent value="drafts" className="mt-4">
          <PostsList
            posts={posts}
            loading={loading}
            selected={selected}
            toggleSelect={toggleSelect}
            toggleSelectAll={toggleSelectAll}
            statusVariant={statusVariant}
            onDuplicate={handleDuplicate}
            onDelete={(id) => setDeleteId(id)}
            userTimezone={userTimezone}
          />
        </TabsContent>
        <TabsContent value="scheduled" className="mt-4">
          <PostsList
            posts={posts}
            loading={loading}
            selected={selected}
            toggleSelect={toggleSelect}
            toggleSelectAll={toggleSelectAll}
            statusVariant={statusVariant}
            onDuplicate={handleDuplicate}
            onDelete={(id) => setDeleteId(id)}
            showScheduled
            userTimezone={userTimezone}
          />
        </TabsContent>
        <TabsContent value="published" className="mt-4">
          <PostsList
            posts={posts}
            loading={loading}
            selected={selected}
            toggleSelect={toggleSelect}
            toggleSelectAll={toggleSelectAll}
            statusVariant={statusVariant}
            onDuplicate={handleDuplicate}
            onDelete={(id) => setDeleteId(id)}
            showPublished
            userTimezone={userTimezone}
          />
        </TabsContent>
        <TabsContent value="failed" className="mt-4">
          <PostsList
            posts={posts}
            loading={loading}
            selected={selected}
            toggleSelect={toggleSelect}
            toggleSelectAll={toggleSelectAll}
            statusVariant={statusVariant}
            onDuplicate={handleDuplicate}
            onDelete={(id) => setDeleteId(id)}
            onRetry={handleRetry}
            showFailed
            userTimezone={userTimezone}
          />
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function PostsList({
  posts,
  loading,
  selected,
  toggleSelect,
  toggleSelectAll,
  statusVariant,
  onDuplicate,
  onDelete,
  onRetry,
  showScheduled,
  showPublished,
  showFailed,
  userTimezone,
}: {
  posts: Post[];
  loading: boolean;
  selected: Set<string>;
  toggleSelect: (id: string) => void;
  toggleSelectAll: () => void;
  statusVariant: (s: string) => "default" | "secondary" | "outline" | "destructive";
  onDuplicate: (post: Post) => void;
  onDelete: (id: string) => void;
  onRetry?: (id: string) => void;
  showScheduled?: boolean;
  showPublished?: boolean;
  showFailed?: boolean;
  userTimezone: string;
}) {
  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  if (posts.length === 0) {
    return <div className="text-sm text-muted-foreground">No posts found.</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              checked={selected.size === posts.length}
              onCheckedChange={toggleSelectAll}
            />
          </TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Preview</TableHead>
          {showScheduled && <TableHead>Scheduled</TableHead>}
          {showPublished && <TableHead>Published</TableHead>}
          {showFailed && <TableHead>Failed at</TableHead>}
          <TableHead>Tags</TableHead>
          <TableHead>Last edited</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {posts.map((post) => (
          <TableRow key={post.id}>
            <TableCell>
              <Checkbox
                checked={selected.has(post.id)}
                onCheckedChange={() => toggleSelect(post.id)}
              />
            </TableCell>
            <TableCell>
              <Badge variant={statusVariant(post.status)}>{post.status}</Badge>
            </TableCell>
            <TableCell className="max-w-[200px] truncate">
              {post.text.slice(0, 60)}
              {post.text.length > 60 ? "..." : ""}
            </TableCell>
            {showScheduled && (
              <TableCell>
                {post.scheduledAt
                  ? formatInTimezone(new Date(post.scheduledAt), userTimezone, "d MMM, HH:mm")
                  : "—"}
              </TableCell>
            )}
            {showPublished && (
              <TableCell>
                {post.publishedAt
                  ? formatInTimezone(new Date(post.publishedAt), userTimezone, "d MMM, HH:mm")
                  : "—"}
              </TableCell>
            )}
            {showFailed && (
              <TableCell>
                {post.scheduledAt
                  ? formatInTimezone(new Date(post.scheduledAt), userTimezone, "d MMM, HH:mm")
                  : formatInTimezone(new Date(post.updatedAt), userTimezone, "d MMM, HH:mm")}
              </TableCell>
            )}
            <TableCell className="text-muted-foreground">
              {post.tags || "—"}
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {formatInTimezone(new Date(post.updatedAt), userTimezone, "d MMM")}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-xs">
                    <MoreHorizontalIcon className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {post.status === "FAILED" && onRetry && (
                    <DropdownMenuItem onClick={() => onRetry(post.id)}>
                      <RefreshCwIcon className="mr-2 size-4" />
                      Retry
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href={`/composer?edit=${post.id}`}>
                      <PencilIcon className="mr-2 size-4" />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicate(post)}>
                    <CopyIcon className="mr-2 size-4" />
                    Duplicate
                  </DropdownMenuItem>
                  {post.status === "SCHEDULED" && (
                    <DropdownMenuItem asChild>
                      <Link href={`/composer?edit=${post.id}&reschedule=1`}>
                        <CalendarIcon className="mr-2 size-4" />
                        Reschedule
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDelete(post.id)}
                  >
                    <TrashIcon className="mr-2 size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
