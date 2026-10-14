import {
  emptyConnection,
  type RelayGuardConnection,
} from "@/domain/entities/Connection";

const connectionKey = "relayguard.connection";
const recentJobsKey = "relayguard.recent-jobs";

export const sessionConnectionRepository = {
  read(): RelayGuardConnection {
    const value = sessionStorage.getItem(connectionKey);
    if (!value) return emptyConnection;
    try {
      return { ...emptyConnection, ...JSON.parse(value) };
    } catch {
      return emptyConnection;
    }
  },
  write(connection: RelayGuardConnection) {
    sessionStorage.setItem(connectionKey, JSON.stringify(connection));
  },
  clear() {
    sessionStorage.removeItem(connectionKey);
  },
  recentJobs(): string[] {
    try {
      return JSON.parse(localStorage.getItem(recentJobsKey) || "[]");
    } catch {
      return [];
    }
  },
  rememberJob(jobId: string) {
    const jobs = [
      jobId,
      ...this.recentJobs().filter((id) => id !== jobId),
    ].slice(0, 8);
    localStorage.setItem(recentJobsKey, JSON.stringify(jobs));
    return jobs;
  },
};
