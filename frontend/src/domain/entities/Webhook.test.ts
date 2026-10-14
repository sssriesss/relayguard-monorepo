import { describe, expect, it } from "vitest";
import { toWebhookPayload } from "./Webhook";

describe("toWebhookPayload", () => {
  it("normalizes a valid webhook draft", () => {
    expect(
      toWebhookPayload({
        source: " billing ",
        eventId: " evt-1 ",
        eventType: " invoice.paid ",
        data: '{"amount":42}',
      }),
    ).toEqual({
      version: 1,
      event_id: "evt-1",
      event_type: "invoice.paid",
      data: { amount: 42 },
    });
  });

  it("rejects JSON values that are not objects", () => {
    expect(() =>
      toWebhookPayload({
        source: "billing",
        eventId: "evt-1",
        eventType: "invoice.paid",
        data: "[]",
      }),
    ).toThrow("JSON object");
  });
});
