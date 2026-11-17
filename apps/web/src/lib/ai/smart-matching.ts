import { prisma } from "@stanford-press/database";
import { generateEmbedding } from "./llm";

/**
 * Generate and store expertise embedding for a reviewer.
 * Uses their expertise areas + recent review topics.
 */
export async function updateReviewerEmbedding(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { expertiseAreas: true, name: true },
  });

  if (!user || user.expertiseAreas.length === 0) return;

  const text = user.expertiseAreas.join(", ");

  try {
    const embedding = await generateEmbedding(text);

    await prisma.expertiseEmbedding.upsert({
      where: { userId },
      create: {
        userId,
        areas: user.expertiseAreas,
        embedding,
        keywords: user.expertiseAreas,
      },
      update: {
        areas: user.expertiseAreas,
        embedding,
        keywords: user.expertiseAreas,
      },
    });
  } catch (err) {
    console.error(`Failed to generate embedding for user ${userId}:`, err);
  }
}

/**
 * Compute cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Find reviewers using embedding similarity (when embeddings are available).
 * Falls back to keyword matching when embeddings aren't generated.
 */
export async function matchReviewersWithEmbeddings(submissionId: string, maxResults = 10): Promise<{
  userId: string;
  similarityScore: number;
  areas: string[];
}[]> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { abstract: true, keywords: true, title: true },
  });

  if (!submission) throw new Error("Submission not found");

  // Generate submission embedding
  const submissionText = [
    submission.title,
    submission.abstract || "",
    submission.keywords.join(", "),
  ].join(". ");

  let submissionEmbedding: number[];
  try {
    submissionEmbedding = await generateEmbedding(submissionText);
  } catch (err) {
    console.warn("Embedding generation unavailable, skipping embedding-based matching:", (err as Error).message);
    return [];
  }

  // Get all reviewer embeddings
  const reviewerEmbeddings = await prisma.expertiseEmbedding.findMany({
    select: { userId: true, embedding: true, areas: true },
  });

  // Calculate similarity scores
  const scored = reviewerEmbeddings
    .map((re) => ({
      userId: re.userId,
      similarityScore: cosineSimilarity(submissionEmbedding, re.embedding),
      areas: re.areas,
    }))
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, maxResults);

  return scored;
}
