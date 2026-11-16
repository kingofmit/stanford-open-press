import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@stanford-press/database";
import { getStorage } from "@/lib/storage";
import { LocalStorageAdapter } from "@/lib/storage/local";
import { readFile } from "fs/promises";
import { extname } from "path";

const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".tex": "application/x-tex",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".zip": "application/zip",
  ".xml": "application/xml",
  ".json": "application/json",
  ".csv": "text/csv",
  ".txt": "text/plain",
};

function getMimeType(filepath: string): string {
  return MIME_TYPES[extname(filepath).toLowerCase()] || "application/octet-stream";
}

// Validate storage key format: journalId/submissionId/vN/filename
function parseStorageKey(key: string): { journalId: string; submissionId: string } | null {
  const parts = key.split("/");
  if (parts.length < 4) return null;
  // Reject any path traversal attempts
  if (parts.some((p) => p === ".." || p === "." || p === "")) return null;
  return { journalId: parts[0], submissionId: parts[1] };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path } = await params;

  // Reject path traversal
  if (path.some((segment) => segment === ".." || segment === "." || segment.includes("\0"))) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const key = path.join("/");
  const parsed = parseStorageKey(key);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
  }

  // Verify user has access to this submission
  const submission = await prisma.submission.findUnique({
    where: { id: parsed.submissionId },
    select: {
      submitterId: true,
      journalId: true,
      reviews: { select: { reviewerId: true } },
    },
  });

  if (!submission || submission.journalId !== parsed.journalId) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const userId = session.user.id;
  const isSubmitter = submission.submitterId === userId;
  const isReviewer = submission.reviews.some((r) => r.reviewerId === userId);
  const isEditor = await prisma.roleAssignment.findFirst({
    where: {
      userId,
      journalId: submission.journalId,
      role: { in: ["EditorInChief", "ManagingEditor", "SectionEditor", "GuestEditor", "Copyeditor", "ProductionEditor"] },
    },
  });

  if (!isSubmitter && !isReviewer && !isEditor) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const storage = getStorage();

  // For S3, redirect to presigned URL
  if (!(storage instanceof LocalStorageAdapter)) {
    const url = await storage.getUrl(key);
    return NextResponse.redirect(url);
  }

  // For local storage, serve file
  try {
    const filePath = storage.getFilePath(key);
    const data = await readFile(filePath);
    const contentType = getMimeType(filePath);

    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${path[path.length - 1]}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
