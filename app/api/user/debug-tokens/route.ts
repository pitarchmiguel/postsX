import { getCurrentUser, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !(await isAdmin())) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: currentUser.id },
      select: {
        id: true,
        email: true,
        xAccessToken: true,
        xRefreshToken: true,
        xClientId: true,
        xUsername: true,
        xTokenExpiresAt: true,
      },
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({
      email: user.email,
      xUsername: user.xUsername,
      hasAccessToken: !!user.xAccessToken,
      accessTokenLength: user.xAccessToken?.length,
      accessTokenPrefix: user.xAccessToken?.substring(0, 20),
      hasRefreshToken: !!user.xRefreshToken,
      refreshTokenLength: user.xRefreshToken?.length,
      hasClientId: !!user.xClientId,
      clientId: user.xClientId?.substring(0, 15),
      tokenExpiresAt: user.xTokenExpiresAt,
      tokenExpired: user.xTokenExpiresAt ? new Date(user.xTokenExpiresAt) < new Date() : null,
    });
  } catch (error) {
    console.error("Debug tokens error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
