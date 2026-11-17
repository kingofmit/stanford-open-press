import { NextResponse } from "next/server";
import { prisma } from "@stanford-press/database";

export const dynamic = "force-dynamic";

// GET /api/health — health check for monitoring
export async function GET() {
  const health: Record<string, unknown> = {
    status: "ok",
    version: process.env.npm_package_version || "0.1.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };

  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.database = "connected";
  } catch (err) {
    health.status = "degraded";
    health.database = "disconnected";
    health.databaseError = (err as Error).message;
  }

  // Check storage
  health.storage = process.env.S3_BUCKET ? "s3" : "local";

  // Check AI availability
  health.ai = {
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
  };

  // Check email
  health.email = !!process.env.RESEND_API_KEY ? "resend" : "console";

  const statusCode = health.status === "ok" ? 200 : 503;

  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
