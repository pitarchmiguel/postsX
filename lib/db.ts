import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

let connectionString =
  process.env.DATABASE_URL ??
  process.env.DIRECT_URL ??
  "postgresql://localhost:5432/postgres";

// Supabase: optimize for serverless to avoid circuit breaker
if (
  connectionString.includes("supabase.com") ||
  connectionString.includes("supabase.co")
) {
  const sep = connectionString.includes("?") ? "&" : "?";
  const extra: string[] = [];
  // Transaction pooler (port 6543) requires pgbouncer=true; Session (5432) does not
  const isTransactionPooler =
    connectionString.includes("pooler.supabase.com") &&
    connectionString.includes(":6543/");
  if (isTransactionPooler && !connectionString.includes("pgbouncer="))
    extra.push("pgbouncer=true");
  if (!connectionString.includes("connection_limit="))
    extra.push("connection_limit=1");
  // Increase timeouts for Vercel cold starts
  if (!connectionString.includes("connect_timeout="))
    extra.push("connect_timeout=60"); // Increase from 30 to 60 seconds
  if (!connectionString.includes("pool_timeout="))
    extra.push("pool_timeout=60"); // Increase from 30 to 60 seconds
  if (extra.length) connectionString += sep + extra.join("&");

  // Log connection configuration for debugging (sanitize password)
  const sanitizedUrl = connectionString.replace(
    /:([^:@]+)@/,
    ':****@'
  );
  console.log('[DB] Initializing Prisma with Supabase connection');
  console.log('[DB] Connection URL:', sanitizedUrl);
  console.log('[DB] Parameters added:', extra.length > 0 ? extra.join(', ') : 'none');
  console.log('[DB] Environment:', process.env.NODE_ENV);
  console.log('[DB] Platform:', process.env.VERCEL ? 'Vercel' : 'Local');
}

const prismaClientSingleton = () => {
  try {
    console.log('[DB] Initializing Prisma adapter...');
    const adapter = new PrismaPg({
      connectionString,
      // Configure pg pool for serverless (single connection, aggressive timeouts)
      pool: {
        max: 1, // Match connection_limit=1 in URL params
        min: 0, // Don't maintain idle connections
        idleTimeoutMillis: 1000, // Close idle connections after 1 second
        connectionTimeoutMillis: 30000, // 30 seconds to establish connection
        allowExitOnIdle: true, // Allow process to exit when no active connections
      }
    });
    console.log('[DB] ✅ Adapter initialized successfully');
    return new PrismaClient({ adapter });
  } catch (error) {
    console.error('[DB] ⚠️ Adapter initialization failed, falling back to default Prisma client:', error);
    // Fallback to default PrismaClient without adapter (uses DATABASE_URL env var)
    return new PrismaClient();
  }
};

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Initialize db - always ensure it's defined
let db: PrismaClient;

if (process.env.NODE_ENV !== "production") {
  if (!globalThis.prisma) {
    globalThis.prisma = prismaClientSingleton();
  }
  db = globalThis.prisma;
} else {
  db = prismaClientSingleton();
}

// Ensure db is always exported and never undefined
if (!db) {
  console.error('[DB] ❌ CRITICAL: Prisma client is undefined!');
  throw new Error('Failed to initialize Prisma client');
}

export { db };

// Test connection on first initialization (only in dev or first time in production)
if (process.env.VERCEL && !globalThis.prisma) {
  db.$connect()
    .then(() => console.log('[DB] ✅ Connection successful'))
    .catch((err: Error) => console.error('[DB] ❌ Connection failed:', err.message));
}
