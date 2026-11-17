import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@stanford-press/database";
import { withAuth, handleError } from "@/lib/api";

// GET /api/notifications?unreadOnly=true&limit=20
export async function GET(request: NextRequest) {
  return withAuth(async (ctx) => {
    try {
      const { searchParams } = new URL(request.url);
      const unreadOnly = searchParams.get("unreadOnly") === "true";
      const limit = Math.min(50, parseInt(searchParams.get("limit") || "20") || 20);

      const where: Record<string, unknown> = { userId: ctx.user.id };
      if (unreadOnly) where.read = false;

      const [notifications, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
        }),
        prisma.notification.count({
          where: { userId: ctx.user.id, read: false },
        }),
      ]);

      return NextResponse.json({ notifications, unreadCount });
    } catch (error) {
      return handleError(error);
    }
  });
}

// PATCH /api/notifications — mark as read
export async function PATCH(request: NextRequest) {
  return withAuth(async (ctx) => {
    try {
      const body = await request.json();
      const { notificationIds, markAllRead } = body;

      if (markAllRead) {
        await prisma.notification.updateMany({
          where: { userId: ctx.user.id, read: false },
          data: { read: true },
        });
      } else if (notificationIds && Array.isArray(notificationIds)) {
        await prisma.notification.updateMany({
          where: {
            id: { in: notificationIds },
            userId: ctx.user.id, // Ensure user owns these notifications
          },
          data: { read: true },
        });
      }

      const unreadCount = await prisma.notification.count({
        where: { userId: ctx.user.id, read: false },
      });

      return NextResponse.json({ unreadCount });
    } catch (error) {
      return handleError(error);
    }
  });
}
