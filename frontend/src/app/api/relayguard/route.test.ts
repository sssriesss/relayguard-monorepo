import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const connection = {
  apiUrl: "https://api.example.com/stage",
  operatorToken: "operator",
  signingSecret: "secret",
};

function request(body: unknown) {
  return new Request("http://localhost/api/relayguard", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("RelayGuard API adapter", () => {
  it("blocks API origins outside the configured allowlist", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(request({ operation: "health", connection }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "This API origin is not allowed by the frontend server.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards job reads with an encoded ID and bearer token", async () => {
    vi.stubEnv("RELAYGUARD_ALLOWED_API_ORIGINS", "https://api.example.com");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ job_id: "job/1" }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(
      request({ operation: "getJob", connection, jobId: "job/1" }),
    );
    expect(response.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe(
      "https://api.example.com/stage/v1/jobs/job%2F1",
    );
    expect(init).toMatchObject({
      method: "GET",
      headers: { authorization: "Bearer operator" },
    });
  });

  it("signs the exact serialized webhook body", async () => {
    vi.stubEnv("RELAYGUARD_ALLOWED_API_ORIGINS", "https://api.example.com");
    vi.spyOn(Date, "now").mockReturnValue(1_797_000_000_000);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ job_id: "job-1", duplicate: false }), {
        status: 202,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const payload = {
      version: 1,
      event_id: "evt-1",
      event_type: "invoice.paid",
      data: { amount: 42 },
    };
    const response = await POST(
      request({
        operation: "sendWebhook",
        connection,
        source: "console",
        payload,
      }),
    );
    expect(response.status).toBe(202);
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    const serialized = JSON.stringify(payload);
    const timestamp = "1797000000";
    const signature = createHmac("sha256", "secret")
      .update(`${timestamp}.${serialized}`)
      .digest("hex");
    expect(url.toString()).toBe(
      "https://api.example.com/stage/v1/webhooks/console",
    );
    expect(init.body).toBe(serialized);
    expect(init.headers).toMatchObject({
      "x-relayguard-timestamp": timestamp,
      "x-relayguard-signature": `sha256=${signature}`,
    });
  });

  it("requires credentials for protected operations", async () => {
    vi.stubEnv("RELAYGUARD_ALLOWED_API_ORIGINS", "https://api.example.com");
    const response = await POST(
      request({
        operation: "getJob",
        connection: { ...connection, operatorToken: "" },
        jobId: "job-1",
      }),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "An operator token is required.",
    });
  });
});
