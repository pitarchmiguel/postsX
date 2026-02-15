import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 10; // 10 seconds max

export async function GET() {
  const startTime = Date.now();

  try {
    // Test 1: Simple query
    console.log('[Health] Testing database connection...');
    await db.$queryRaw`SELECT 1 as health`;
    const queryTime = Date.now() - startTime;

    // Test 2: Count posts (verify migrations ran)
    const postCount = await db.post.count();
    const totalTime = Date.now() - startTime;

    console.log('[Health] ✅ Database healthy');

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      checks: {
        connection: 'ok',
        migrations: 'ok',
        postCount,
      },
      performance: {
        queryTime: `${queryTime}ms`,
        totalTime: `${totalTime}ms`,
      },
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      platform: process.env.VERCEL ? 'Vercel' : 'Local',
    });
  } catch (error) {
    const errorTime = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    const errorCode = (error as any)?.code;
    const errorName = error?.constructor?.name;

    console.error('[Health] ❌ Database unhealthy:', message);

    // Determine error category
    let category = 'unknown';
    if (message.includes('timeout')) category = 'timeout';
    else if (message.includes('Circuit breaker')) category = 'circuit_breaker';
    else if (message.includes('ECONNREFUSED')) category = 'connection_refused';
    else if (message.includes('authentication')) category = 'auth_failed';

    return NextResponse.json({
      status: 'unhealthy',
      database: 'disconnected',
      error: {
        message,
        code: errorCode,
        type: errorName,
        category,
      },
      performance: {
        failedAfter: `${errorTime}ms`,
      },
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      platform: process.env.VERCEL ? 'Vercel' : 'Local',
    }, { status: 503 });
  }
}
