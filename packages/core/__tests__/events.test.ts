import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventBus } from "../src/events";
import { EventType } from "../src/types";

describe("EventBus", () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  describe("on / emit", () => {
    it("calls listener when matching event is emitted", async () => {
      const listener = vi.fn();
      bus.on(EventType.SubmissionCreated, listener);

      const event = {
        id: "evt_1",
        type: EventType.SubmissionCreated,
        journalId: "j1",
        submissionId: "s1",
        actorId: "a1",
        payload: { title: "Test" },
        timestamp: new Date().toISOString(),
      };

      await bus.emit(event);
      expect(listener).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith(event);
    });

    it("does not call listener for non-matching event types", async () => {
      const listener = vi.fn();
      bus.on(EventType.SubmissionCreated, listener);

      await bus.emit({
        id: "evt_1",
        type: EventType.ReviewSubmitted,
        journalId: "j1",
        submissionId: "s1",
        actorId: "a1",
        payload: {},
        timestamp: new Date().toISOString(),
      });

      expect(listener).not.toHaveBeenCalled();
    });

    it("supports multiple listeners for the same event type", async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      bus.on(EventType.SubmissionCreated, listener1);
      bus.on(EventType.SubmissionCreated, listener2);

      await bus.emit({
        id: "evt_1",
        type: EventType.SubmissionCreated,
        journalId: "j1",
        submissionId: "s1",
        actorId: "a1",
        payload: {},
        timestamp: new Date().toISOString(),
      });

      expect(listener1).toHaveBeenCalledOnce();
      expect(listener2).toHaveBeenCalledOnce();
    });

    it("returns an unsubscribe function", async () => {
      const listener = vi.fn();
      const unsubscribe = bus.on(EventType.SubmissionCreated, listener);

      unsubscribe();

      await bus.emit({
        id: "evt_1",
        type: EventType.SubmissionCreated,
        journalId: "j1",
        submissionId: "s1",
        actorId: "a1",
        payload: {},
        timestamp: new Date().toISOString(),
      });

      expect(listener).not.toHaveBeenCalled();
    });

    it("handles async listeners", async () => {
      const results: number[] = [];
      bus.on(EventType.SubmissionCreated, async () => {
        await new Promise((r) => setTimeout(r, 10));
        results.push(1);
      });
      bus.on(EventType.SubmissionCreated, async () => {
        results.push(2);
      });

      await bus.emit({
        id: "evt_1",
        type: EventType.SubmissionCreated,
        journalId: "j1",
        submissionId: "s1",
        actorId: "a1",
        payload: {},
        timestamp: new Date().toISOString(),
      });

      expect(results).toContain(1);
      expect(results).toContain(2);
    });
  });

  describe("once", () => {
    it("fires listener only once", async () => {
      const listener = vi.fn();
      bus.once(EventType.SubmissionCreated, listener);

      const event = {
        id: "evt_1",
        type: EventType.SubmissionCreated,
        journalId: "j1",
        submissionId: "s1",
        actorId: "a1",
        payload: {},
        timestamp: new Date().toISOString(),
      };

      await bus.emit(event);
      await bus.emit(event);

      expect(listener).toHaveBeenCalledOnce();
    });

    it("returns an unsubscribe function that works before first emit", async () => {
      const listener = vi.fn();
      const unsub = bus.once(EventType.SubmissionCreated, listener);

      unsub();

      await bus.emit({
        id: "evt_1",
        type: EventType.SubmissionCreated,
        journalId: "j1",
        submissionId: "s1",
        actorId: "a1",
        payload: {},
        timestamp: new Date().toISOString(),
      });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("dispatch", () => {
    it("creates and emits a proper WorkflowEvent", async () => {
      const listener = vi.fn();
      bus.on(EventType.ReviewerAssigned, listener);

      const event = await bus.dispatch(
        EventType.ReviewerAssigned,
        "journal_1",
        "sub_1",
        "editor_1",
        { reviewerId: "rev_1" },
      );

      expect(event.id).toMatch(/^evt_/);
      expect(event.type).toBe(EventType.ReviewerAssigned);
      expect(event.journalId).toBe("journal_1");
      expect(event.submissionId).toBe("sub_1");
      expect(event.actorId).toBe("editor_1");
      expect(event.payload).toEqual({ reviewerId: "rev_1" });
      expect(event.timestamp).toBeTruthy();
      expect(listener).toHaveBeenCalledOnce();
    });

    it("stores dispatched event in history", async () => {
      await bus.dispatch(EventType.SubmissionCreated, "j1", "s1", "a1", {});
      const history = bus.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe(EventType.SubmissionCreated);
    });
  });

  describe("getHistory", () => {
    it("returns empty array initially", () => {
      expect(bus.getHistory()).toEqual([]);
    });

    it("returns all events when no type filter", async () => {
      await bus.dispatch(EventType.SubmissionCreated, "j1", "s1", "a1", {});
      await bus.dispatch(EventType.ReviewSubmitted, "j1", "s1", "a1", {});
      await bus.dispatch(EventType.DecisionMade, "j1", "s1", "a1", {});

      expect(bus.getHistory()).toHaveLength(3);
    });

    it("filters by type when type is provided", async () => {
      await bus.dispatch(EventType.SubmissionCreated, "j1", "s1", "a1", {});
      await bus.dispatch(EventType.ReviewSubmitted, "j1", "s1", "a1", {});
      await bus.dispatch(EventType.SubmissionCreated, "j1", "s2", "a1", {});

      const filtered = bus.getHistory(EventType.SubmissionCreated);
      expect(filtered).toHaveLength(2);
      expect(filtered.every((e) => e.type === EventType.SubmissionCreated)).toBe(true);
    });

    it("returns empty array for type with no events", async () => {
      await bus.dispatch(EventType.SubmissionCreated, "j1", "s1", "a1", {});
      expect(bus.getHistory(EventType.ArticlePublished)).toEqual([]);
    });

    it("returns a copy, not a reference to internal array", async () => {
      await bus.dispatch(EventType.SubmissionCreated, "j1", "s1", "a1", {});
      const h1 = bus.getHistory();
      const h2 = bus.getHistory();
      expect(h1).not.toBe(h2);
      expect(h1).toEqual(h2);
    });
  });

  describe("clear", () => {
    it("removes all listeners", async () => {
      const listener = vi.fn();
      bus.on(EventType.SubmissionCreated, listener);

      bus.clear();

      await bus.emit({
        id: "evt_1",
        type: EventType.SubmissionCreated,
        journalId: "j1",
        submissionId: "s1",
        actorId: "a1",
        payload: {},
        timestamp: new Date().toISOString(),
      });

      expect(listener).not.toHaveBeenCalled();
    });

    it("clears event history", async () => {
      await bus.dispatch(EventType.SubmissionCreated, "j1", "s1", "a1", {});
      expect(bus.getHistory()).toHaveLength(1);

      bus.clear();
      expect(bus.getHistory()).toHaveLength(0);
    });

    it("resets listener count to 0", () => {
      bus.on(EventType.SubmissionCreated, vi.fn());
      bus.on(EventType.ReviewSubmitted, vi.fn());
      bus.clear();
      expect(bus.listenerCount(EventType.SubmissionCreated)).toBe(0);
      expect(bus.listenerCount(EventType.ReviewSubmitted)).toBe(0);
    });
  });

  describe("listenerCount", () => {
    it("returns 0 for event type with no listeners", () => {
      expect(bus.listenerCount(EventType.SubmissionCreated)).toBe(0);
    });

    it("returns correct count after adding listeners", () => {
      bus.on(EventType.SubmissionCreated, vi.fn());
      bus.on(EventType.SubmissionCreated, vi.fn());
      bus.on(EventType.ReviewSubmitted, vi.fn());

      expect(bus.listenerCount(EventType.SubmissionCreated)).toBe(2);
      expect(bus.listenerCount(EventType.ReviewSubmitted)).toBe(1);
    });

    it("decreases after unsubscribe", () => {
      const unsub = bus.on(EventType.SubmissionCreated, vi.fn());
      bus.on(EventType.SubmissionCreated, vi.fn());
      expect(bus.listenerCount(EventType.SubmissionCreated)).toBe(2);

      unsub();
      expect(bus.listenerCount(EventType.SubmissionCreated)).toBe(1);
    });
  });
});
