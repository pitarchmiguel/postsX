import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { POST_STATUSES } from "@/lib/types";
import { requireUser } from "@/lib/auth";

const createPostSchema = z.object({
  text: z.string().min(1).max(10000),
  threadJson: z.string().optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
  tags: z.string().optional().default(""),
  status: z.enum(POST_STATUSES).optional().default("DRAFT"),
  communityId: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const q = searchParams.get("q");
    const tags = searchParams.get("tags");

    const where: Record<string, unknown> = {
      userId: user.id, // Filter by current user
    };

    if (status && POST_STATUSES.includes(status as (typeof POST_STATUSES)[number])) {
      where.status = status;
    }

    if (q) {
      where.OR = [
        { text: { contains: q } },
        { tags: { contains: q } },
      ];
    }

    if (tags) {
      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
      if (tagList.length > 0) {
        where.tags = { contains: tagList[0] };
        for (let i = 1; i < tagList.length; i++) {
          where.AND = where.AND || [];
          (where.AND as object[]).push({ tags: { contains: tagList[i] } });
        }
      }
    }

    const posts = await db.post.findMany({
      where,
      orderBy: [{ scheduledAt: "asc" }, { updatedAt: "desc" }],
      include: {
        metrics: {
          orderBy: { capturedAt: "desc" },
          take: 1,
        },
      },
    });

    return Response.json(posts);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();

    const body = await request.json();
    const data = createPostSchema.parse(body);

    const post = await db.post.create({
      data: {
        userId: user.id, // Add userId
        text: data.text,
        threadJson: data.threadJson ?? null,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        tags: data.tags ?? "",
        status: data.status,
        communityId: data.communityId ?? null,
      },
    });

    return Response.json(post);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error(error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
