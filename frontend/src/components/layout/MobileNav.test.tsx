import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MobileNav } from "./MobileNav";

describe("MobileNav", () => {
  it("links every workspace and opens connection settings", () => {
    const onConnect = vi.fn();
    render(<MobileNav view="events" connected={false} onConnect={onConnect} />);
    expect(screen.getByRole("link", { name: "Operations" })).toHaveAttribute(
      "href",
      "/jobs",
    );
    expect(screen.getByRole("link", { name: "Event lab" })).toHaveAttribute(
      "href",
      "/events",
    );
    expect(screen.getByRole("link", { name: "Architecture" })).toHaveAttribute(
      "href",
      "/architecture",
    );
    fireEvent.click(screen.getByRole("button", { name: "Connection" }));
    expect(onConnect).toHaveBeenCalledOnce();
  });
});
