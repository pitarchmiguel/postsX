import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { getTopPostsByImpressions } from "@/lib/analytics";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");

    let limit: number | undefined;
    if (limitParam === "all" || limitParam === null) {
      limit = undefined; // Return all posts
    } else {
      const parsed = parseInt(limitParam, 10);
      limit = isNaN(parsed) ? 10 : parsed;
    }

    const posts = await getTopPostsByImpressions(user.id, limit);

    return Response.json(posts);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
