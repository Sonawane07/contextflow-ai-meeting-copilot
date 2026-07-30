import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MeetingCard } from "@/features/meetings/meeting-card";
import { seedMeetings } from "@/lib/demo/seed";

describe("MeetingCard", () => {
  it("renders meeting context and an accessible detail link", () => {
    const meeting = seedMeetings[0];
    expect(meeting).toBeDefined();

    render(<MeetingCard meeting={meeting!} />);

    expect(
      screen.getByRole("heading", {
        name: "Product weekly: activation",
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("3 attendees")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open meeting/i })).toHaveAttribute(
      "href",
      "/meetings/product-weekly",
    );
  });
});
