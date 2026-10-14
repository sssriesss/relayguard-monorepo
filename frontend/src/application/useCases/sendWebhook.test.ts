import { describe, expect, it, vi } from "vitest";
import type { RelayGuardRepository } from "@/domain/repositories/RelayGuardRepository";
import { sendWebhook } from "./sendWebhook";

describe("sendWebhook", () => {
  it("normalizes and delegates a valid draft", async () => {
    const accepted = { job_id: "job-1", duplicate: false };
    const repository = {
      sendWebhook: vi.fn().mockResolvedValue(accepted),
    } as unknown as RelayGuardRepository;
    await expect(
      sendWebhook(repository, {
        source: " console ",
        eventId: " evt-1 ",
        eventType: " invoice.paid ",
        data: '{"amount":42}',
      }),
    ).resolves.toBe(accepted);
    expect(repository.sendWebhook).toHaveBeenCalledWith("console", {
      version: 1,
      event_id: "evt-1",
      event_type: "invoice.paid",
      data: { amount: 42 },
    });
  });

  it("does not call the repository for invalid JSON", () => {
    const repository = {
      sendWebhook: vi.fn(),
    } as unknown as RelayGuardRepository;
    expect(() =>
      sendWebhook(repository, {
        source: "console",
        eventId: "evt-1",
        eventType: "invoice.paid",
        data: "invalid",
      }),
    ).toThrow();
    expect(repository.sendWebhook).not.toHaveBeenCalled();
  });
});
