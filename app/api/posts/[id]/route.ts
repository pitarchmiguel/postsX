import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { POST_STATUSES } from "@/lib/types";
import { requireUser } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const post = await db.post.findFirst({
      where: {
        id,
        userId: user.id, // Verify ownership
      },
      include: {
        metrics: { orderBy: { capturedAt: "desc" }, take: 1 },
      },
    });

    if (!post) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    return Response.json(post);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const updatePostSchema = z.object({
  text: z.string().min(1).max(10000).optional(),
  threadJson: z.string().optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
  tags: z.string().optional(),
  status: z.enum(POST_STATUSES).optional(),
  communityId: z.string().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    // Verify ownership
    const existing = await db.post.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    const body = await request.json();
    const data = updatePostSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (data.text !== undefined) updateData.text = data.text;
    if (data.threadJson !== undefined) updateData.threadJson = data.threadJson;
    if (data.scheduledAt !== undefined)
      updateData.scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.communityId !== undefined) updateData.communityId = data.communityId;

    const post = await db.post.update({
      where: { id },
      data: updateData,
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
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }
    console.error(error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    // Verify ownership before deleting
    const existing = await db.post.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    await db.post.delete({
      where: { id },
    });

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }
    console.error(error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
