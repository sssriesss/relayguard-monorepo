export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function friendlyError(error: unknown): string {
  if (error instanceof ApiError) {
    const messages: Record<string, string> = {
      forbidden: "The operator token was rejected.",
      unauthorized: "The webhook signing secret was rejected.",
      job_not_found: "No job was found with that ID.",
      job_not_replayable: "This job cannot be replayed in its current state.",
      idempotency_conflict:
        "This event ID already belongs to a different payload.",
    };
    return (error.code && messages[error.code]) || error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}
