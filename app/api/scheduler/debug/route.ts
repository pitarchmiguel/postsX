import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const now = new Date();

    // Posts que deberían publicarse AHORA
    const duePosts = await db.post.findMany({
      where: {
        userId: user.id,
        status: "SCHEDULED",
        scheduledAt: { lte: now }
      },
      select: {
        id: true,
        text: true,
        scheduledAt: true,
        status: true,
        createdAt: true
      },
      orderBy: { scheduledAt: "asc" },
      take: 10
    });

    // Todos los posts SCHEDULED (futuros)
    const futurePosts = await db.post.findMany({
      where: {
        userId: user.id,
        status: "SCHEDULED",
        scheduledAt: { gt: now }
      },
      select: {
        id: true,
        text: true,
        scheduledAt: true,
        status: true
      },
      orderBy: { scheduledAt: "asc" },
      take: 10
    });

    // Posts FAILED
    const failedPosts = await db.post.findMany({
      where: {
        userId: user.id,
        status: "FAILED"
      },
      select: {
        id: true,
        text: true,
        scheduledAt: true,
        status: true,
        updatedAt: true
      },
      orderBy: { updatedAt: "desc" },
      take: 10
    });

    // Posts PUBLISHED recientes
    const recentPublished = await db.post.findMany({
      where: {
        userId: user.id,
        status: "PUBLISHED"
      },
      select: {
        id: true,
        text: true,
        publishedAt: true,
        xTweetId: true
      },
      orderBy: { publishedAt: "desc" },
      take: 5
    });

    // Verificar configuración
    const simulationMode = await db.setting.findUnique({
      where: { key: "SIMULATION_MODE" }
    });

    return Response.json({
      now: now.toISOString(),
      duePosts: {
        count: duePosts.length,
        posts: duePosts.map((p: typeof duePosts[0]) => ({
          id: p.id,
          text: p.text.substring(0, 50) + "...",
          scheduledAt: p.scheduledAt,
          status: p.status
        }))
      },
      futurePosts: {
        count: futurePosts.length,
        posts: futurePosts.map((p: typeof futurePosts[0]) => ({
          id: p.id,
          text: p.text.substring(0, 50) + "...",
          scheduledAt: p.scheduledAt,
          status: p.status
        }))
      },
      failedPosts: {
        count: failedPosts.length,
        posts: failedPosts.map((p: any) => ({
          id: p.id,
          text: p.text.substring(0, 50) + "...",
          scheduledAt: p.scheduledAt,
          status: p.status,
          updatedAt: p.updatedAt
        }))
      },
      recentPublished: {
        count: recentPublished.length,
        posts: recentPublished.map((p: any) => ({
          id: p.id,
          text: p.text.substring(0, 50) + "...",
          publishedAt: p.publishedAt,
          xTweetId: p.xTweetId
        }))
      },
      settings: {
        simulationMode: simulationMode?.valueJson ?? "not set"
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Debug] Error:", error);
    return Response.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
