import type { EventType, WorkflowEvent, ID } from "./types";

/** Event listener callback */
export type EventListener<T = unknown> = (event: WorkflowEvent<T>) => void | Promise<void>;

/**
 * Event bus for workflow transitions.
 * Allows decoupled communication between packages.
 *
 * ```ts
 * const bus = new EventBus();
 * bus.on(EventType.SubmissionCreated, (event) => {
 *   console.log("New submission:", event.submissionId);
 * });
 * ```
 */
export class EventBus {
  private listeners = new Map<EventType, Set<EventListener>>();
  private history: WorkflowEvent[] = [];

  /** Subscribe to an event type */
  on<T = unknown>(type: EventType, listener: EventListener<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    const set = this.listeners.get(type)!;
    set.add(listener as EventListener);

    // Return unsubscribe function
    return () => {
      set.delete(listener as EventListener);
    };
  }

  /** Subscribe to an event type, but only fire once */
  once<T = unknown>(type: EventType, listener: EventListener<T>): () => void {
    const unsubscribe = this.on<T>(type, (event) => {
      unsubscribe();
      return listener(event);
    });
    return unsubscribe;
  }

  /** Emit an event to all registered listeners */
  async emit<T = unknown>(event: WorkflowEvent<T>): Promise<void> {
    this.history.push(event as WorkflowEvent);
    const set = this.listeners.get(event.type);
    if (!set) return;

    const promises: (void | Promise<void>)[] = [];
    for (const listener of set) {
      promises.push(listener(event as WorkflowEvent));
    }
    await Promise.all(promises);
  }

  /** Create and emit a workflow event */
  async dispatch<T = unknown>(
    type: EventType,
    journalId: ID,
    submissionId: ID,
    actorId: ID,
    payload: T,
  ): Promise<WorkflowEvent<T>> {
    const event: WorkflowEvent<T> = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      journalId,
      submissionId,
      actorId,
      payload,
      timestamp: new Date().toISOString(),
    };
    await this.emit(event);
    return event;
  }

  /** Get event history, optionally filtered by type */
  getHistory(type?: EventType): WorkflowEvent[] {
    if (type) {
      return this.history.filter((e) => e.type === type);
    }
    return [...this.history];
  }

  /** Clear all listeners and history */
  clear(): void {
    this.listeners.clear();
    this.history = [];
  }

  /** Number of listeners for a given event type */
  listenerCount(type: EventType): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}
