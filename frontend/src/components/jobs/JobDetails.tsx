"use client";

import { useState } from "react";
import { replayJob } from "@/application/useCases/replayJob";
import type { Job } from "@/domain/entities/Job";
import { friendlyError } from "@/infrastructure/errors/ApiError";
import { useRelayGuard } from "../providers/RelayGuardProvider";
import { JobSummary } from "./JobSummary";
import { JobTimeline } from "./JobTimeline";
import { TransactionFlow } from "./TransactionFlow";

export function JobDetails({
  job,
  onRefresh,
}: {
  job: Job;
  onRefresh(): void;
}) {
  const { repository } = useRelayGuard();
  const [replaying, setReplaying] = useState(false);
  const [message, setMessage] = useState("");

  async function replay() {
    setReplaying(true);
    setMessage("");
    try {
      const result = await replayJob(repository, job);
      setMessage(`Attempt ${result.attempt} was queued.`);
      onRefresh();
    } catch (error) {
      setMessage(friendlyError(error));
    } finally {
      setReplaying(false);
    }
  }

  return (
    <div className="grid gap-4">
      <JobSummary
        job={job}
        replaying={replaying}
        message={message}
        onRefresh={onRefresh}
        onReplay={replay}
      />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <TransactionFlow key={`${job.job_id}-${job.updated_at}`} job={job} />
        <aside className="xl:sticky xl:top-20">
          <JobTimeline history={job.history} />
        </aside>
      </div>
    </div>
  );
}
