import { describe, it, expect } from "vitest";
import {
  mapJournal,
  mapSubmission,
  mapAuthor,
  mapUser,
  mapIssue,
  mapReviewAssignment,
  OJS_STATUS_MAP,
  OJS_ROLE_MAP,
  OJS_RECOMMENDATION_MAP,
} from "../src/mapper";
import type {
  OJSJournal,
  OJSSubmission,
  OJSAuthor,
  OJSUser,
  OJSIssue,
  OJSReviewAssignment,
} from "../src/types";

describe("OJS_STATUS_MAP", () => {
  it("maps status 1 to submitted", () => {
    expect(OJS_STATUS_MAP[1]).toBe("submitted");
  });

  it("maps status 3 to published", () => {
    expect(OJS_STATUS_MAP[3]).toBe("published");
  });

  it("maps status 4 to rejected", () => {
    expect(OJS_STATUS_MAP[4]).toBe("rejected");
  });

  it("maps status 5 to accepted", () => {
    expect(OJS_STATUS_MAP[5]).toBe("accepted");
  });

  it("returns undefined for unknown status codes", () => {
    expect(OJS_STATUS_MAP[99]).toBeUndefined();
  });
});

describe("OJS_ROLE_MAP", () => {
  it("maps 0x00000010 to editor-in-chief", () => {
    expect(OJS_ROLE_MAP[0x00000010]).toBe("editor-in-chief");
  });

  it("maps 0x00000100 to section-editor", () => {
    expect(OJS_ROLE_MAP[0x00000100]).toBe("section-editor");
  });

  it("maps 0x00001000 to reviewer", () => {
    expect(OJS_ROLE_MAP[0x00001000]).toBe("reviewer");
  });

  it("maps 0x00010000 to author", () => {
    expect(OJS_ROLE_MAP[0x00010000]).toBe("author");
  });

  it("maps 0x00100000 to copyeditor", () => {
    expect(OJS_ROLE_MAP[0x00100000]).toBe("copyeditor");
  });
});

describe("OJS_RECOMMENDATION_MAP", () => {
  it("maps 1 to accept", () => {
    expect(OJS_RECOMMENDATION_MAP[1]).toBe("accept");
  });

  it("maps 2 to minor-revision", () => {
    expect(OJS_RECOMMENDATION_MAP[2]).toBe("minor-revision");
  });

  it("maps 3 and 4 to major-revision", () => {
    expect(OJS_RECOMMENDATION_MAP[3]).toBe("major-revision");
    expect(OJS_RECOMMENDATION_MAP[4]).toBe("major-revision");
  });

  it("maps 5 and 6 to reject", () => {
    expect(OJS_RECOMMENDATION_MAP[5]).toBe("reject");
    expect(OJS_RECOMMENDATION_MAP[6]).toBe("reject");
  });
});

describe("mapJournal", () => {
  const journal: OJSJournal = {
    journalId: 1,
    path: "open-science",
    primaryLocale: "en",
    name: "Journal of Open Science",
    description: "A leading OA journal.",
    issn: "1234-5678",
    settings: {},
  };

  it("maps name, slug, issn, and description", () => {
    const mapped = mapJournal(journal);

    expect(mapped.name).toBe("Journal of Open Science");
    expect(mapped.slug).toBe("open-science");
    expect(mapped.issn).toBe("1234-5678");
    expect(mapped.description).toBe("A leading OA journal.");
  });

  it("sets defaultReviewType to double-blind", () => {
    const mapped = mapJournal(journal);
    expect(mapped.defaultReviewType).toBe("double-blind");
  });

  it("stores the source id", () => {
    const mapped = mapJournal(journal);
    expect(mapped._sourceId).toBe(1);
  });

  it("handles missing optional fields", () => {
    const minimal: OJSJournal = {
      journalId: 2,
      path: "test",
      primaryLocale: "en",
      name: "Test",
      settings: {},
    };

    const mapped = mapJournal(minimal);
    expect(mapped.issn).toBeUndefined();
    expect(mapped.description).toBeUndefined();
  });
});

