"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlayIcon, AlertCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type SchedulerStatus = {
  run: {
    timestamp: string;
    processed: number;
    simulationMode: boolean;
  } | null;
  error: {
    timestamp: string;
    simulationMode: boolean;
    failures: { id: string; status: string; error?: string }[];
  } | null;
};

export function RunSchedulerButton() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<SchedulerStatus | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/scheduler/status");
      if (res.ok) setStatus(await res.json() as SchedulerStatus);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleRun = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/scheduler/run", { method: "POST" });
      const data = await res.json() as {
        processed?: number;
        results?: { id: string; status: string; error?: string }[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Failed to run scheduler");

      const failed = (data.results ?? []).filter((r) => r.status === "failed");
      if (failed.length > 0) {
        const firstError = failed[0].error ?? "Unknown error";
        toast.error(`${failed.length} post(s) failed: ${firstError}`);
      } else {
        toast.success(`Scheduler ran: ${data.processed ?? 0} posts processed`);
      }

      await fetchStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to run scheduler");
    } finally {
      setLoading(false);
    }
  };

  const lastRunTime = status?.run?.timestamp
    ? formatDistanceToNow(new Date(status.run.timestamp), { addSuffix: true })
    : null;

  const lastErrorTime = status?.error?.timestamp
    ? formatDistanceToNow(new Date(status.error.timestamp), { addSuffix: true })
    : null;

  const firstFailure = status?.error?.failures?.[0];

  return (
    <div className="flex flex-col gap-1">
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

      {status?.run && (
        <p className="text-xs text-muted-foreground">
          Last run {lastRunTime} · sim {status.run.simulationMode ? "ON" : "OFF"}
        </p>
      )}

      {firstFailure && (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircleIcon className="size-3 shrink-0" />
          <span>
            Error {lastErrorTime}: {firstFailure.error ?? "publish failed"}
          </span>
        </p>
      )}
    </div>
  );
}
