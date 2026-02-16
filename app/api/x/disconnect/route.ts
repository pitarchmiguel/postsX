import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Clear X tokens and connection info
    await db.user.update({
      where: { id: currentUser.id },
      data: {
        xAccessToken: null,
        xRefreshToken: null,
        xTokenExpiresAt: null,
        xClientId: null,
        xUsername: null,
        xName: null,
        xProfileImageUrl: null,
      },
    });

    console.log(`[X OAuth] User ${currentUser.email} disconnected from X`);

    return Response.json({ success: true, message: "Disconnected from X" });
  } catch (error) {
    console.error("[X OAuth] Disconnect error:", error);
    return Response.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }
}
