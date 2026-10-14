import { describe, expect, it } from "vitest";
import { generateWebhookDraft } from "./generateWebhookDraft";

describe("generateWebhookDraft", () => {
  it("creates a unique contract-valid event", () => {
    const first = generateWebhookDraft();
    const second = generateWebhookDraft();
    expect(first.eventId).toMatch(/^evt_/);
    expect(second.eventId).not.toBe(first.eventId);
    expect(JSON.parse(first.data)).toMatchObject({ currency: "EUR" });
  });
});
