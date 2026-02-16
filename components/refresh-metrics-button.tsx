"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function RefreshMetricsButton() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/metrics/refresh", {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to refresh metrics");
      }

      const result = await res.json();

      // Show success toast with details
      if (result.refreshed > 0) {
        toast.success(
          `✓ Refreshed metrics for ${result.refreshed} post${result.refreshed !== 1 ? 's' : ''}`,
          {
            description: result.rateLimited
              ? "Rate limit reached. Some posts were skipped."
              : result.failed > 0
              ? `${result.failed} post${result.failed !== 1 ? 's' : ''} failed to refresh.`
              : "All metrics updated successfully.",
          }
        );
      } else {
        toast.info("No posts to refresh", {
          description: "All posts are up to date or no published posts found.",
        });
      }

      // Refresh the page to show updated metrics
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to refresh metrics", {
        description: "Please try again or check the console for details.",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={isRefreshing}
    >
      <RefreshCwIcon
        className={`size-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
      />
      {isRefreshing ? "Refreshing..." : "Refresh Metrics"}
    </Button>
  );
}
