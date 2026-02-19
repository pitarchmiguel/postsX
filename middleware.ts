import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, favicon.png, icon.png (favicon/icon files)
     * - images (svg, png, jpg, jpeg, gif, webp)
     * - api/scheduler/* (scheduler endpoints - no auth required)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|favicon\\.png|icon\\.png|api/scheduler/run|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
