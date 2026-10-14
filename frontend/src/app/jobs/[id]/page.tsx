import { AppShell } from "@/components/AppShell";

export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AppShell view="jobs" requestedJobId={id} />;
}
