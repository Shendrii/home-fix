export type Role = "client" | "partner" | "admin" | "superadmin";
export type CompanyMemberRole = "admin" | "staff";
export type JobStatus =
  | "open"
  | "assigned"
  | "scheduled"
  | "en_route"
  | "in_progress"
  | "completed"
  | "cancelled";
export type DispatchPhase =
  | "qualifying"
  | "exclusive_offers"
  | "broadcast"
  | "assigned"
  | "cancelled";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  address: string;
}

export interface Company {
  id: string;
  name: string;
  initials: string;
  rating: number;
  reviewCount: number;
  services: string[];
  verified: boolean;
  responseTime: string;
  phone: string;
  description?: string | null;
  serviceArea?: string | null;
  operatingHours?: string | null;
  email?: string | null;
  isAvailable?: boolean;
  maxConcurrentJobs?: number;
}

export interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  startingPrice: number;
  active: boolean;
}

export interface JobRequest {
  id: string;
  userId: string;
  categoryId: string;
  title: string;
  description: string;
  address: string;
  preferredDate: string;
  urgency: "standard" | "urgent";
  status: JobStatus;
  budget: number;
  createdAt: string;
  companyId?: string;
  referenceCode?: string;
  dispatchPhase?: DispatchPhase;
  latitude?: number | null;
  longitude?: number | null;
  preferredStartAt?: string | null;
  preferredEndAt?: string | null;
  /** Settled amount, set once the job is marked completed. Null until then — do not treat `budget` as this. */
  finalPriceCents?: number | null;
}

export interface DispatchOffer {
  id: string;
  jobId: string;
  companyId: string;
  status: "pending" | "viewed" | "accepted" | "declined" | "expired" | "superseded";
  exclusiveUntil: string;
  rankScore: number;
  reason?: string;
  distanceKm?: number | null;
}

export type DeclineReason = "too_far" | "wrong_category" | "unavailable" | "other";

export interface Assignment {
  id: string;
  jobId: string;
  companyId: string;
  technicianName: string;
  scheduledFor: string;
  acceptedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  jobId?: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface Review {
  id: string;
  jobId: string;
  userId: string;
  companyId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface NewJobInput {
  categoryId: string;
  description: string;
  address: string;
  preferredDate: string;
  urgency: "standard" | "urgent";
  latitude: number;
  longitude: number;
  preferredStartAt: string;
  preferredEndAt: string;
}

export type AcceptJobResult =
  | { status: "success"; job: JobRequest }
  | { status: "already_claimed" }
  | { status: "not_eligible" }
  | { status: "offer_expired" }
  | { status: "offline" }
  | { status: "error"; message: string };
