import { NextRequest } from "next/server";
import { verifyXConnection, postTweet } from "@/lib/x-api";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Test connection
    const verification = await verifyXConnection(currentUser.id);

    // Try to post a test tweet if connection is OK
    let testPostResult = null;
    if (verification.success) {
      try {
        testPostResult = await postTweet(currentUser.id, "Test tweet from scheduler - ignore", {
          forceSimulation: false
        });
      } catch (postErr) {
        testPostResult = {
          error: postErr instanceof Error ? postErr.message : String(postErr)
        };
      }
    }

    return Response.json({
      verification,
      testPost: testPostResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[X Test] Error:", error);
    return Response.json(
      {
        error: "Test failed",
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
