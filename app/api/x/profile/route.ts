import { db } from "@/lib/db";
import { verifyXConnection, isXApiConfigured } from "@/lib/x-api";
import { getCurrentUser } from "@/lib/auth";

/**
 * Returns the current X user profile for the composer preview.
 * If profile image is missing, fetches from X API and stores it.
 */
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return Response.json(
        { username: null, name: null, profileImageUrl: null },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { id: currentUser.id },
      select: {
        xUsername: true,
        xName: true,
        xProfileImageUrl: true,
        xAccessToken: true,
      },
    });

    if (!user) {
      return Response.json(
        { username: null, name: null, profileImageUrl: null },
        { status: 404 }
      );
    }

    let username = user.xUsername;
    let name = user.xName;
    let profileImageUrl = user.xProfileImageUrl;

    // If profile is incomplete and X is configured, fetch from API
    const xConfigured = await isXApiConfigured(currentUser.id);
    if ((!username || !profileImageUrl) && xConfigured) {
      const verify = await verifyXConnection(currentUser.id);
      if (verify.success) {
        // Update user profile with fresh data
        await db.user.update({
          where: { id: currentUser.id },
          data: {
            xUsername: verify.username || null,
            xName: verify.name || null,
            xProfileImageUrl: verify.profileImageUrl || null,
          },
        });

        username = verify.username || username;
        name = verify.name || name;
        profileImageUrl = verify.profileImageUrl || profileImageUrl;
      }
    }

    return Response.json({
      username,
      name,
      profileImageUrl: profileImageUrl?.replace(/^http:\/\//, "https://") || null,
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { username: null, name: null, profileImageUrl: null },
      { status: 500 }
    );
  }
}
