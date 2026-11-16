import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@stanford-press/database";
import { z } from "zod";
import { withAuth, validate, handleError } from "@/lib/api";

const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  affiliation: z.string().max(500).optional(),
  bio: z.string().max(2000).optional(),
  expertiseAreas: z.array(z.string()).optional(),
  reviewerAvailable: z.boolean().optional(),
});

// PATCH /api/users/me/update
export async function PATCH(request: NextRequest) {
  return withAuth(async (ctx) => {
    try {
      const body = await request.json();
      const data = validate(updateProfileSchema, body);

      const user = await prisma.user.update({
        where: { id: ctx.user.id },
        data,
      });

      return NextResponse.json(user);
    } catch (error) {
      return handleError(error);
    }
  });
}
