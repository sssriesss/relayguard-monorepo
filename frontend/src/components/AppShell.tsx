"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ArchitectureFlow } from "./architecture/ArchitectureFlow";
import { ConnectionDialog } from "./ConnectionDialog";
import { SendWebhook } from "./events/SendWebhook";
import { JobsWorkspace } from "./jobs/JobsWorkspace";
import { MobileNav } from "./layout/MobileNav";
import { Sidebar } from "./layout/Sidebar";
import type { AppView } from "./layout/navigation";
import { useRelayGuard } from "./providers/RelayGuardProvider";

export function AppShell({
  view,
  requestedJobId = "",
}: {
  view: AppView;
  requestedJobId?: string;
}) {
  const { connected, connection, ready } = useRelayGuard();
  const router = useRouter();
  const [connectionOpen, setConnectionOpen] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const openConnection = useCallback(() => setConnectionOpen(true), []);
  const closeConnection = useCallback(() => {
    setConnectionOpen(false);
    setWelcomeDismissed(true);
  }, []);
  const openJob = useCallback(
    (jobId: string) => router.push(`/jobs/${jobId}`),
    [router],
  );

  if (!ready) return <div className="min-h-screen" />;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <Sidebar
        view={view}
        connected={connected}
        apiUrl={connection.apiUrl}
        onConnect={openConnection}
      />
      <main className="min-w-0 pb-24 lg:pb-0">
        <div className="mx-auto max-w-[1440px] p-4 sm:p-6 lg:p-8">
          {view === "jobs" && (
            <JobsWorkspace
              requestedJobId={requestedJobId}
              onConnect={openConnection}
            />
          )}
          {view === "events" && (
            <SendWebhook onOpenJob={openJob} onConnect={openConnection} />
          )}
          {view === "architecture" && <ArchitectureFlow />}
        </div>
      </main>
      <MobileNav view={view} connected={connected} onConnect={openConnection} />
      {(connectionOpen || (!connected && !welcomeDismissed)) && (
        <ConnectionDialog canExplore={!connected} onClose={closeConnection} />
      )}
    </div>
  );
}
