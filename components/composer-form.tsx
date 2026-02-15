"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { MAX_TWEET_LENGTH, DEFAULT_TIMEZONE } from "@/lib/constants";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import { SaveIcon, CalendarIcon, PlusIcon, TrashIcon } from "lucide-react";

const HOOK_IDEAS = [
  "The one thing that changed everything...",
  "Nobody talks about this...",
  "I wish I knew this earlier...",
  "After 100 tries, here's what worked...",
  "The biggest mistake I made...",
];

const CTA_SUGGESTIONS = [
  "What would you add?",
  "Agree or disagree?",
  "Save this for later",
  "Follow for more",
  "Drop a 🔥 if this helped",
];

const FORMATTING_TIPS = [
  "Use line breaks for readability",
  "Numbers and lists perform well",
  "Keep first line under 125 chars for preview",
];

type ComposerFormProps = {
  searchParams?: Promise<{ edit?: string; reschedule?: string }>;
  onSuccess?: () => void;
};

export function ComposerForm({ searchParams, onSuccess }: ComposerFormProps) {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params?.get("edit") ?? undefined;

  const [text, setText] = useState("");
  const [threadMode, setThreadMode] = useState(false);
  const [threadTexts, setThreadTexts] = useState<string[]>([""]);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHelpers, setShowHelpers] = useState(false);
  const [previewUser, setPreviewUser] = useState<{
    username?: string | null;
    name?: string | null;
    profileImageUrl?: string | null;
  }>({});

  useEffect(() => {
    fetch("/api/x/profile")
      .then((r) => r.json())
      .then((p: { username?: string | null; name?: string | null; profileImageUrl?: string | null }) => {
        setPreviewUser({
          username: p.username ?? null,
          name: p.name ?? null,
          profileImageUrl: p.profileImageUrl ?? null,
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!editId) return;
    fetch(`/api/posts/${editId}`)
      .then((r) => r.json())
      .then((post: { text?: string; threadJson?: string | null; scheduledAt?: string | null; tags?: string; error?: string }) => {
        if (post && post.text !== undefined) {
          setText(post.text);
          setTags(post.tags || "");
          setScheduledAt(post.scheduledAt ? new Date(post.scheduledAt) : null);
          if (post.threadJson) {
            try {
              const arr = JSON.parse(post.threadJson) as string[];
              if (Array.isArray(arr) && arr.length > 0) {
                setThreadMode(true);
                setThreadTexts(arr);
              }
            } catch {
              // ignore
            }
          }
        }
      })
      .catch(() => toast.error("Failed to load post"));
  }, [editId]);

  const displayText = threadMode ? threadTexts.join("\n\n---\n\n") : text;
  const charCount = threadMode
    ? threadTexts.reduce((sum, t) => sum + t.length, 0)
    : text.length;
  const isOverLimit = charCount > MAX_TWEET_LENGTH;

  const handleSaveDraft = async () => {
    const content = threadMode ? threadTexts[0] || text : text;
    if (!content.trim()) {
      toast.error("Enter some text");
      return;
    }
    setLoading(true);
    try {
      const body = {
        text: content,
        threadJson: threadMode ? JSON.stringify(threadTexts.filter(Boolean)) : null,
        tags,
        status: "DRAFT",
      };
      const url = editId ? `/api/posts/${editId}` : "/api/posts";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Draft saved");
      if (onSuccess) onSuccess();
      else if (!editId) router.push("/posts");
    } catch {
      toast.error("Failed to save draft");
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async () => {
    const content = threadMode ? threadTexts[0] || text : text;
    if (!content.trim()) {
      toast.error("Enter some text");
      return;
    }
    if (!scheduledAt) {
      toast.error("Select a date and time");
      return;
    }
    setLoading(true);
    try {
      const body = {
        text: content,
        threadJson: threadMode ? JSON.stringify(threadTexts.filter(Boolean)) : null,
        scheduledAt: scheduledAt.toISOString(),
        tags,
        status: "SCHEDULED",
      };
      const url = editId ? `/api/posts/${editId}` : "/api/posts";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to schedule");
      toast.success("Post scheduled");
      if (onSuccess) onSuccess();
      else router.push("/dashboard");
    } catch {
      toast.error("Failed to schedule");
    } finally {
      setLoading(false);
    }
  };

  const handlePublishNow = async () => {
    const content = threadMode ? threadTexts[0] || text : text;
    if (!content.trim()) {
      toast.error("Enter some text");
      return;
    }
    setLoading(true);
    try {
      let postId = editId;
      if (!postId) {
        const createRes = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: content,
            threadJson: threadMode ? JSON.stringify(threadTexts.filter(Boolean)) : null,
            tags,
            status: "DRAFT",
          }),
        });
        if (!createRes.ok) throw new Error("Failed to create");
        const created = await createRes.json();
        postId = created.id;
      }
      const pubRes = await fetch(`/api/publish/${postId}`, { method: "POST" });
      if (!pubRes.ok) throw new Error("Failed to publish");
      toast.success("Post published");
      if (onSuccess) onSuccess();
      else router.push("/posts");
    } catch {
      toast.error("Failed to publish");
    } finally {
      setLoading(false);
    }
  };

  const addThreadTweet = () => setThreadTexts((t) => [...t, ""]);
  const removeThreadTweet = (i: number) =>
    setThreadTexts((t) => t.filter((_, idx) => idx !== i));
  const updateThreadTweet = (i: number, v: string) =>
    setThreadTexts((t) => {
      const next = [...t];
      next[i] = v;
      return next;
    });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <FieldGroup>
          <Field>
            <FieldLabel>Post</FieldLabel>
            {threadMode ? (
              <div className="space-y-3">
                {threadTexts.map((t, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Tweet {i + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => removeThreadTweet(i)}
                        disabled={threadTexts.length <= 1}
                      >
                        <TrashIcon className="size-3" />
                      </Button>
                    </div>
                    <Textarea
                      value={t}
                      onChange={(e) => updateThreadTweet(i, e.target.value)}
                      placeholder="Tweet text..."
                      className="min-h-[80px]"
                      maxLength={MAX_TWEET_LENGTH}
                    />
                    <span
                      className={`text-xs ${t.length > MAX_TWEET_LENGTH ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      {t.length}/{MAX_TWEET_LENGTH}
                    </span>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addThreadTweet}
                >
                  <PlusIcon className="mr-2 size-4" />
                  Add tweet
                </Button>
              </div>
            ) : (
              <>
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="What's on your mind?"
                  className="min-h-[120px]"
                  maxLength={MAX_TWEET_LENGTH}
                />
                <span
                  className={`text-xs ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {charCount}/{MAX_TWEET_LENGTH}
                </span>
              </>
            )}
          </Field>

          <Field>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="thread-mode"
                checked={threadMode}
                onChange={(e) => {
                  setThreadMode(e.target.checked);
                  if (e.target.checked && !threadMode)
                    setThreadTexts([text || ""]);
                }}
                className="rounded border-border"
              />
              <label htmlFor="thread-mode" className="text-sm">
                Thread mode
              </label>
            </div>
          </Field>

          <Field>
            <FieldLabel>Helpers</FieldLabel>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowHelpers(!showHelpers)}
            >
              {showHelpers ? "Hide" : "Show"} hook ideas, CTAs, tips
            </Button>
            {showHelpers && (
              <div className="mt-2 space-y-2 rounded-md border border-border p-3 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Hook ideas</p>
                  <ul className="mt-1 list-inside list-disc text-xs">
                    {HOOK_IDEAS.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">CTA suggestions</p>
                  <ul className="mt-1 list-inside list-disc text-xs">
                    {CTA_SUGGESTIONS.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Formatting tips</p>
                  <ul className="mt-1 list-inside list-disc text-xs">
                    {FORMATTING_TIPS.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </Field>

          <Field>
            <FieldLabel>Scheduled</FieldLabel>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 size-4" />
                  {scheduledAt
                    ? format(scheduledAt, "PPP p")
                    : "Pick date and time"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={scheduledAt ?? undefined}
                  onSelect={(d) => setScheduledAt(d ?? null)}
                  disabled={(d) => d < new Date()}
                />
                <div className="flex gap-2 border-t p-2">
                  <Input
                    type="time"
                    onChange={(e) => {
                      const [h, m] = e.target.value.split(":").map(Number);
                      const d = scheduledAt ?? addDays(new Date(), 1);
                      d.setHours(h, m, 0, 0);
                      setScheduledAt(new Date(d));
                    }}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </Field>

          <Field>
            <FieldLabel>Timezone</FieldLabel>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Europe/Madrid">Europe/Madrid</SelectItem>
                <SelectItem value="Europe/London">Europe/London</SelectItem>
                <SelectItem value="America/New_York">America/New_York</SelectItem>
                <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>Tags</FieldLabel>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="build, ship, learn"
            />
          </Field>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={loading}
            >
              <SaveIcon className="mr-2 size-4" />
              Save draft
            </Button>
            <Button
              variant="secondary"
              onClick={handleSchedule}
              disabled={loading || !scheduledAt}
            >
              Schedule
            </Button>
            <Button
              onClick={handlePublishNow}
              disabled={loading}
            >
              Publish now
            </Button>
          </div>
        </FieldGroup>
      </div>

      <div>
        <FieldLabel className="mb-2 block">Preview</FieldLabel>
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex gap-3">
              {previewUser.profileImageUrl ? (
                <img
                  src={previewUser.profileImageUrl.replace(/^http:\/\//, "https://")}
                  alt=""
                  className="size-10 shrink-0 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="size-10 shrink-0 rounded-full bg-muted" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {previewUser.username ? `@${previewUser.username}` : "@you"}
                  {previewUser.name && (
                    <span className="ml-1 font-normal text-muted-foreground">
                      ({previewUser.name})
                    </span>
                  )}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                  {displayText || "Your post will appear here..."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
