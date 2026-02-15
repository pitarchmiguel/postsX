import { useEffect, useRef } from "react";

/**
 * Hook that polls the scheduler endpoint at regular intervals
 * to automatically publish scheduled posts
 *
 * @param intervalMs - Polling interval in milliseconds (default: 60000 = 1 minute)
 */
export function useSchedulerPoll(intervalMs: number = 60000) {
  const isPollingRef = useRef(false);

  useEffect(() => {
    console.log("[SchedulerPoll] 🚀 Hook mounted - starting scheduler polling");

    // Run immediately on mount
    const runScheduler = async () => {
      // Prevent concurrent executions
      if (isPollingRef.current) {
        console.log("[SchedulerPoll] ⏭️  Skipping - already running");
        return;
      }

      console.log("[SchedulerPoll] ⏰ Running scheduler...");
      isPollingRef.current = true;

      try {
        const response = await fetch("/api/scheduler/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          }
        });

        const data = await response.json();

        if (!response.ok) {
          console.warn(`[SchedulerPoll] ⚠️  Response status: ${response.status}`, data);
        } else {
          console.log(`[SchedulerPoll] ✅ Success - Processed: ${data.processed} posts`, data);
        }
      } catch (err) {
        console.error("[SchedulerPoll] ❌ Failed:", err);
      } finally {
        isPollingRef.current = false;
      }
    };

    // Run immediately
    runScheduler();

    // Set up interval for subsequent runs
    console.log(`[SchedulerPoll] ⏱️  Setting up interval: every ${intervalMs}ms (${intervalMs/1000}s)`);
    const interval = setInterval(runScheduler, intervalMs);

    return () => {
      console.log("[SchedulerPoll] 🛑 Hook unmounting - stopping scheduler polling");
      clearInterval(interval);
      isPollingRef.current = false;
    };
  }, [intervalMs]);
}
