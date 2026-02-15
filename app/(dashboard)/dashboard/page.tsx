import Link from "next/link";

export const dynamic = "force-dynamic";

type PostItem = { id: string; text: string; scheduledAt: Date | null };
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDashboardStats } from "@/lib/dashboard";
import { RunSchedulerButton } from "@/components/run-scheduler-button";
import { CreatePostDialog } from "@/components/create-post-dialog";
import { format } from "date-fns";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  const formatTime = (date: Date) => format(new Date(date), "HH:mm");
  const formatDate = (date: Date) => format(new Date(date), "EEE d MMM");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="flex gap-2">
          <RunSchedulerButton />
          <CreatePostDialog />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Scheduled this week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{stats.scheduledThisWeek}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Published this week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{stats.publishedThisWeek}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Drafts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{stats.drafts}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Best time slots
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-sm">
              {stats.bestTimeSlots ?? (
                <span className="text-muted-foreground">—</span>
              )}
            </span>
            {stats.consistencyPlan && (
              <p className="mt-1 text-xs text-muted-foreground">
                Suggested: {stats.consistencyPlan}
              </p>
            )}
          </CardContent>
        </Card>
      </div>


      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s queue</CardTitle>
            <p className="text-sm text-muted-foreground">
              Posts scheduled for today
            </p>
          </CardHeader>
          <CardContent>
            {stats.todayQueue.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No posts scheduled for today.
              </p>
            ) : (
              <ul className="space-y-2">
                {stats.todayQueue.map((post: PostItem) => (
                  <li
                    key={post.id}
                    className="flex items-center justify-between rounded-md border border-border p-2"
                  >
                    <span className="truncate text-sm">{post.text.slice(0, 50)}...</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{formatTime(post.scheduledAt!)}</Badge>
                      <Button variant="ghost" size="xs" asChild>
                        <Link href={`/composer?edit=${post.id}`}>Edit</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Next 7 days</CardTitle>
            <p className="text-sm text-muted-foreground">
              Upcoming scheduled posts
            </p>
          </CardHeader>
          <CardContent>
            {stats.next7Days.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming posts.
              </p>
            ) : (
              <ul className="space-y-2">
                {stats.next7Days.slice(0, 7).map((post: PostItem) => (
                  <li
                    key={post.id}
                    className="flex items-center justify-between rounded-md border border-border p-2"
                  >
                    <span className="truncate text-sm">{post.text.slice(0, 40)}...</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(post.scheduledAt!)}
                      </span>
                      <Badge variant="outline">{formatTime(post.scheduledAt!)}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
