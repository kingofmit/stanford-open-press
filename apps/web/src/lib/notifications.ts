import { prisma } from "@stanford-press/database";

interface CreateNotificationOptions {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  journalId?: string;
  submissionId?: string;
}

/**
 * Create a notification for a user. Fire-and-forget — errors are logged but don't throw.
 */
export async function notify(options: CreateNotificationOptions): Promise<void> {
  try {
    await prisma.notification.create({ data: options });
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
}

/**
 * Notify multiple users at once.
 */
export async function notifyMany(
  userIds: string[],
  options: Omit<CreateNotificationOptions, "userId">
): Promise<void> {
  try {
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({ userId, ...options })),
    });
  } catch (err) {
    console.error("Failed to create notifications:", err);
  }
}

/**
 * Notify all editors of a journal.
 */
export async function notifyEditors(
  journalId: string,
  options: Omit<CreateNotificationOptions, "userId" | "journalId">
): Promise<void> {
  const editors = await prisma.roleAssignment.findMany({
    where: {
      journalId,
      role: { in: ["EditorInChief", "ManagingEditor", "SectionEditor"] },
    },
    select: { userId: true },
  });

  const userIds = [...new Set(editors.map((e) => e.userId))];
  if (userIds.length === 0) return;

  await notifyMany(userIds, { ...options, journalId });
}
