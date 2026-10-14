"use client";

import { useCallback, useEffect, useState } from "react";
import { getJob } from "@/application/useCases/getJob";
import type { Job } from "@/domain/entities/Job";
import { friendlyError } from "@/infrastructure/errors/ApiError";
import { PageIntro } from "@/components/ui/PageIntro";
import { JobDetails } from "./JobDetails";
import { JobSearch } from "./JobSearch";
import { JobsEmptyState } from "./JobsEmptyState";
import { RecentJobs } from "./RecentJobs";
import { useRelayGuard } from "../providers/RelayGuardProvider";

export function JobsWorkspace({
  requestedJobId,
  onConnect,
}: {
  requestedJobId?: string;
  onConnect(): void;
}) {
  const { connected, repository, recentJobs, rememberJob } = useRelayGuard();
  const [jobId, setJobId] = useState(requestedJobId || "");
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (id = jobId) => {
      if (!connected) return onConnect();
      setLoading(true);
      setError("");
      try {
        const result = await getJob(repository, id);
        setJob(result);
        setJobId(result.job_id);
        rememberJob(result.job_id);
      } catch (caught) {
        setError(friendlyError(caught));
      } finally {
        setLoading(false);
      }
    },
    [connected, jobId, onConnect, rememberJob, repository],
  );

  useEffect(() => {
    if (!requestedJobId || !connected) return;
    const timer = window.setTimeout(() => void load(requestedJobId), 0);
    return () => window.clearTimeout(timer);
  }, [connected, load, requestedJobId]);

  return (
    <div className="grid gap-6">
      <section className="grid gap-5 xl:grid-cols-[1fr_minmax(340px,560px)] xl:items-end">
        <PageIntro
          title="Trace every delivery."
          mutedTitle="See the transaction move."
          description="Select a job to turn its real status and history into an interactive delivery graph."
        />
        <JobSearch
          value={jobId}
          loading={loading}
          onChange={setJobId}
          onSubmit={() => void load()}
        />
      </section>

      {error && (
        <p className="rounded-xl border border-rose-400/15 bg-rose-400/[.07] px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      )}
      {job ? (
        <JobDetails job={job} onRefresh={() => load(job.job_id)} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
          <JobsEmptyState />
          <RecentJobs jobs={recentJobs} />
        </div>
      )}
    </div>
  );
}
