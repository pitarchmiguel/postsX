import Link from "next/link";

export const dynamic = "force-dynamic";

type PostItem = { id: string; text: string; scheduledAt: Date | null };
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDashboardStats } from "@/lib/dashboard";
import { requireUser } from "@/lib/auth";
import { RunSchedulerButton } from "@/components/run-scheduler-button";
import { CreatePostDialog } from "@/components/create-post-dialog";
import { format } from "date-fns";

export default async function DashboardPage() {
  let stats;
  try {
    const user = await requireUser();
    stats = await getDashboardStats(user.id);
  } catch (err) {
    // Log full error details for debugging
    console.error('[Dashboard] Database connection failed:', err);
    console.error('[Dashboard] Error type:', err?.constructor?.name);

    const message = err instanceof Error ? err.message : String(err);
    const errorCode = (err as any)?.code;
    const errorDetails = (err as any)?.meta?.message;

    // Categorize error type for better troubleshooting
    let errorType = 'Unknown Error';
    if (message.includes('Circuit breaker') || message.includes('circuit')) {
      errorType = 'Circuit Breaker (Supabase connection limit)';
    } else if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
      errorType = 'Connection Timeout';
    } else if (message.includes('ECONNREFUSED')) {
      errorType = 'Connection Refused';
    } else if (message.includes('authentication') || message.includes('password')) {
      errorType = 'Authentication Failed';
    } else if (errorCode) {
      errorType = `Database Error (${errorCode})`;
    }

    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm">
          <p className="font-medium text-destructive">⚠️ Database Connection Failed</p>

          {/* Error Type Badge */}
          <div className="mt-2 inline-block rounded bg-destructive/20 px-2 py-1 text-xs font-medium">
            {errorType}
          </div>

          {/* Error Message */}
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>

          {/* Additional Error Details */}
          {errorDetails && (
            <p className="mt-1 text-xs text-muted-foreground">Details: {errorDetails}</p>
          )}

          {/* Troubleshooting Steps */}
          <div className="mt-4 space-y-2 text-xs">
            <p className="font-medium">🔧 Troubleshooting Steps:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2 text-muted-foreground">
              <li>Check <code className="bg-muted px-1 rounded">DATABASE_URL</code> in Vercel → Settings → Environment Variables</li>
              <li>Verify Session pooler (port 5432): <code className="bg-muted px-1 rounded">:5432/postgres</code></li>
              <li>Test connection: <code className="bg-muted px-1 rounded">curl https://your-app.vercel.app/api/health/db</code></li>
              <li>Check Supabase Dashboard → Database → Connection pooling for active connections</li>
              <li>View Vercel Function Logs for &quot;[DB] Connection&quot; messages</li>
            </ol>
          </div>

          {/* Development Mode - Show Full Stack */}
          {process.env.NODE_ENV === 'development' && err instanceof Error && err.stack && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-medium">🐛 Stack Trace (dev only)</summary>
              <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">{err.stack}</pre>
            </details>
          )}
        </div>
      </div>
    );
  }

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
