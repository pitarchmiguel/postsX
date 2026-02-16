import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: currentUser.id },
      select: {
        email: true,
        xUsername: true,
        xName: true,
        xProfileImageUrl: true,
        xAccessToken: true,
        timezone: true,
      },
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const profileImageUrl = user.xProfileImageUrl?.replace(/^http:\/\//, "https://") || null;

    return Response.json({
      email: user.email,
      xUsername: user.xUsername,
      xName: user.xName,
      xProfileImageUrl: profileImageUrl,
      xConnected: !!user.xAccessToken,
      timezone: user.timezone,
    });
  } catch (error) {
    console.error("GET /api/user/me error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
