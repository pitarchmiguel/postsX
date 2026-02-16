/**
 * Authentication helpers for getting the current user
 */

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/lib/db";

export interface CurrentUser {
  id: string;
  email: string;
  supabaseUserId: string;
  xAccessToken?: string | null;
  xUsername?: string | null;
  xName?: string | null;
}

/**
 * Get the current authenticated user from Supabase session
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server component - can't set cookies
          }
        },
      },
    }
  );

  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  if (!supabaseUser || !supabaseUser.email) {
    return null;
  }

  // Get or create user in our database
  let user = await db.user.findUnique({
    where: { supabaseUserId: supabaseUser.id },
  });

  if (!user) {
    // Check if user exists by email (handles account recreation)
    user = await db.user.findUnique({
      where: { email: supabaseUser.email },
    });

    if (user) {
      // User exists by email but has different supabaseUserId
      // Update the supabaseUserId to match current Supabase auth
      user = await db.user.update({
        where: { id: user.id },
        data: { supabaseUserId: supabaseUser.id },
      });
    } else {
      // User doesn't exist at all - create new user (first time login)
      user = await db.user.create({
        data: {
          email: supabaseUser.email,
          supabaseUserId: supabaseUser.id,
        },
      });
    }
  }

  return {
    id: user.id,
    email: user.email,
    supabaseUserId: user.supabaseUserId,
    xAccessToken: user.xAccessToken,
    xUsername: user.xUsername,
    xName: user.xName,
  };
}

/**
 * Get the current user or throw 401 error if not authenticated
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

/**
 * Check if current user has X connected
 */
export async function hasXConnected(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user?.xAccessToken;
}

/**
 * Check if current user is admin (email in ADMIN_EMAILS env var, comma-separated)
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ?? [];
  return adminEmails.includes(user.email.toLowerCase());
}
