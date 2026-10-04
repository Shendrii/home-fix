import type { JobStatus } from "@/lib/types";

export type JobStatusAutomation = {
  calendar: "create" | "none";
  email: "scheduled" | "cancelled" | "none";
  slack: boolean;
};

/** What the Make scenario does after HomeFix reports a job status change. */
export function automationForJobStatus(status: JobStatus): JobStatusAutomation {
  switch (status) {
    case "assigned":
    case "scheduled":
      return { calendar: "create", email: "scheduled", slack: true };
    case "cancelled":
      return { calendar: "none", email: "cancelled", slack: true };
    case "completed":
      return { calendar: "none", email: "none", slack: true };
    default:
      return { calendar: "none", email: "none", slack: false };
  }
}
