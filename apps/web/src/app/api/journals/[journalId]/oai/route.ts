import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@stanford-press/database";

type Params = { params: Promise<{ journalId: string }> };

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function dcDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// GET /api/journals/[journalId]/oai?verb=Identify|ListRecords|GetRecord|ListSets
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { journalId } = await params;
    const { searchParams } = new URL(request.url);
    const verb = searchParams.get("verb");
    const identifier = searchParams.get("identifier");

    const journal = await prisma.journal.findUnique({ where: { id: journalId } });
    if (!journal) {
      return new NextResponse("<error>Journal not found</error>", {
        status: 404,
        headers: { "Content-Type": "application/xml" },
      });
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const oaiUrl = `${baseUrl}/api/journals/${journalId}/oai`;
    const responseDate = new Date().toISOString();

    let responseBody = "";

    switch (verb) {
      case "Identify": {
        responseBody = `
          <Identify>
            <repositoryName>${escapeXml(journal.name)}</repositoryName>
            <baseURL>${escapeXml(oaiUrl)}</baseURL>
            <protocolVersion>2.0</protocolVersion>
            <adminEmail>${escapeXml(`admin@${journal.slug}.press`)}</adminEmail>
            <earliestDatestamp>2020-01-01T00:00:00Z</earliestDatestamp>
            <deletedRecord>no</deletedRecord>
            <granularity>YYYY-MM-DDThh:mm:ssZ</granularity>
          </Identify>`;
        break;
      }

      case "ListRecords":
      case "ListIdentifiers": {
        const articles = await prisma.submission.findMany({
          where: { journalId, status: "Published" },
          include: {
            authors: { orderBy: { sortOrder: "asc" } },
            journal: { select: { name: true, issn: true, eissn: true } },
          },
          orderBy: { publishedAt: "desc" },
          take: 100,
        });

        const records = articles.map((article) => {
          const header = `
            <header>
              <identifier>oai:${journal.slug}:${article.id}</identifier>
              <datestamp>${article.publishedAt ? dcDate(article.publishedAt) : dcDate(article.createdAt)}</datestamp>
              <setSpec>${journal.slug}</setSpec>
            </header>`;

          if (verb === "ListIdentifiers") return header;

          return `
            <record>
              ${header}
              <metadata>
                <oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/"
                            xmlns:dc="http://purl.org/dc/elements/1.1/">
                  <dc:title>${escapeXml(article.title)}</dc:title>
                  ${article.authors.map((a) => `<dc:creator>${escapeXml(`${a.familyName}, ${a.givenName}`)}</dc:creator>`).join("\n                  ")}
                  ${article.abstract ? `<dc:description>${escapeXml(article.abstract)}</dc:description>` : ""}
                  <dc:publisher>${escapeXml(journal.name)}</dc:publisher>
                  <dc:date>${article.publishedAt ? dcDate(article.publishedAt) : ""}</dc:date>
                  <dc:type>info:eu-repo/semantics/article</dc:type>
                  ${article.doi ? `<dc:identifier>doi:${escapeXml(article.doi)}</dc:identifier>` : ""}
                  <dc:identifier>${baseUrl}/${journal.slug}/article/${article.id}</dc:identifier>
                  ${article.journal.issn ? `<dc:source>${escapeXml(article.journal.issn)}</dc:source>` : ""}
                  <dc:language>${article.locale}</dc:language>
                  ${article.keywords.map((k) => `<dc:subject>${escapeXml(k)}</dc:subject>`).join("\n                  ")}
                </oai_dc:dc>
              </metadata>
            </record>`;
        });

        responseBody = `<${verb}>${records.join("")}</${verb}>`;
        break;
      }

      case "GetRecord": {
        if (!identifier) {
          responseBody = `<error code="badArgument">identifier is required</error>`;
          break;
        }

        const articleId = identifier.split(":").pop();
        const article = await prisma.submission.findUnique({
          where: { id: articleId },
          include: {
            authors: { orderBy: { sortOrder: "asc" } },
            journal: { select: { name: true, issn: true } },
          },
        });

        if (!article || article.status !== "Published" || article.journalId !== journalId) {
          responseBody = `<error code="idDoesNotExist">Record not found</error>`;
          break;
        }

        responseBody = `
          <GetRecord>
            <record>
              <header>
                <identifier>${escapeXml(identifier)}</identifier>
                <datestamp>${article.publishedAt ? dcDate(article.publishedAt) : dcDate(article.createdAt)}</datestamp>
              </header>
              <metadata>
                <oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/"
                            xmlns:dc="http://purl.org/dc/elements/1.1/">
                  <dc:title>${escapeXml(article.title)}</dc:title>
                  ${article.authors.map((a) => `<dc:creator>${escapeXml(`${a.familyName}, ${a.givenName}`)}</dc:creator>`).join("\n                  ")}
                  ${article.abstract ? `<dc:description>${escapeXml(article.abstract)}</dc:description>` : ""}
                  <dc:publisher>${escapeXml(article.journal.name)}</dc:publisher>
                  <dc:date>${article.publishedAt ? dcDate(article.publishedAt) : ""}</dc:date>
                  ${article.doi ? `<dc:identifier>doi:${escapeXml(article.doi)}</dc:identifier>` : ""}
                  <dc:language>${article.locale}</dc:language>
                </oai_dc:dc>
              </metadata>
            </record>
          </GetRecord>`;
        break;
      }

      case "ListSets": {
        responseBody = `
          <ListSets>
            <set>
              <setSpec>${escapeXml(journal.slug)}</setSpec>
              <setName>${escapeXml(journal.name)}</setName>
            </set>
          </ListSets>`;
        break;
      }

      default:
        responseBody = `<error code="badVerb">Illegal OAI verb</error>`;
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>${responseDate}</responseDate>
  <request verb="${escapeXml(verb || "")}">${escapeXml(oaiUrl)}</request>
  ${responseBody}
</OAI-PMH>`;

    return new NextResponse(xml, {
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  } catch (error) {
    console.error("OAI-PMH error:", error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><OAI-PMH><error>Internal error</error></OAI-PMH>`,
      { status: 500, headers: { "Content-Type": "application/xml" } }
    );
  }
}
