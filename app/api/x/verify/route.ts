import { verifyXConnection } from "@/lib/x-api";
import { db } from "@/lib/db";

export async function POST() {
  try {
    const result = await verifyXConnection();

    if (result.success && result.username) {
      await db.setting.upsert({
        where: { key: "X_USERNAME" },
        create: { key: "X_USERNAME", valueJson: result.username },
        update: { valueJson: result.username },
      });
    }
    if (result.success && result.name) {
      await db.setting.upsert({
        where: { key: "X_NAME" },
        create: { key: "X_NAME", valueJson: result.name },
        update: { valueJson: result.name },
      });
    }
    if (result.success && result.profileImageUrl) {
      await db.setting.upsert({
        where: { key: "X_PROFILE_IMAGE_URL" },
        create: { key: "X_PROFILE_IMAGE_URL", valueJson: result.profileImageUrl },
        update: { valueJson: result.profileImageUrl },
      });
    }

    return Response.json(result);
  } catch (error) {
    console.error(error);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
