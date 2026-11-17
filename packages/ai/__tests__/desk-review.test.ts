import { describe, it, expect } from "vitest";
import { performDeskReview } from "../src/desk-review";
import { scoreAbstract } from "../src/formatting";

describe("performDeskReview", () => {
  function makeCompleteSubmission() {
    return {
      title: "A Comprehensive Study of Machine Learning Methods for Climate Modeling",
      abstract:
        "Background: Climate modeling requires advanced computational methods. " +
        "Methods: We apply deep learning architectures to predict temperature anomalies. " +
        "Results: Our approach shows a 15% improvement over baseline methods. " +
        "Conclusion: These findings suggest deep learning is effective for climate science.",
      keywords: ["machine learning", "climate modeling", "deep learning"],
      authorCount: 3,
      hasManuscript: true,
      hasCoverLetter: true,
      wordCount: 5000,
      referenceCount: 25,
    };
  }

  it("passes a complete submission", () => {
    const result = performDeskReview("sub_1", makeCompleteSubmission());
    expect(result.assessment).toBe("pass");
    expect(result.submissionId).toBe("sub_1");
    expect(result.confidence).toBeGreaterThan(50);
  });

  it("includes a summary for passing submissions", () => {
    const result = performDeskReview("sub_1", makeCompleteSubmission());
    expect(result.summary).toContain("passes automated desk review");
  });

  it("flags a submission with a short abstract (50-99 chars)", () => {
    const result = performDeskReview("sub_1", {
      ...makeCompleteSubmission(),
      abstract: "This is a relatively short abstract with methods and results mentioned here.",
    });
    // The abstract is > 50 but < 100, so it gets a "warn" on length
    const abstractCheck = result.checks.find((c) => c.name === "Abstract length");
    expect(abstractCheck?.status).toBe("warn");
  });

  it("fails a submission with very short abstract (<50 chars)", () => {
    const result = performDeskReview("sub_1", {
      ...makeCompleteSubmission(),
      abstract: "Too short.",
    });
    const abstractCheck = result.checks.find((c) => c.name === "Abstract length");
    expect(abstractCheck?.status).toBe("fail");
  });

  it("fails a submission with missing authors (authorCount=0)", () => {
    const result = performDeskReview("sub_1", {
      ...makeCompleteSubmission(),
      authorCount: 0,
    });
    const authorCheck = result.checks.find((c) => c.name === "Authors");
    expect(authorCheck?.status).toBe("fail");
  });

  it("fails a submission with missing manuscript", () => {
    const result = performDeskReview("sub_1", {
      ...makeCompleteSubmission(),
      hasManuscript: false,
    });
    const msCheck = result.checks.find((c) => c.name === "Manuscript file");
    expect(msCheck?.status).toBe("fail");
  });

  it("warns when no cover letter", () => {
    const result = performDeskReview("sub_1", {
      ...makeCompleteSubmission(),
      hasCoverLetter: false,
    });
    const clCheck = result.checks.find((c) => c.name === "Cover letter");
    expect(clCheck?.status).toBe("warn");
  });

  it("warns when fewer than 3 keywords", () => {
    const result = performDeskReview("sub_1", {
      ...makeCompleteSubmission(),
      keywords: ["one"],
    });
    const kwCheck = result.checks.find((c) => c.name === "Keywords");
    expect(kwCheck?.status).toBe("warn");
  });

  it("rejects when 2+ critical failures", () => {
    const result = performDeskReview("sub_1", {
      title: "Short",
      abstract: "Tiny",
      keywords: [],
      authorCount: 0,
      hasManuscript: false,
      hasCoverLetter: false,
    });
    expect(result.assessment).toBe("reject");
    expect(result.summary).toContain("does not meet minimum requirements");
  });

  it("flags when 1 critical failure", () => {
    const result = performDeskReview("sub_1", {
      ...makeCompleteSubmission(),
      hasManuscript: false,
    });
    // 1 fail (manuscript) => flag
    expect(result.assessment).toBe("flag");
  });

  it("flags when 3+ warnings and 0 failures", () => {
    const result = performDeskReview("sub_1", {
      ...makeCompleteSubmission(),
      keywords: ["one"],
      hasCoverLetter: false,
      wordCount: 1500, // too short
      referenceCount: 5, // too few
    });
    // No fails, but multiple warns
    const warnCount = result.checks.filter((c) => c.status === "warn").length;
    expect(warnCount).toBeGreaterThanOrEqual(3);
    expect(result.assessment).toBe("flag");
  });

  it("computes confidence as percentage of passing checks", () => {
    const result = performDeskReview("sub_1", makeCompleteSubmission());
    const passCount = result.checks.filter((c) => c.status === "pass").length;
    const expected = Math.round((passCount / result.checks.length) * 100);
    expect(result.confidence).toBe(expected);
  });

  it("includes word count check when wordCount provided", () => {
    const result = performDeskReview("sub_1", {
      ...makeCompleteSubmission(),
      wordCount: 5000,
    });
    const wcCheck = result.checks.find((c) => c.name === "Word count");
    expect(wcCheck).toBeDefined();
    expect(wcCheck!.status).toBe("pass");
  });

  it("warns for too-long word count", () => {
    const result = performDeskReview("sub_1", {
      ...makeCompleteSubmission(),
      wordCount: 15000,
    });
    const wcCheck = result.checks.find((c) => c.name === "Word count");
    expect(wcCheck!.status).toBe("warn");
  });

  it("includes reference check when referenceCount provided", () => {
    const result = performDeskReview("sub_1", {
      ...makeCompleteSubmission(),
      referenceCount: 25,
    });
    const refCheck = result.checks.find((c) => c.name === "References");
    expect(refCheck).toBeDefined();
    expect(refCheck!.status).toBe("pass");
  });

  it("omits word count and reference checks when not provided", () => {
    const result = performDeskReview("sub_1", {
      ...makeCompleteSubmission(),
      wordCount: undefined,
      referenceCount: undefined,
    });
    expect(result.checks.find((c) => c.name === "Word count")).toBeUndefined();
    expect(result.checks.find((c) => c.name === "References")).toBeUndefined();
  });
});

