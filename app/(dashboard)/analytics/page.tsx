import {
  getTopPosts,
  getBestTimeSlotsChart,
  getEngagementStats,
  getBestDayOfWeek,
} from "@/lib/analytics";

export const dynamic = "force-dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default async function AnalyticsPage() {
  const [topPosts, timeSlots, engagementStats, dayOfWeek] = await Promise.all([
    getTopPosts(10),
    getBestTimeSlotsChart(),
    getEngagementStats(),
    getBestDayOfWeek(),
  ]);

  const maxEngagement = Math.max(...timeSlots.map((s) => s.avgEngagement), 1);
  const totalPosts = timeSlots.reduce((sum, s) => sum + s.postCount, 0);
  const maxDayEngagement = Math.max(...dayOfWeek.map((d) => d.avgEngagement), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Analytics</h1>
      </div>

      {/* Engagement Stats Overview */}
      {engagementStats.totalPosts > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Posts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{engagementStats.totalPosts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Engagement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{engagementStats.avgEngagement}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Best Hour (UTC)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {engagementStats.topHour !== null ? `${engagementStats.topHour}:00` : "—"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Best Day
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {engagementStats.topDay || "—"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 10 posts</CardTitle>
            <p className="text-sm text-muted-foreground">
              By engagement (impressions + likes + replies + reposts + bookmarks)
            </p>
          </CardHeader>
          <CardContent>
            {topPosts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No published posts yet.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Publish your first post to see analytics and recommendations.
                </p>
              </div>
            ) : (
              <ol className="space-y-2">
                {topPosts.map((item, i) => (
                  <li
                    key={item.post.id}
                    className="flex gap-2 rounded-md border border-border p-2"
                  >
                    <span className="text-muted-foreground">{i + 1}.</span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {item.post.text.slice(0, 80)}
                      {item.post.text.length > 80 ? "..." : ""}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.impressions} imp · {item.likes} likes
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Best time slots</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Average engagement by hour (UTC)
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {timeSlots.every((s) => s.avgEngagement === 0) ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  Publish at least 10 posts to see reliable time slot recommendations.
                </p>
              </div>
            ) : (
              <>
                <div className="flex h-40 items-end gap-1">
                  {timeSlots.map((slot) => (
                    <div
                      key={slot.hour}
                      className="flex flex-1 flex-col items-center gap-1"
                      title={`${slot.hour}:00 - Avg: ${slot.avgEngagement} (${slot.postCount} posts, ${slot.confidence} confidence)`}
                    >
                      <div
                        className={cn(
                          "w-full min-w-[4px] rounded-t bg-primary transition-all",
                          slot.confidence === "low" && "opacity-40",
                          slot.confidence === "medium" && "opacity-70",
                          slot.confidence === "high" && "opacity-100"
                        )}
                        style={{
                          height: `${(slot.avgEngagement / maxEngagement) * 100}%`,
                          minHeight: slot.avgEngagement > 0 ? "4px" : "0",
                        }}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {slot.hour}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Times shown in UTC. Based on {totalPosts} published posts.
                </p>
                <div className="mt-2 flex justify-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded bg-primary opacity-100" />
                    High (10+)
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded bg-primary opacity-70" />
                    Medium (3-9)
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded bg-primary opacity-40" />
                    Low (1-2)
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Best Days of Week */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Best days of the week</CardTitle>
            <p className="text-sm text-muted-foreground">
              Average engagement by day (UTC)
            </p>
          </CardHeader>
          <CardContent>
            {dayOfWeek.every((d) => d.postCount === 0) ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  Publish posts throughout the week to see day-of-week patterns.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {dayOfWeek.map((day) => (
                  <div key={day.day} className="flex items-center gap-3">
                    <div className="w-24 text-sm font-medium">{day.dayName}</div>
                    <div className="flex-1">
                      <div
                        className="h-8 rounded bg-primary/60 transition-all flex items-center px-2"
                        style={{
                          width: `${(day.avgEngagement / maxDayEngagement) * 100}%`,
                          minWidth: day.postCount > 0 ? "40px" : "0",
                        }}
                      >
                        {day.postCount > 0 && (
                          <span className="text-xs text-primary-foreground font-medium">
                            {day.avgEngagement}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-32 text-xs text-muted-foreground text-right">
                      {day.postCount > 0 ? (
                        <>
                          {day.postCount} posts
                          {day.bestHours.length > 0 && (
                            <span className="block">
                              Best: {day.bestHours.slice(0, 3).join(", ")}h
                            </span>
                          )}
                        </>
                      ) : (
                        "No data"
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
