import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/infrastructure/errors/ApiError";
import { RelayGuardRepositoryImpl } from "./RelayGuardRepositoryImpl";

const connection = {
  apiUrl: "https://api.example.com",
  operatorToken: "operator",
  signingSecret: "secret",
};
const job = {
  job_id: "job-1",
  source: "console",
  event_type: "invoice.paid",
  status: "SUCCEEDED",
  attempt: 1,
  received_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:01Z",
  history: [],
};

afterEach(() => vi.unstubAllGlobals());

describe("RelayGuardRepositoryImpl", () => {
  it("sends connection details and operation to the local adapter", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(job), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      new RelayGuardRepositoryImpl(connection).getJob("job-1"),
    ).resolves.toEqual(job);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(fetchMock.mock.calls[0][0]).toBe("/api/relayguard");
    expect(JSON.parse(String(init.body))).toMatchObject({
      operation: "getJob",
      connection,
      jobId: "job-1",
    });
  });

  it("translates failed responses into ApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ error: "forbidden", message: "Denied" }),
            { status: 403 },
          ),
        ),
    );
    const error = await new RelayGuardRepositoryImpl(connection)
      .getJob("job-1")
      .catch((caught) => caught as ApiError);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      name: "ApiError",
      status: 403,
      code: "forbidden",
      message: "Denied",
    });
  });

  it("rejects a successful response with an invalid job contract", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ job_id: "job-1" }), { status: 200 }),
        ),
    );
    await expect(
      new RelayGuardRepositoryImpl(connection).getJob("job-1"),
    ).rejects.toMatchObject({
      status: 502,
      message: "The API returned an invalid job.",
    });
  });
});