describe("scoreAbstract", () => {
  it("gives high overall score for a well-structured abstract", () => {
    const abstract =
      "Background: This study examines climate change impacts. " +
      "Method: We used machine learning approaches to analyze temperature data. " +
      "Results: Our findings show significant warming trends over the past decade. " +
      "Conclusion: The implications suggest urgent action is needed for climate policy.";
    const keywords = ["climate", "machine learning", "warming", "policy"];

    const score = scoreAbstract(abstract, keywords);
    expect(score.overall).toBeGreaterThan(60);
    expect(score.structure).toBe(100); // all 4 sections present
  });

  it("gives low structure score for unstructured abstract", () => {
    const abstract = "This is a simple abstract about testing without any recognized structural elements.";
    const keywords = ["testing"];

    const score = scoreAbstract(abstract, keywords);
    expect(score.structure).toBeLessThan(50);
  });

  it("penalizes readability for very long sentences", () => {
    // One very long sentence
    const abstract =
      "This study presents a comprehensive analysis of multiple interconnected systems " +
      "that span across various domains including but not limited to environmental science " +
      "computational biology and materials engineering through an innovative methodological " +
      "framework that integrates advanced machine learning algorithms with traditional " +
      "statistical approaches to provide a holistic understanding of complex phenomena " +
      "that are otherwise difficult to characterize using conventional analytical methods " +
      "and the results demonstrate significant improvements in predictive accuracy.";
    const keywords = ["machine learning"];

    const score = scoreAbstract(abstract, keywords);
    expect(score.readability).toBeLessThan(80);
  });

  it("gives suggestions for missing structural elements", () => {
    const abstract = "This paper presents some data about a topic.";
    const keywords = ["topic"];

    const score = scoreAbstract(abstract, keywords);
    expect(score.suggestions.length).toBeGreaterThan(0);
  });

  it("computes keyword coverage correctly", () => {
    const abstract = "This study uses machine learning to analyze climate data.";
    const keywords = ["machine", "climate", "quantum", "genomics"];

    const score = scoreAbstract(abstract, keywords);
    // 2 out of 4 keywords found
    expect(score.keywordCoverage).toBe(50);
  });

  it("returns 0 keyword coverage when no keywords provided", () => {
    const abstract = "This is a test abstract.";
    const score = scoreAbstract(abstract, []);
    expect(score.keywordCoverage).toBe(0);
  });

  it("computes overall as average of readability, structure, keywordCoverage", () => {
    const abstract =
      "Background: We study methods for result analysis. Conclusion: Our approach works.";
    const keywords = ["methods", "analysis"];

    const score = scoreAbstract(abstract, keywords);
    const expected = Math.round((score.readability + score.structure + score.keywordCoverage) / 3);
    expect(score.overall).toBe(expected);
  });

  it("suggests improving keyword coverage when below 50%", () => {
    const abstract = "This paper discusses artificial intelligence approaches to protein folding.";
    const keywords = ["quantum computing", "cryptography", "blockchain", "NLP"];

    const score = scoreAbstract(abstract, keywords);
    expect(score.suggestions).toContain(
      "Several keywords do not appear in the abstract — consider revising for better discoverability",
    );
  });
});
