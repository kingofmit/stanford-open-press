import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@stanford-press/database";
import { z } from "zod";
import { withAuth, validate, apiError, handleError } from "@/lib/api";
import { isJournalAdmin } from "@/lib/authorization";

type Params = { params: Promise<{ journalId: string; templateId: string }> };

const updateTemplateSchema = z.object({
  subject: z.string().min(1).max(500).optional(),
  body: z.string().min(1).max(10000).optional(),
  enabled: z.boolean().optional(),
});

// PATCH /api/journals/[journalId]/templates/[templateId]
export async function PATCH(request: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    try {
      const { journalId, templateId } = await params;
      const body = await request.json();
      const data = validate(updateTemplateSchema, body);

      if (!(await isJournalAdmin(ctx.user.id, journalId))) {
        return apiError("Only journal admins can edit templates", 403);
      }

      const template = await prisma.emailTemplate.findUnique({ where: { id: templateId } });
      if (!template || template.journalId !== journalId) {
        return apiError("Template not found", 404);
      }

      const updated = await prisma.emailTemplate.update({
        where: { id: templateId },
        data,
      });

      return NextResponse.json(updated);
    } catch (error) {
      return handleError(error);
    }
  });
}
