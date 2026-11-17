import { prisma } from "@stanford-press/database";
import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const entries: MetadataRoute.Sitemap = [];

  // Static pages
  entries.push({
    url: baseUrl,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 1,
  });

  // Journals
  const journals = await prisma.journal.findMany({
    select: { slug: true, updatedAt: true },
  });

  for (const journal of journals) {
    entries.push({
      url: `${baseUrl}/${journal.slug}`,
      lastModified: journal.updatedAt,
      changeFrequency: "daily",
      priority: 0.9,
    });
    entries.push({
      url: `${baseUrl}/${journal.slug}/issues`,
      lastModified: journal.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    });
    entries.push({
      url: `${baseUrl}/${journal.slug}/about`,
      lastModified: journal.updatedAt,
      changeFrequency: "monthly",
      priority: 0.5,
    });
  }

  // Published articles
  const articles = await prisma.submission.findMany({
    where: { status: "Published" },
    select: {
      id: true,
      publishedAt: true,
      journal: { select: { slug: true } },
    },
    orderBy: { publishedAt: "desc" },
    take: 10000,
  });

  for (const article of articles) {
    entries.push({
      url: `${baseUrl}/${article.journal.slug}/article/${article.id}`,
      lastModified: article.publishedAt || undefined,
      changeFrequency: "yearly",
      priority: 0.8,
    });
  }

  // Published issues
  const issues = await prisma.issue.findMany({
    where: { publishedAt: { not: null } },
    select: {
      id: true,
      publishedAt: true,
      journal: { select: { slug: true } },
    },
  });

  for (const issue of issues) {
    entries.push({
      url: `${baseUrl}/${issue.journal.slug}/issue/${issue.id}`,
      lastModified: issue.publishedAt || undefined,
      changeFrequency: "yearly",
      priority: 0.6,
    });
  }

  return entries;
}
