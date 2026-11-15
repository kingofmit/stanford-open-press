import type { ID } from "@stanford-press/core";
import type { Volume, Issue } from "./types";

let counter = 0;

function generateId(): ID {
  return `pub_${Date.now()}_${++counter}`;
}

/**
 * Create a new volume.
 */
export function createVolume(journalId: ID, number: number, year: number, title?: string): Volume {
  return {
    id: generateId(),
    journalId,
    number,
    year,
    title,
  };
}

/**
 * Create a new issue within a volume.
 */
export function createIssue(
  journalId: ID,
  volumeId: ID,
  number: number,
  options?: { title?: string; description?: string; coverImageUrl?: string },
): Issue {
  return {
    id: generateId(),
    journalId,
    volumeId,
    number,
    title: options?.title,
    description: options?.description,
    coverImageUrl: options?.coverImageUrl,
    articleIds: [],
  };
}

/**
 * Add an article to an issue.
 */
export function addArticleToIssue(issue: Issue, articleId: ID): Issue {
  if (issue.articleIds.includes(articleId)) {
    throw new Error(`Article "${articleId}" is already in this issue`);
  }
  return {
    ...issue,
    articleIds: [...issue.articleIds, articleId],
  };
}

/**
 * Publish an issue, making it publicly available.
 */
export function publishIssue(issue: Issue): Issue {
  if (issue.articleIds.length === 0) {
    throw new Error("Cannot publish an empty issue");
  }
  return {
    ...issue,
    publishedAt: new Date().toISOString(),
  };
}

/**
 * Remove an article from an issue.
 */
export function removeArticleFromIssue(issue: Issue, articleId: ID): Issue {
  return {
    ...issue,
    articleIds: issue.articleIds.filter((id) => id !== articleId),
  };
}
