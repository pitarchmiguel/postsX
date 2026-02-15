"use client";

import { useSchedulerPoll } from "@/lib/hooks/use-scheduler-poll";
import { useEffect } from "react";

/**
 * Component that automatically polls the scheduler endpoint
 * to publish scheduled posts when they're due
 *
 * This runs in the background while the dashboard is open,
 * ensuring posts are published automatically without manual intervention
 */
export function SchedulerPoll() {
  useEffect(() => {
    console.log("[SchedulerPoll] 🎯 Component mounted!");
  }, []);

  // Poll every 60 seconds (1 minute)
  useSchedulerPoll(60000);

  // This component doesn't render anything
  return null;
}
