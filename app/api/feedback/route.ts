import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";

const FEEDBACK_TYPES = ["bug", "feature", "suggestion", "other"] as const;

const createFeedbackSchema = z.object({
  text: z.string().min(1, "Feedback cannot be empty").max(5000),
  type: z.enum(FEEDBACK_TYPES).default("suggestion"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createFeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const feedback = await db.feedback.create({
      data: {
        userId: user.id,
        text: parsed.data.text,
        type: parsed.data.type,
      },
    });

    return Response.json({ id: feedback.id, success: true });
  } catch (error) {
    console.error("Feedback POST error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await isAdmin();
    if (!admin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const feedback = await db.feedback.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { email: true, xUsername: true, xName: true },
        },
      },
    });

    return Response.json(feedback);
  } catch (error) {
    console.error("Feedback GET error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
