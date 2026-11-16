import { NextResponse } from "next/server";
import { prisma } from "@stanford-press/database";
import { withAuth, handleError } from "@/lib/api";

// GET /api/users/me — get current user with roles
export async function GET() {
  return withAuth(async (ctx) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: ctx.user.id },
        include: {
          roles: {
            include: {
              journal: { select: { id: true, name: true, slug: true } },
            },
          },
        },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      return NextResponse.json(user);
    } catch (error) {
      return handleError(error);
    }
  });
}
