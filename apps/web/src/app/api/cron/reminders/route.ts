import { NextRequest, NextResponse } from "next/server";
import { processReviewReminders } from "@/lib/reminders";

// POST /api/cron/reminders — process review deadline reminders
// Protected by a secret token (set CRON_SECRET in env)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // In development, allow without auth
    if (process.env.NODE_ENV !== "development") {
      if (!cronSecret) {
        return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
      }
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const result = await processReviewReminders();

    return NextResponse.json({
      success: true,
      ...result,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Reminder processing failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET handler for easy testing in development
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Use POST in production" }, { status: 405 });
  }
  return POST(request);
}
