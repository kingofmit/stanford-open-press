import { NextRequest, NextResponse } from "next/server";
import { prisma, type FileCategory } from "@stanford-press/database";
import { withAuth, apiError, handleError } from "@/lib/api";
import { getStorage, storageKey } from "@/lib/storage";

type Params = { params: Promise<{ submissionId: string }> };

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/x-tex",
  "application/x-latex",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/svg+xml",
  "application/zip",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// GET /api/submissions/[submissionId]/files
export async function GET(_request: NextRequest, { params }: Params) {
  return withAuth(async () => {
    try {
      const { submissionId } = await params;
      const files = await prisma.fileAttachment.findMany({
        where: { submissionId },
        orderBy: { uploadedAt: "desc" },
      });
      return NextResponse.json(files);
    } catch (error) {
      return handleError(error);
    }
  });
}

// POST /api/submissions/[submissionId]/files — upload file
export async function POST(request: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    try {
      const { submissionId } = await params;

      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        select: { submitterId: true, status: true, journalId: true, currentVersion: true },
      });

      if (!submission) return apiError("Submission not found", 404);
      if (submission.submitterId !== ctx.user.id) return apiError("Access denied", 403);
      if (submission.status !== "Draft" && submission.status !== "RevisionRequested") {
        return apiError("Can only upload files to drafts or revisions", 400);
      }

      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const category = (formData.get("category") as string) || "Manuscript";
      const label = formData.get("label") as string | null;

      if (!file) return apiError("No file provided");
      if (file.size > MAX_FILE_SIZE) return apiError("File too large (max 50MB)");
      if (!ALLOWED_TYPES.includes(file.type) && file.type !== "") {
        return apiError(`File type not allowed: ${file.type}`);
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const storage = getStorage();
      const key = storageKey(
        submission.journalId,
        submissionId,
        submission.currentVersion,
        file.name
      );

      await storage.upload(key, buffer, file.type || "application/octet-stream");

      const attachment = await prisma.fileAttachment.create({
        data: {
          submissionId,
          filename: file.name,
          storagePath: key,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          category: category as FileCategory,
          version: submission.currentVersion,
          label,
          uploadedById: ctx.user.id,
        },
      });

      return NextResponse.json(attachment, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  });
}

// DELETE /api/submissions/[submissionId]/files?fileId=xxx
export async function DELETE(request: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    try {
      const { submissionId } = await params;
      const fileId = new URL(request.url).searchParams.get("fileId");
      if (!fileId) return apiError("fileId is required");

      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        select: { submitterId: true, status: true },
      });

      if (!submission) return apiError("Submission not found", 404);
      if (submission.submitterId !== ctx.user.id) return apiError("Access denied", 403);

      const file = await prisma.fileAttachment.findUnique({ where: { id: fileId } });
      if (!file || file.submissionId !== submissionId) return apiError("File not found", 404);

      // Delete from storage
      const storage = getStorage();
      await storage.delete(file.storagePath);

      await prisma.fileAttachment.delete({ where: { id: fileId } });
      return NextResponse.json({ success: true });
    } catch (error) {
      return handleError(error);
    }
  });
}
