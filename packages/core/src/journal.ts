import type { Journal, CreateJournalOptions, JournalSection, ID } from "./types";

let counter = 0;

function generateId(): ID {
  return `sp_${Date.now()}_${++counter}`;
}

/**
 * Create a new journal configuration.
 *
 * ```ts
 * const journal = createJournal({
 *   name: "Journal of Open Science",
 *   slug: "jos",
 *   issn: "1234-5678",
 *   doiPrefix: "10.1234",
 *   sections: ["Research Articles", "Reviews"],
 * });
 * ```
 */
export function createJournal(options: CreateJournalOptions): Journal {
  const now = new Date().toISOString();

  const sections: JournalSection[] = (options.sections ?? []).map((name) => ({
    id: generateId(),
    name,
    active: true,
  }));

  return {
    id: generateId(),
    name: options.name,
    slug: options.slug,
    abbreviation: options.abbreviation,
    issn: options.issn,
    eissn: options.eissn,
    doiPrefix: options.doiPrefix,
    description: options.description,
    sections,
    defaultReviewType: options.defaultReviewType ?? "double-blind",
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Registry for managing multiple journals in a single instance.
 */
export class JournalRegistry {
  private journals = new Map<ID, Journal>();

  /** Register a journal */
  register(journal: Journal): void {
    if (this.journals.has(journal.id)) {
      throw new Error(`Journal with id "${journal.id}" already registered`);
    }
    this.journals.set(journal.id, journal);
  }

  /** Get a journal by ID */
  get(id: ID): Journal | undefined {
    return this.journals.get(id);
  }

  /** Get a journal by slug */
  getBySlug(slug: string): Journal | undefined {
    for (const journal of this.journals.values()) {
      if (journal.slug === slug) return journal;
    }
    return undefined;
  }

  /** List all registered journals */
  list(): Journal[] {
    return Array.from(this.journals.values());
  }

  /** Remove a journal */
  remove(id: ID): boolean {
    return this.journals.delete(id);
  }

  /** Number of registered journals */
  get size(): number {
    return this.journals.size;
  }
}
