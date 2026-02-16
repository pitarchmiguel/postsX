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
import { format, addDays, startOfDay } from "date-fns";
import { parseTimeInTimezone, convertToUTC, extractTimeInTimezone, formatInTimezone } from "@/lib/timezone";
import { toast } from "sonner";
import { SaveIcon, CalendarIcon, PlusIcon, TrashIcon, HelpCircleIcon, ExternalLinkIcon, CheckCircle2Icon, XCircleIcon } from "lucide-react";

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
  const [userTimezone, setUserTimezone] = useState<string>(DEFAULT_TIMEZONE);
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHelpers, setShowHelpers] = useState(false);
  const [communityId, setCommunityId] = useState<string | null>(null);
  const [showCommunityInput, setShowCommunityInput] = useState(false);
  const [manualCommunityId, setManualCommunityId] = useState("");
  const [showCommunityHelp, setShowCommunityHelp] = useState(false);
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
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((data: { timezone?: string }) => {
        if (data.timezone) {
          setUserTimezone(data.timezone);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!editId) return;
    fetch(`/api/posts/${editId}`)
      .then((r) => r.json())
      .then((post: { text?: string; threadJson?: string | null; scheduledAt?: string | null; tags?: string; communityId?: string | null; error?: string }) => {
        if (post && post.text !== undefined) {
          setText(post.text);
          setTags(post.tags || "");
          setScheduledAt(post.scheduledAt ? new Date(post.scheduledAt) : null);
          setCommunityId(post.communityId || null);
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
        communityId,
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
        communityId,
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
            communityId,
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

  const validateCommunityId = (id: string): { valid: boolean; error?: string } => {
    if (!id.trim()) return { valid: false, error: "Community ID is required" };
    if (!/^\d{1,19}$/.test(id.trim())) {
      return { valid: false, error: "Invalid format. Must be 1-19 digits (e.g., 1234567890)" };
    }
    return { valid: true };
  };

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
                    ? formatInTimezone(scheduledAt, userTimezone, "PPP p")
                    : "Pick date and time"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={scheduledAt ?? undefined}
                  onSelect={(d) => setScheduledAt(d ?? null)}
                  disabled={(d) => startOfDay(d) < startOfDay(new Date())}
                />
                <div className="flex gap-2 border-t p-2">
                  <Input
                    type="time"
                    value={
                      scheduledAt
                        ? extractTimeInTimezone(scheduledAt, userTimezone)
                        : ""
                    }
                    onChange={(e) => {
                      const timeString = e.target.value;
                      const baseDate = scheduledAt ?? addDays(new Date(), 1);

                      // Parse time in user's timezone
                      const dateInUserTz = parseTimeInTimezone(timeString, baseDate, userTimezone);

                      // Convert to UTC for storage
                      const utcDate = convertToUTC(dateInUserTz, userTimezone);

                      setScheduledAt(utcDate);
                    }}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </Field>

          <Field>
            <FieldLabel>Tags</FieldLabel>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="build, ship, learn"
            />
          </Field>

          <Field>
            <FieldLabel>Post Destination</FieldLabel>
            <div className="space-y-2">
              {/* Main options: Regular feed or Community */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={communityId ? "outline" : "default"}
                  size="sm"
                  onClick={() => {
                    setCommunityId(null);
                    setShowCommunityInput(false);
                  }}
                  className="flex-1"
                >
                  Regular Feed
                </Button>
                <Button
                  type="button"
                  variant={communityId ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowCommunityInput(true)}
                  className="flex-1"
                >
                  Community
                </Button>
              </div>

              {/* Manual Community ID input */}
              {showCommunityInput && (
                <div className="space-y-3 p-3 border border-border rounded-md bg-muted/30">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">Enter Community ID</p>
                      <p className="text-xs text-muted-foreground">
                        19-digit numeric ID from the community URL
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setShowCommunityHelp(!showCommunityHelp)}
                      className="shrink-0"
                    >
                      <HelpCircleIcon className="size-4" />
                    </Button>
                  </div>

                  {/* Help section */}
                  {showCommunityHelp && (
                    <div className="space-y-2 p-3 bg-background rounded border border-border">
                      <p className="text-xs font-medium">How to find Community ID:</p>
                      <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                        <li>Go to X and navigate to your community</li>
                        <li>Look at the URL in your browser</li>
                        <li>Copy the numbers after <code className="bg-muted px-1 py-0.5 rounded text-[10px]">/communities/</code></li>
                      </ol>
                      <p className="text-xs text-muted-foreground mt-2">
                        Example URL: <code className="bg-muted px-1 py-0.5 rounded text-[10px]">twitter.com/i/communities/1234567890</code>
                      </p>
                      <a
                        href="https://twitter.com/i/communities"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                      >
                        Open X Communities
                        <ExternalLinkIcon className="size-3" />
                      </a>
                    </div>
                  )}

                  {/* Input field with validation */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Input
                          value={manualCommunityId}
                          onChange={(e) => setManualCommunityId(e.target.value)}
                          placeholder="1234567890123456789"
                          className="pr-8"
                        />
                        {manualCommunityId && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            {validateCommunityId(manualCommunityId).valid ? (
                              <CheckCircle2Icon className="size-4 text-green-500" />
                            ) : (
                              <XCircleIcon className="size-4 text-destructive" />
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const validation = validateCommunityId(manualCommunityId);
                          if (validation.valid) {
                            setCommunityId(manualCommunityId.trim());
                            setShowCommunityInput(false);
                            setManualCommunityId("");
                            toast.success(`Community ID set: ${manualCommunityId.trim()}`);
                          } else {
                            toast.error(validation.error || "Invalid Community ID");
                          }
                        }}
                        disabled={!manualCommunityId.trim()}
                      >
                        Set
                      </Button>
                    </div>
                    {manualCommunityId && !validateCommunityId(manualCommunityId).valid && (
                      <p className="text-xs text-destructive">
                        {validateCommunityId(manualCommunityId).error}
                      </p>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowCommunityInput(false);
                      setManualCommunityId("");
                      setShowCommunityHelp(false);
                    }}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {/* Show current community ID with edit option */}
              {communityId && !showCommunityInput && (
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded border border-border">
                  <div className="flex items-center gap-2">
                    <CheckCircle2Icon className="size-4 text-green-500" />
                    <p className="text-xs text-muted-foreground">
                      Community: <code className="bg-muted px-1 py-0.5 rounded font-mono">{communityId}</code>
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      setManualCommunityId(communityId);
                      setShowCommunityInput(true);
                    }}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>
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
