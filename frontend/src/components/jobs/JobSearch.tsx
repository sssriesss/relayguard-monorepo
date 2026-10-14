import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Panel } from "@/components/ui/Panel";

export function JobSearch({
  value,
  loading,
  onChange,
  onSubmit,
}: {
  value: string;
  loading: boolean;
  onChange(value: string): void;
  onSubmit(): void;
}) {
  return (
    <Panel className="w-full p-2 xl:max-w-xl">
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Input
          aria-label="Job ID"
          className="min-w-0 border-0 bg-transparent focus:bg-transparent focus:shadow-none"
          placeholder="Paste a job ID"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <Button type="submit" loading={loading} className="shrink-0">
          <Search className="size-4" />
          <span className="hidden sm:inline">Inspect</span>
        </Button>
      </form>
    </Panel>
  );
}
