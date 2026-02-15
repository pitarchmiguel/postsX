import { db } from "@/lib/db";
import { verifyXConnection, isXApiConfigured } from "@/lib/x-api";

/**
 * Returns the current X user profile for the composer preview.
 * If profile image is missing, fetches from X API and stores it.
 */
export async function GET() {
  try {
    const settings = await db.setting.findMany({
      where: {
        key: { in: ["X_USERNAME", "X_NAME", "X_PROFILE_IMAGE_URL"] },
      },
    });
    const map = Object.fromEntries(settings.map((s) => [s.key, s.valueJson?.trim()]));

    let username = map.X_USERNAME || null;
    let name = map.X_NAME || null;
    let profileImageUrl = map.X_PROFILE_IMAGE_URL || null;

    const xConfigured = await isXApiConfigured();
    if ((!username || !profileImageUrl) && xConfigured) {
      const verify = await verifyXConnection();
      if (verify.success) {
        if (verify.username) {
          username = verify.username;
          await db.setting.upsert({
            where: { key: "X_USERNAME" },
            create: { key: "X_USERNAME", valueJson: verify.username },
            update: { valueJson: verify.username },
          });
        }
        if (verify.name) {
          name = verify.name;
          await db.setting.upsert({
            where: { key: "X_NAME" },
            create: { key: "X_NAME", valueJson: verify.name },
            update: { valueJson: verify.name },
          });
        }
        if (verify.profileImageUrl) {
          profileImageUrl = verify.profileImageUrl;
          await db.setting.upsert({
            where: { key: "X_PROFILE_IMAGE_URL" },
            create: { key: "X_PROFILE_IMAGE_URL", valueJson: verify.profileImageUrl },
            update: { valueJson: verify.profileImageUrl },
          });
        }
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
