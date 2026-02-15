"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlayIcon } from "lucide-react";
import { toast } from "sonner";

export function RunSchedulerButton() {
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/scheduler/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to run scheduler");
      toast.success(`Scheduler ran: ${data.processed} posts processed`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to run scheduler");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRun}
      disabled={loading}
      className="flex items-center gap-2"
    >
      <PlayIcon className="size-4" />
      {loading ? "Running..." : "Run scheduler now"}
    </Button>
  );
}
