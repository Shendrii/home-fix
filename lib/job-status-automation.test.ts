import { describe, expect, it } from "vitest";
import { automationForJobStatus } from "@/lib/job-status-automation";

describe("job status automation", () => {
  it("leaves a new open request inside HomeFix", () => {
    expect(automationForJobStatus("open")).toEqual({
      calendar: "none",
      email: "none",
      slack: false,
    });
  });

  it("creates the visit, emails the client, and posts in Slack when a partner is assigned", () => {
    expect(automationForJobStatus("assigned")).toEqual({
      calendar: "create",
      email: "scheduled",
      slack: true,
    });
  });

  it("creates the visit, emails the client, and posts in Slack when the visit is scheduled", () => {
    expect(automationForJobStatus("scheduled")).toEqual({
      calendar: "create",
      email: "scheduled",
      slack: true,
    });
  });

  it("does not send anything when the partner is on the way", () => {
    expect(automationForJobStatus("en_route")).toEqual({
      calendar: "none",
      email: "none",
      slack: false,
    });
  });

  it("does not send anything when the visit is in progress", () => {
    expect(automationForJobStatus("in_progress")).toEqual({
      calendar: "none",
      email: "none",
      slack: false,
    });
  });

  it("posts in Slack when the visit is completed", () => {
    expect(automationForJobStatus("completed")).toEqual({
      calendar: "none",
      email: "none",
      slack: true,
    });
  });

  it("emails the client and posts in Slack when the visit is cancelled", () => {
    expect(automationForJobStatus("cancelled")).toEqual({
      calendar: "none",
      email: "cancelled",
      slack: true,
    });
  });
});
