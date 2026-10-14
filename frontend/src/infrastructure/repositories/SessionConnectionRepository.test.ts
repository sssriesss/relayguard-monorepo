import { beforeEach, describe, expect, it } from "vitest";
import { emptyConnection } from "@/domain/entities/Connection";
import { sessionConnectionRepository } from "./SessionConnectionRepository";

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe("sessionConnectionRepository", () => {
  it("stores connection credentials only in session storage", () => {
    const connection = {
      apiUrl: "http://localhost:4566",
      operatorToken: "operator",
      signingSecret: "secret",
    };
    sessionConnectionRepository.write(connection);
    expect(sessionConnectionRepository.read()).toEqual(connection);
    expect(localStorage.length).toBe(0);
  });

  it("falls back to an empty connection for invalid storage", () => {
    sessionStorage.setItem("relayguard.connection", "invalid");
    expect(sessionConnectionRepository.read()).toEqual(emptyConnection);
  });

  it("deduplicates and limits recent jobs", () => {
    for (let index = 0; index < 10; index += 1)
      sessionConnectionRepository.rememberJob(`job-${index}`);
    const jobs = sessionConnectionRepository.rememberJob("job-5");
    expect(jobs).toHaveLength(8);
    expect(jobs[0]).toBe("job-5");
    expect(jobs.filter((id) => id === "job-5")).toHaveLength(1);
  });
});
