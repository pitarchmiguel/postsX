import { getTopPosts, getBestTimeSlotsChart } from "@/lib/analytics";

export const dynamic = "force-dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AnalyticsPage() {
  const [topPosts, timeSlots] = await Promise.all([
    getTopPosts(10),
    getBestTimeSlotsChart(),
  ]);

  const maxEngagement = Math.max(...timeSlots.map((s) => s.avgEngagement), 1);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Analytics</h1>

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
              <p className="text-sm text-muted-foreground">
                No published posts yet.
              </p>
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
            <CardTitle className="text-base">Best time slots</CardTitle>
            <p className="text-sm text-muted-foreground">
              Average engagement by hour (UTC)
            </p>
          </CardHeader>
          <CardContent>
            {timeSlots.every((s) => s.avgEngagement === 0) ? (
              <p className="text-sm text-muted-foreground">
                No data yet. Publish posts to see patterns.
              </p>
            ) : (
              <div className="flex h-40 items-end gap-1">
                {timeSlots.map((slot) => (
                  <div
                    key={slot.hour}
                    className="flex flex-1 flex-col items-center gap-1"
                    title={`${slot.hour}:00 - ${slot.avgEngagement} avg`}
                  >
                    <div
                      className="w-full min-w-[4px] rounded-t bg-primary/60 transition-all"
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
