import { NextRequest, NextResponse } from "next/server";
import { prisma, Role } from "@stanford-press/database";
import { z } from "zod";
import { withAuth, validate, handleError, apiError } from "@/lib/api";

const assignRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.nativeEnum(Role),
});

type Params = { params: Promise<{ journalId: string }> };

// GET /api/journals/[journalId]/roles — list role assignments
export async function GET(_request: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    try {
      const { journalId } = await params;

      const { isJournalAdmin } = await import("@/lib/authorization");
      if (!(await isJournalAdmin(ctx.user.id, journalId))) {
        return apiError("Only journal admins can view roles", 403);
      }

      const roles = await prisma.roleAssignment.findMany({
        where: { journalId },
        include: {
          user: { select: { id: true, name: true, email: true, orcid: true, affiliation: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(roles);
    } catch (error) {
      return handleError(error);
    }
  });
}

// POST /api/journals/[journalId]/roles — assign a role
export async function POST(request: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    try {
      const { journalId } = await params;

      const { isJournalAdmin } = await import("@/lib/authorization");
      if (!(await isJournalAdmin(ctx.user.id, journalId))) {
        return apiError("Only journal admins can manage roles", 403);
      }

      const body = await request.json();
      const data = validate(assignRoleSchema, body);

      // Verify journal exists
      const journal = await prisma.journal.findUnique({ where: { id: journalId } });
      if (!journal) return apiError("Journal not found", 404);

      // Verify user exists
      const user = await prisma.user.findUnique({ where: { id: data.userId } });
      if (!user) return apiError("User not found", 404);

      const role = await prisma.roleAssignment.upsert({
        where: {
          userId_journalId_role: {
            userId: data.userId,
            journalId,
            role: data.role,
          },
        },
        update: {},
        create: {
          userId: data.userId,
          journalId,
          role: data.role,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      return NextResponse.json(role, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  });
}

// DELETE /api/journals/[journalId]/roles — remove a role
export async function DELETE(request: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    try {
      const { journalId } = await params;

      const { isJournalAdmin } = await import("@/lib/authorization");
      if (!(await isJournalAdmin(ctx.user.id, journalId))) {
        return apiError("Only journal admins can manage roles", 403);
      }

      const { searchParams } = new URL(request.url);
      const userId = searchParams.get("userId");
      const roleValue = searchParams.get("role");

      if (!userId || !roleValue || !Object.values(Role).includes(roleValue as Role)) {
        return apiError("Valid userId and role are required");
      }

      const role = roleValue as Role;

      await prisma.roleAssignment.delete({
        where: {
          userId_journalId_role: { userId, journalId, role },
        },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      return handleError(error);
    }
  });
}
