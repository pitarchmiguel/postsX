import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !(await isAdmin())) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const targetTime = new Date();
    targetTime.setHours(13, 29, 0, 0);

    // Buscar posts programados para hoy alrededor de las 13:29
    const posts = await db.post.findMany({
      where: {
        scheduledAt: {
          gte: new Date(targetTime.getTime() - 60 * 60 * 1000), // 1 hora antes
          lte: new Date(targetTime.getTime() + 60 * 60 * 1000), // 1 hora después
        },
      },
      orderBy: { scheduledAt: "asc" },
      include: {
        user: {
          select: { email: true, xUsername: true },
        },
      },
    });

    // Buscar posts que cambiaron recientemente de status
    const recentlyUpdated = await db.post.findMany({
      where: {
        updatedAt: {
          gte: new Date(Date.now() - 2 * 60 * 60 * 1000), // Últimas 2 horas
        },
        OR: [
          { status: "PUBLISHED" },
          { status: "FAILED" },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    return Response.json({
      postsAround1329: posts.map((p) => ({
        id: p.id,
        status: p.status,
        scheduledAt: p.scheduledAt,
        publishedAt: p.publishedAt,
        user: p.user?.email,
        xUsername: p.user?.xUsername,
        text: p.text.substring(0, 100),
        xTweetId: p.xTweetId,
        communityId: p.communityId,
      })),
      recentlyUpdated: recentlyUpdated.map((p) => ({
        id: p.id,
        status: p.status,
        scheduledAt: p.scheduledAt,
        updatedAt: p.updatedAt,
        publishedAt: p.publishedAt,
        user: p.user?.email,
        text: p.text.substring(0, 80),
      })),
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    return Response.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
