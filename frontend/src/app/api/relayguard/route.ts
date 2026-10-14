import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import type { RelayGuardConnection } from "@/domain/entities/Connection";

type RequestBody = {
  operation?: "health" | "getJob" | "replayJob" | "sendWebhook";
  connection?: RelayGuardConnection;
  jobId?: string;
  source?: string;
  payload?: Record<string, unknown>;
};

class RequestValidationError extends Error {}

function allowedOrigins(): Set<string> {
  return new Set(
    (process.env.RELAYGUARD_ALLOWED_API_ORIGINS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function validatedBaseUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new RequestValidationError("Enter a valid RelayGuard API URL.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new RequestValidationError(
      "The API URL must use HTTP or HTTPS without embedded credentials.",
    );
  }
  const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
  const allowed = allowedOrigins().has(url.origin);
  if (
    !allowed &&
    !(process.env.NODE_ENV !== "production" && localHosts.has(url.hostname))
  ) {
    throw new RequestValidationError(
      "This API origin is not allowed by the frontend server.",
    );
  }
  url.pathname = url.pathname.replace(/\/$/, "");
  url.search = "";
  url.hash = "";
  return url;
}

function endpoint(base: URL, path: string): URL {
  const result = new URL(base.toString());
  result.pathname = `${base.pathname}${path}`.replace(/\/{2,}/g, "/");
  return result;
}

function pathValue(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim() || value.length > 200) {
    throw new RequestValidationError(`${label} is invalid.`);
  }
  return encodeURIComponent(value.trim());
}

async function forward(url: URL, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  return NextResponse.json(data, { status: response.status });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const connection = body.connection;
    if (!connection || typeof connection.apiUrl !== "string") {
      return NextResponse.json(
        { message: "Connection details are required." },
        { status: 400 },
      );
    }
    const base = validatedBaseUrl(connection.apiUrl);
    if (body.operation === "health") {
      return forward(endpoint(base, "/health"));
    }
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (body.operation === "getJob" || body.operation === "replayJob") {
      if (!connection.operatorToken) {
        return NextResponse.json(
          { message: "An operator token is required." },
          { status: 400 },
        );
      }
      headers.authorization = `Bearer ${connection.operatorToken}`;
      const jobId = pathValue(body.jobId, "Job ID");
      const suffix = body.operation === "replayJob" ? "/replay" : "";
      return forward(endpoint(base, `/v1/jobs/${jobId}${suffix}`), {
        method: body.operation === "replayJob" ? "POST" : "GET",
        headers,
      });
    }
    if (body.operation === "sendWebhook") {
      if (!connection.signingSecret) {
        return NextResponse.json(
          { message: "A webhook signing secret is required." },
          { status: 400 },
        );
      }
      if (
        !body.payload ||
        typeof body.payload !== "object" ||
        Array.isArray(body.payload)
      ) {
        return NextResponse.json(
          { message: "A webhook payload is required." },
          { status: 400 },
        );
      }
      const source = pathValue(body.source, "Source");
      const payload = JSON.stringify(body.payload);
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = createHmac("sha256", connection.signingSecret)
        .update(`${timestamp}.${payload}`)
        .digest("hex");
      headers["x-relayguard-timestamp"] = timestamp;
      headers["x-relayguard-signature"] = `sha256=${signature}`;
      return forward(endpoint(base, `/v1/webhooks/${source}`), {
        method: "POST",
        headers,
        body: payload,
      });
    }
    return NextResponse.json(
      { message: "Unknown operation." },
      { status: 400 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "RelayGuard is unavailable.";
    const timeout = error instanceof Error && error.name === "TimeoutError";
    const status =
      error instanceof RequestValidationError ? 400 : timeout ? 504 : 502;
    return NextResponse.json({ message }, { status });
  }
}