describe("mapSubmission", () => {
  const submission: OJSSubmission = {
    submissionId: 42,
    journalId: 1,
    title: "Deep Learning in Genomics",
    abstract: "We present a novel approach...",
    status: 1,
    locale: "en",
    dateSubmitted: "2024-01-15",
    authors: [
      {
        authorId: 1,
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        primaryContact: true,
        seq: 1,
      },
    ],
    keywords: ["deep learning", "genomics"],
  };

  it("maps title, abstract, and keywords", () => {
    const mapped = mapSubmission(submission);

    expect(mapped.title).toBe("Deep Learning in Genomics");
    expect(mapped.abstract).toBe("We present a novel approach...");
    expect(mapped.keywords).toEqual(["deep learning", "genomics"]);
  });

  it("maps OJS status code to string status", () => {
    expect(mapSubmission({ ...submission, status: 1 }).status).toBe("submitted");
    expect(mapSubmission({ ...submission, status: 3 }).status).toBe("published");
    expect(mapSubmission({ ...submission, status: 4 }).status).toBe("rejected");
    expect(mapSubmission({ ...submission, status: 5 }).status).toBe("accepted");
  });

  it("defaults to submitted for unknown status", () => {
    expect(mapSubmission({ ...submission, status: 99 }).status).toBe("submitted");
  });

  it("maps authors using mapAuthor", () => {
    const mapped = mapSubmission(submission);
    expect(mapped.authors).toHaveLength(1);
    expect(mapped.authors[0].name).toBe("Jane Doe");
  });

  it("handles missing abstract and keywords", () => {
    const minimal: OJSSubmission = {
      submissionId: 10,
      journalId: 1,
      title: "Title",
      status: 1,
      locale: "en",
      authors: [],
    };

    const mapped = mapSubmission(minimal);
    expect(mapped.abstract).toBe("");
    expect(mapped.keywords).toEqual([]);
  });
});

describe("mapAuthor", () => {
  const author: OJSAuthor = {
    authorId: 1,
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
    affiliation: "Stanford University",
    orcid: "0000-0001-2345-6789",
    primaryContact: true,
    seq: 1,
  };

  it("combines first and last name", () => {
    expect(mapAuthor(author).name).toBe("Jane Doe");
  });

  it("maps email, affiliation, orcid, corresponding, and order", () => {
    const mapped = mapAuthor(author);
    expect(mapped.email).toBe("jane@example.com");
    expect(mapped.affiliation).toBe("Stanford University");
    expect(mapped.orcid).toBe("0000-0001-2345-6789");
    expect(mapped.corresponding).toBe(true);
    expect(mapped.order).toBe(1);
  });

  it("stores the source id", () => {
    expect(mapAuthor(author)._sourceId).toBe(1);
  });

  it("handles missing optional fields", () => {
    const minimal: OJSAuthor = {
      authorId: 2,
      firstName: "John",
      lastName: "Smith",
      email: "john@example.com",
      primaryContact: false,
      seq: 2,
    };

    const mapped = mapAuthor(minimal);
    expect(mapped.affiliation).toBeUndefined();
    expect(mapped.orcid).toBeUndefined();
  });
});

describe("mapUser", () => {
  it("combines first and last name", () => {
    const user: OJSUser = {
      userId: 1,
      username: "jdoe",
      email: "jane@example.com",
      firstName: "Jane",
      lastName: "Doe",
      roles: [0x00010000],
    };

    expect(mapUser(user).name).toBe("Jane Doe");
  });

  it("maps role bitmasks to role strings", () => {
    const user: OJSUser = {
      userId: 1,
      username: "jdoe",
      email: "jane@example.com",
      firstName: "Jane",
      lastName: "Doe",
      roles: [0x00000010, 0x00001000],
    };

    const mapped = mapUser(user);
    expect(mapped.roles).toContain("editor-in-chief");
    expect(mapped.roles).toContain("reviewer");
  });

  it("filters out unknown roles", () => {
    const user: OJSUser = {
      userId: 1,
      username: "jdoe",
      email: "jane@example.com",
      firstName: "Jane",
      lastName: "Doe",
      roles: [0x00010000, 0xFFFFFFFF],
    };

    const mapped = mapUser(user);
    expect(mapped.roles).toEqual(["author"]);
  });

  it("handles user with no roles", () => {
    const user: OJSUser = {
      userId: 1,
      username: "jdoe",
      email: "jane@example.com",
      firstName: "Jane",
      lastName: "Doe",
      roles: [],
    };

    expect(mapUser(user).roles).toEqual([]);
  });
});

