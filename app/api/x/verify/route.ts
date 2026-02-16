import { verifyXConnection } from "@/lib/x-api";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function POST() {
  try {
    const user = await requireUser();
    const result = await verifyXConnection(user.id);

    if (result.success) {
      await db.user.update({
        where: { id: user.id },
        data: {
          xUsername: result.username || null,
          xName: result.name || null,
          xProfileImageUrl: result.profileImageUrl || null,
        },
      });
    }

    return Response.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error(error);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
