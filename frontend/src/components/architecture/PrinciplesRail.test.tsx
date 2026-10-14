import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PrinciplesRail } from "./PrinciplesRail";

describe("PrinciplesRail", () => {
  it("renders the compact principles and allows expansion", () => {
    render(<PrinciplesRail />);
    expect(screen.getByText("Persist before acknowledge")).toBeInTheDocument();
    const details = screen
      .getByText("Persist before acknowledge")
      .closest("details");
    expect(details).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText("Persist before acknowledge"));
    expect(details).toHaveAttribute("open");
  });
});
