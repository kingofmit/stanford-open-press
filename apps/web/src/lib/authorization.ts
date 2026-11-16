import { prisma } from "@stanford-press/database";

/** Check if user is a journal editor (EditorInChief, ManagingEditor, SectionEditor, GuestEditor) */
export async function isJournalEditor(userId: string, journalId: string): Promise<boolean> {
  const role = await prisma.roleAssignment.findFirst({
    where: {
      userId,
      journalId,
      role: { in: ["EditorInChief", "ManagingEditor", "SectionEditor", "GuestEditor"] },
    },
  });
  return !!role;
}

/** Check if user is a journal admin (EditorInChief or ManagingEditor only) */
export async function isJournalAdmin(userId: string, journalId: string): Promise<boolean> {
  const role = await prisma.roleAssignment.findFirst({
    where: {
      userId,
      journalId,
      role: { in: ["EditorInChief", "ManagingEditor"] },
    },
  });
  return !!role;
}

/** Check if user has any editor role in any journal (for creating new journals) */
export async function isAnyEditor(userId: string): Promise<boolean> {
  const role = await prisma.roleAssignment.findFirst({
    where: {
      userId,
      role: { in: ["EditorInChief", "ManagingEditor"] },
    },
  });
  return !!role;
}
