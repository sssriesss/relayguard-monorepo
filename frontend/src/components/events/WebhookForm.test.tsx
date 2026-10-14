import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WebhookForm } from "./WebhookForm";

const draft = {
  source: "console",
  eventId: "evt-1",
  eventType: "invoice.paid",
  data: '{"amount":42}',
};

describe("WebhookForm", () => {
  it("reports edited fields through the shared change handler", () => {
    const onChange = vi.fn();
    render(
      <WebhookForm
        draft={draft}
        sending={false}
        onChange={onChange}
        onGenerate={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Source/), {
      target: { value: "billing" },
    });
    fireEvent.change(screen.getByLabelText(/Event data/), {
      target: { value: '{"amount":99}' },
    });
    expect(onChange).toHaveBeenCalledWith("source", "billing");
    expect(onChange).toHaveBeenCalledWith("data", '{"amount":99}');
  });

  it("generates examples and submits the form", () => {
    const onGenerate = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <WebhookForm
        draft={draft}
        sending={false}
        onChange={vi.fn()}
        onGenerate={onGenerate}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Generate example" }));
    fireEvent.click(screen.getByRole("button", { name: "Send and track" }));
    expect(onGenerate).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("disables submission while sending", () => {
    render(
      <WebhookForm
        draft={draft}
        sending
        onChange={vi.fn()}
        onGenerate={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Send and track" }),
    ).toBeDisabled();
  });
});
