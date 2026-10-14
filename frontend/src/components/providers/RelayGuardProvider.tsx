"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  emptyConnection,
  type RelayGuardConnection,
} from "@/domain/entities/Connection";
import type { RelayGuardRepository } from "@/domain/repositories/RelayGuardRepository";
import { RelayGuardRepositoryImpl } from "@/infrastructure/repositories/RelayGuardRepositoryImpl";
import { sessionConnectionRepository } from "@/infrastructure/repositories/SessionConnectionRepository";

type ContextValue = {
  connection: RelayGuardConnection;
  connected: boolean;
  ready: boolean;
  recentJobs: string[];
  repository: RelayGuardRepository;
  connect(connection: RelayGuardConnection): void;
  disconnect(): void;
  rememberJob(jobId: string): void;
};

const RelayGuardContext = createContext<ContextValue | null>(null);

export function RelayGuardProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [connection, setConnection] = useState(emptyConnection);
  const [ready, setReady] = useState(false);
  const [recentJobs, setRecentJobs] = useState<string[]>([]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setConnection(sessionConnectionRepository.read());
      setRecentJobs(sessionConnectionRepository.recentJobs());
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const repository = useMemo(
    () => new RelayGuardRepositoryImpl(connection),
    [connection],
  );
  const connect = useCallback((next: RelayGuardConnection) => {
    sessionConnectionRepository.write(next);
    setConnection(next);
  }, []);
  const disconnect = useCallback(() => {
    sessionConnectionRepository.clear();
    setConnection(emptyConnection);
  }, []);
  const rememberJob = useCallback((jobId: string) => {
    setRecentJobs(sessionConnectionRepository.rememberJob(jobId));
  }, []);

  const value = useMemo<ContextValue>(
    () => ({
      connection,
      connected: Boolean(connection.apiUrl),
      ready,
      recentJobs,
      repository,
      connect,
      disconnect,
      rememberJob,
    }),
    [
      connect,
      connection,
      disconnect,
      ready,
      recentJobs,
      rememberJob,
      repository,
    ],
  );

  return (
    <RelayGuardContext.Provider value={value}>
      {children}
    </RelayGuardContext.Provider>
  );
}

export function useRelayGuard() {
  const value = useContext(RelayGuardContext);
  if (!value)
    throw new Error("useRelayGuard must be used inside RelayGuardProvider");
  return value;
}