describe("mapIssue", () => {
  const issue: OJSIssue = {
    issueId: 1,
    journalId: 1,
    volume: 5,
    number: 2,
    year: 2024,
    title: "Special Issue on AI",
    published: true,
    datePublished: "2024-06-01",
  };

  it("maps volume, number, year, title, and publishedAt", () => {
    const mapped = mapIssue(issue);

    expect(mapped.volume).toBe(5);
    expect(mapped.number).toBe(2);
    expect(mapped.year).toBe(2024);
    expect(mapped.title).toBe("Special Issue on AI");
    expect(mapped.publishedAt).toBe("2024-06-01");
  });

  it("stores the source id", () => {
    expect(mapIssue(issue)._sourceId).toBe(1);
  });

  it("handles missing optional fields", () => {
    const minimal: OJSIssue = {
      issueId: 2,
      journalId: 1,
      volume: 1,
      number: 1,
      year: 2023,
      published: false,
    };

    const mapped = mapIssue(minimal);
    expect(mapped.title).toBeUndefined();
    expect(mapped.publishedAt).toBeUndefined();
  });
});

describe("mapReviewAssignment", () => {
  it("maps a completed review with recommendation", () => {
    const review: OJSReviewAssignment = {
      reviewId: 1,
      submissionId: 42,
      reviewerId: 10,
      recommendation: 1,
      dateCompleted: "2024-03-15",
      comments: "Excellent work.",
    };

    const mapped = mapReviewAssignment(review);

    expect(mapped.decision).toBe("accept");
    expect(mapped.completedAt).toBe("2024-03-15");
    expect(mapped.comments).toBe("Excellent work.");
    expect(mapped._sourceId).toBe(1);
    expect(mapped._submissionSourceId).toBe(42);
    expect(mapped._reviewerSourceId).toBe(10);
  });

  it("maps recommendation codes correctly", () => {
    const base: OJSReviewAssignment = {
      reviewId: 1,
      submissionId: 1,
      reviewerId: 1,
    };

    expect(mapReviewAssignment({ ...base, recommendation: 1 }).decision).toBe("accept");
    expect(mapReviewAssignment({ ...base, recommendation: 2 }).decision).toBe("minor-revision");
    expect(mapReviewAssignment({ ...base, recommendation: 3 }).decision).toBe("major-revision");
    expect(mapReviewAssignment({ ...base, recommendation: 5 }).decision).toBe("reject");
  });

  it("defaults to major-revision for unknown recommendation", () => {
    const review: OJSReviewAssignment = {
      reviewId: 1,
      submissionId: 1,
      reviewerId: 1,
      recommendation: 99,
    };

    expect(mapReviewAssignment(review).decision).toBe("major-revision");
  });

  it("sets decision to undefined when no recommendation", () => {
    const review: OJSReviewAssignment = {
      reviewId: 1,
      submissionId: 1,
      reviewerId: 1,
    };

    expect(mapReviewAssignment(review).decision).toBeUndefined();
  });

  it("handles missing optional fields", () => {
    const review: OJSReviewAssignment = {
      reviewId: 1,
      submissionId: 1,
      reviewerId: 1,
    };

    const mapped = mapReviewAssignment(review);
    expect(mapped.completedAt).toBeUndefined();
    expect(mapped.comments).toBeUndefined();
  });
});
