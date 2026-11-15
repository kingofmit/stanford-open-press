import type { OJSJournal, OJSSubmission, OJSAuthor, OJSUser, OJSIssue, OJSReviewAssignment } from "./types";

/**
 * OJS status codes mapped to Stanford Open Press statuses.
 */
export const OJS_STATUS_MAP: Record<number, string> = {
  1: "submitted",      // STATUS_QUEUED
  3: "published",      // STATUS_PUBLISHED
  4: "rejected",       // STATUS_DECLINED
  5: "accepted",       // STATUS_SCHEDULED
};

/**
 * OJS role IDs mapped to Stanford Open Press roles.
 */
export const OJS_ROLE_MAP: Record<number, string> = {
  0x00000010: "editor-in-chief",   // ROLE_ID_MANAGER
  0x00000100: "section-editor",     // ROLE_ID_SUB_EDITOR
  0x00001000: "reviewer",           // ROLE_ID_REVIEWER
  0x00010000: "author",             // ROLE_ID_AUTHOR
  0x00100000: "copyeditor",         // ROLE_ID_ASSISTANT (copyeditor)
};

/**
 * OJS review recommendation codes.
 */
export const OJS_RECOMMENDATION_MAP: Record<number, string> = {
  1: "accept",
  2: "minor-revision",
  3: "major-revision",
  4: "major-revision",
  5: "reject",
  6: "reject",
};

/**
 * Map an OJS journal to Stanford Open Press journal config.
 */
export function mapJournal(ojs: OJSJournal) {
  return {
    name: ojs.name,
    slug: ojs.path,
    issn: ojs.issn,
    description: ojs.description,
    defaultReviewType: "double-blind" as const,
    _sourceId: ojs.journalId,
  };
}

/**
 * Map an OJS submission to Stanford Open Press submission.
 */
export function mapSubmission(ojs: OJSSubmission) {
  return {
    title: ojs.title,
    abstract: ojs.abstract ?? "",
    keywords: ojs.keywords ?? [],
    status: OJS_STATUS_MAP[ojs.status] ?? "submitted",
    authors: ojs.authors.map(mapAuthor),
    submittedAt: ojs.dateSubmitted,
    _sourceId: ojs.submissionId,
  };
}

/**
 * Map an OJS author to Stanford Open Press author.
 */
export function mapAuthor(ojs: OJSAuthor) {
  return {
    name: `${ojs.firstName} ${ojs.lastName}`,
    email: ojs.email,
    affiliation: ojs.affiliation,
    orcid: ojs.orcid,
    corresponding: ojs.primaryContact,
    order: ojs.seq,
    _sourceId: ojs.authorId,
  };
}

/**
 * Map an OJS user to Stanford Open Press user.
 */
export function mapUser(ojs: OJSUser) {
  return {
    name: `${ojs.firstName} ${ojs.lastName}`,
    email: ojs.email,
    roles: ojs.roles
      .map((r) => OJS_ROLE_MAP[r])
      .filter((r): r is string => r !== undefined),
    _sourceId: ojs.userId,
  };
}

/**
 * Map an OJS issue to Stanford Open Press issue.
 */
export function mapIssue(ojs: OJSIssue) {
  return {
    volume: ojs.volume,
    number: ojs.number,
    year: ojs.year,
    title: ojs.title,
    publishedAt: ojs.datePublished,
    _sourceId: ojs.issueId,
  };
}

/**
 * Map an OJS review assignment to Stanford Open Press review.
 */
export function mapReviewAssignment(ojs: OJSReviewAssignment) {
  return {
    decision: ojs.recommendation
      ? OJS_RECOMMENDATION_MAP[ojs.recommendation] ?? "major-revision"
      : undefined,
    completedAt: ojs.dateCompleted,
    comments: ojs.comments,
    _sourceId: ojs.reviewId,
    _submissionSourceId: ojs.submissionId,
    _reviewerSourceId: ojs.reviewerId,
  };
}
