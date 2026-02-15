# X Post Scheduler

A minimal, dark, mobile-first dashboard to schedule and manage X (Twitter) posts. Personal tool for better consistency and content planning—no bots, no spam.

## Features

- **Dashboard**: Today's queue, next 7 days agenda, KPI cards, best time slots
- **Posts**: Drafts, Scheduled, Published tabs with table, row actions (edit, duplicate, reschedule, delete), bulk actions
- **Composer**: 280-char counter, thread mode, helpers (hooks, CTAs, tips), schedule, preview
- **Settings**: X API configuration (Client ID, Secret, Access Token, Refresh Token), posting windows, content categories, UTM template, simulation mode, export/import
- **Analytics**: Top 10 posts, best time slots chart
- **Scheduler**: Runs every minute (Vercel Cron) or on demand via "Run scheduler now"
- **Command palette**: Cmd+K for quick actions and search

## Tech Stack

- Next.js 16 (App Router), TypeScript
- shadcn/ui, Tailwind CSS
- Prisma + Supabase (PostgreSQL)
- X API v2 (optional)

## Environment Variables

```env
# Supabase (required - get from supabase.com dashboard > Connect)
DATABASE_URL="postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# X API (optional - or configure in Settings UI)
# X_CLIENT_ID=
# X_CLIENT_SECRET=
# X_ACCESS_TOKEN=
# X_REFRESH_TOKEN=

# Vercel Cron (optional - for scheduled publishing)
# CRON_SECRET=
```

## Deploy to Vercel

1. Add `DATABASE_URL` in Vercel → Settings → Environment Variables (use **Transaction** pooler, port 6543)
2. Optionally add `DIRECT_URL` (direct connection, port 5432) for migrations
3. **Run migrations** against your Supabase DB (once):
   ```bash
   DATABASE_URL="your-supabase-connection-string" npm run db:migrate
   ```
4. Redeploy

## Run Locally

1. Create a [Supabase](https://supabase.com) project
2. Get connection strings from Project Settings > Database > Connect:
   - **DIRECT_URL**: Session pooler (port 5432) - for migrations and local dev
   - **DATABASE_URL**: Transaction pooler (port 6543) for Vercel; use Session for local
3. Add both to `.env`. Default uses `localhost:5432` for build; replace with real URLs to run.

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name supabase_postgres

# (Optional) Seed sample posts
npm run db:seed

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/dashboard`.

## Vercel Cron

To enable automatic publishing on Vercel:

1. Add `vercel.json` (already included) with the cron config
2. Set `CRON_SECRET` in your Vercel project environment variables
3. Deploy. Vercel will call `/api/scheduler/run` every minute with `Authorization: Bearer ${CRON_SECRET}`

The scheduler route also accepts `GET` (for cron) and `POST` (for manual "Run scheduler now").

## Simulation Mode

When X API is not configured or simulation mode is enabled in Settings:

- **Publish now** and **scheduler** create mock tweets with fake IDs
- **Metrics** are randomly generated
- No external API calls are made

Toggle simulation mode in Settings. With it on, you can use the app fully without any X API keys.

## X API Setup

For real posting, you need **OAuth 2.0 User Context** tokens—**not** Application-Only (Bearer) tokens. Application-Only is read-only and will fail with "forbidden for this endpoint".

1. Create an app at [developer.x.com](https://developer.x.com)
2. Enable **User authentication** (OAuth 2.0 with PKCE) in your app settings
3. Add your callback URL to the app's callback URL list:
   - Local: `http://localhost:3000/api/x/callback`
   - Production: `https://your-domain.com/api/x/callback`
4. In **Settings > X API Configuration**: enter Client ID and Client Secret, then click **Save**
5. Click **Connect with X** to sign in and obtain tokens (no manual token entry needed)

Scopes: `tweet.read`, `tweet.write`, `users.read`.

## License

MIT
