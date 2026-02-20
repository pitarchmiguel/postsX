"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { SendIcon } from "lucide-react";

const FEEDBACK_TYPES = [
  { value: "suggestion", label: "Suggestion" },
  { value: "feature", label: "New feature" },
  { value: "bug", label: "Bug or error" },
  { value: "other", label: "Other" },
] as const;

export function FeedbackForm() {
  const [text, setText] = useState("");
  const [type, setType] = useState<string>("suggestion");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      toast.error("Please enter your feedback");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), type }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error?.text?.[0] ?? data.error ?? "Failed to send";
        toast.error(msg);
        return;
      }
      toast.success("Feedback sent. Thank you!");
      setText("");
    } catch {
      toast.error("Failed to send feedback");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send your feedback</CardTitle>
        <CardDescription>
          Suggestions, bugs, or ideas to improve the app. All feedback is recorded for review.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel>Type</FieldLabel>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Your message</FieldLabel>
              <Textarea
                placeholder="Describe your feedback..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                maxLength={5000}
                className="resize-none"
              />
              <p className="text-muted-foreground text-xs mt-1">
                {text.length}/5000 characters
              </p>
            </Field>
          </FieldGroup>
          <Button type="submit" disabled={loading}>
            <SendIcon className="size-4 mr-2" />
            {loading ? "Sending..." : "Send feedback"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
