"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type {
  AcceptJobResult,
  DeclineReason,
  DispatchOffer,
  JobRequest,
  JobStatus,
  NewJobInput,
  Notification,
  ServiceCategory,
  User,
  CompanyMemberRole,
} from "@/lib/types";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { resolveServiceCategoryId } from "@/lib/service-category";
import { formatRelativeTimestamp } from "@/lib/format-timestamp";
import { formatOperatingHours } from "@/lib/company-display";
import { formatStoredPreferredWindow } from "@/lib/preferred-window";
import { readActingTargetFromDocument, type ActingTarget } from "@/lib/acting-as";

type DatabaseCategory = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  starting_price_cents: number | null;
  is_active: boolean;
};

type DatabaseCompany = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  service_area: string | null;
  operating_hours: unknown;
  verification_status: "pending" | "verified" | "suspended";
  average_rating: number;
  review_count: number;
  is_available: boolean;
  max_concurrent_jobs: number;
  company_services: { service_category_id: string }[] | null;
};

type DatabaseProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  default_address: string | null;
  role: User["role"];
};

type DatabaseRequest = {
  id: string;
  client_id: string;
  service_category_id: string;
  title: string;
  description: string;
  address: string;
  urgency: "standard" | "urgent";
  status: JobStatus;
  estimated_price_cents: number | null;
  created_at: string;
  accepted_company_id: string | null;
  reference_code: string;
  dispatch_phase: JobRequest["dispatchPhase"];
  latitude: number | null;
  longitude: number | null;
  preferred_start_at: string | null;
  preferred_end_at: string | null;
  final_price_cents: number | null;
};

type DatabaseDispatchOffer = {
  id: string;
  service_request_id: string;
  company_id: string;
  status: DispatchOffer["status"];
  exclusive_until: string;
  rank_score: number;
  rank_explanation: { reason?: string; distance_km?: number } | null;
};

type DatabaseNotification = {
  id: string;
  recipient_id: string;
  service_request_id: string | null;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

const CATEGORY_COLORS = [
  "bg-sky-100 text-sky-700",
  "bg-amber-100 text-amber-700",
  "bg-teal-100 text-teal-700",
  "bg-orange-100 text-orange-700",
] as const;

function mapCategory(category: DatabaseCategory, index: number): ServiceCategory {
  return {
    id: category.id,
    name: category.name,
    description: category.description ?? "Trusted local home service",
    icon: category.icon ?? "Wrench",
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    startingPrice: Math.round((category.starting_price_cents ?? 0) / 100),
    active: category.is_active,
  };
}

function mapRequest(request: DatabaseRequest): JobRequest {
  return {
    id: request.id,
    userId: request.client_id,
    categoryId: request.service_category_id,
    title: request.title,
    description: request.description,
    address: request.address,
    preferredDate: formatStoredPreferredWindow(request.preferred_start_at, request.preferred_end_at),
    urgency: request.urgency,
    status: request.status,
    budget: Math.round((request.estimated_price_cents ?? 0) / 100),
    createdAt: formatRelativeTimestamp(request.created_at),
    companyId: request.accepted_company_id ?? undefined,
    referenceCode: request.reference_code,
    dispatchPhase: request.dispatch_phase,
    latitude: request.latitude,
    longitude: request.longitude,
    preferredStartAt: request.preferred_start_at,
    preferredEndAt: request.preferred_end_at,
    finalPriceCents: request.final_price_cents,
  };
}

function mapCompany(company: DatabaseCompany) {
  return {
    id: company.id,
    name: company.name,
    initials: company.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    rating: Number(company.average_rating),
    reviewCount: company.review_count,
    services: company.company_services?.map((service) => service.service_category_id) ?? [],
    verified: company.verification_status === "verified",
    responseTime: "Typically 30 min",
    phone: company.phone ?? "Contact unavailable",
    description: company.description,
    serviceArea: company.service_area,
    operatingHours: formatOperatingHours(company.operating_hours),
    email: company.email,
    isAvailable: company.is_available,
    maxConcurrentJobs: company.max_concurrent_jobs,
    ownerId: company.owner_id,
  };
}

function mapProfile(profile: DatabaseProfile): User {
  return {
    id: profile.id,
    name: profile.full_name?.trim() || "HomeFix user",
    email: profile.email?.trim() || "",
    phone: profile.phone?.trim() || "",
    role: profile.role,
    address: profile.default_address?.trim() || "",
  };
}

export interface AppContextValue {
  jobs: JobRequest[];
  categories: ServiceCategory[];
  companies: ReturnType<typeof mapCompany>[];
  users: User[];
  currentPartnerCompanyId: string | null;
  companyMembers: { companyId: string; userId: string; role: CompanyMemberRole }[];
  /** Company role for the signed-in partner, or for the person a superadmin is viewing as. */
  companyRole: CompanyMemberRole | null;
  partnerOnline: boolean;
  setPartnerOnline: (value: boolean) => Promise<void>;
  createJob: (input: NewJobInput) => Promise<JobRequest>;
  acceptJob: (jobId: string, companyId: string, offerId?: string) => Promise<AcceptJobResult>;
  respondToOffer: (
    offerId: string,
    action: "accept" | "decline",
    declineReason?: DeclineReason,
  ) => Promise<AcceptJobResult | { status: "declined" }>;
  updateJobStatus: (jobId: string, status: JobStatus) => Promise<void>;
  offers: DispatchOffer[];
  notifications: Notification[];
  markNotificationRead: (id: string) => Promise<void>;
  setCategoryActive: (categoryId: string, active: boolean) => Promise<void>;
  dataReady: boolean;
  actingAs: ActingTarget | null;
  /** Jobs the current homeowner screen should show. All jobs unless a superadmin is acting as a client. */
  viewerJobs: JobRequest[];
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<JobRequest[]>([]);
  const jobsRef = useRef<JobRequest[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [serviceCompanies, setServiceCompanies] = useState<ReturnType<typeof mapCompany>[]>([]);
  const [platformUsers, setPlatformUsers] = useState<User[]>([]);
  const [currentPartnerCompanyId, setCurrentPartnerCompanyId] = useState<string | null>(null);
  const [companyMembers, setCompanyMembers] = useState<AppContextValue["companyMembers"]>([]);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [offers, setOffers] = useState<DispatchOffer[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dataReady, setDataReady] = useState(!isSupabaseConfigured);
  const [actingAs, setActingAs] = useState<ActingTarget | null>(null);
  const actingRef = useRef<ActingTarget | null>(null);
  const ownedCompanyIdRef = useRef<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    const loadLiveData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const [
        { data: categoryData, error: categoryError },
        { data: companyData },
        { data: requestData, error: requestError },
        { data: profileData },
        { data: memberData },
      ] = await Promise.all([
        supabase
          .from("service_categories")
          .select("id, name, description, icon, starting_price_cents, is_active")
          .order("name"),
        supabase
          .from("companies")
          .select(
            "id, owner_id, name, description, phone, email, service_area, operating_hours, verification_status, average_rating, review_count, is_available, max_concurrent_jobs, company_services(service_category_id)",
          ),
        supabase
          .from("service_requests")
          .select(
            "id, reference_code, client_id, service_category_id, title, description, address, latitude, longitude, preferred_start_at, preferred_end_at, urgency, status, dispatch_phase, estimated_price_cents, final_price_cents, created_at, accepted_company_id",
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("id, email, full_name, phone, default_address, role")
          .order("full_name"),
        supabase.from("company_members").select("company_id, user_id, role"),
      ]);
      if (!categoryError && categoryData) {
        setServiceCategories((categoryData as DatabaseCategory[]).map(mapCategory));
      }
      if (companyData) {
        const rows = companyData as unknown as DatabaseCompany[];
        const mappedCompanies = rows.map(mapCompany);
        setServiceCompanies(mappedCompanies);
        const acting = readActingTargetFromDocument();
        actingRef.current = acting;
        setActingAs(acting);
        const memberRows = (memberData ?? []) as { company_id: string; user_id: string; role: CompanyMemberRole }[];
        setSessionUserId(user?.id ?? null);
        setCompanyMembers(memberRows.map((member) => ({
          companyId: member.company_id,
          userId: member.user_id,
          role: member.role,
        })));
        const membership = memberRows.find((member) => member.user_id === user?.id);
        const ownedCompany = rows.find((company) => company.id === membership?.company_id);
        ownedCompanyIdRef.current = ownedCompany?.id ?? null;
        if (acting?.role === "partner" && acting.companyId) {
          const company = rows.find((item) => item.id === acting.companyId);
          setCurrentPartnerCompanyId(acting.companyId);
          setPartnerOnline(company?.is_available ?? false);
        } else {
          setCurrentPartnerCompanyId(ownedCompany?.id ?? null);
          setPartnerOnline(ownedCompany?.is_available ?? false);
        }
      }
      if (!requestError && requestData) {
        const mappedRequests = (requestData as unknown as DatabaseRequest[]).map(mapRequest);
        jobsRef.current = mappedRequests;
        setJobs(mappedRequests);
      }
      if (profileData) {
        setPlatformUsers((profileData as DatabaseProfile[]).map(mapProfile));
      }
      if (user) {
        const [{ data: offerData }, { data: notificationData }] = await Promise.all([
          supabase
            .from("dispatch_offers")
            .select("id, service_request_id, company_id, status, exclusive_until, rank_score, rank_explanation")
            .in("status", ["pending", "viewed"])
            .order("exclusive_until"),
          supabase
            .from("notifications")
            .select("id, recipient_id, service_request_id, title, body, read_at, created_at")
            .eq("recipient_id", user.id)
            .order("created_at", { ascending: false })
            .limit(30),
        ]);
        if (offerData) {
          setOffers(
            (offerData as DatabaseDispatchOffer[]).map((offer) => {
              const explanation = offer.rank_explanation;
              return {
                id: offer.id,
                jobId: offer.service_request_id,
                companyId: offer.company_id,
                status: offer.status as DispatchOffer["status"],
                exclusiveUntil: offer.exclusive_until,
                rankScore: Number(offer.rank_score),
                reason: explanation?.reason,
                distanceKm: explanation?.distance_km ?? null,
              };
            }),
          );
        }
        if (notificationData) {
          setNotifications(
            (notificationData as DatabaseNotification[]).map((notification) => ({
              id: notification.id,
              userId: notification.recipient_id,
              jobId: notification.service_request_id ?? "",
              title: notification.title,
              body: notification.body,
              read: Boolean(notification.read_at),
              createdAt: formatRelativeTimestamp(notification.created_at),
            })),
          );
        }
      }
      setDataReady(true);
    };
    void loadLiveData();
    const channel = supabase
      .channel("service-request-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests" }, () =>
        void loadLiveData(),
      )
      .subscribe();
    const dispatchChannel = supabase
      .channel("dispatch-offer-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "dispatch_offers" }, () =>
        void loadLiveData(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () =>
        void loadLiveData(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "job_assignments" }, () =>
        void loadLiveData(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => void loadLiveData())
      .on("postgres_changes", { event: "*", schema: "public", table: "companies" }, () => void loadLiveData())
      .on("postgres_changes", { event: "*", schema: "public", table: "company_members" }, () => void loadLiveData())
      .on("postgres_changes", { event: "*", schema: "public", table: "service_categories" }, () =>
        void loadLiveData(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
      void supabase.removeChannel(dispatchChannel);
    };
  }, []);

  useEffect(() => {
    const next = readActingTargetFromDocument();
    actingRef.current = next;
    setActingAs(next);
  }, [pathname]);

  useEffect(() => {
    if (actingAs?.role === "partner" && actingAs.companyId) {
      const company = serviceCompanies.find((item) => item.id === actingAs.companyId);
      setCurrentPartnerCompanyId(actingAs.companyId);
      setPartnerOnline(Boolean(company?.isAvailable));
      return;
    }
    if (!dataReady || actingAs) return;
    const ownedId = ownedCompanyIdRef.current;
    const company = serviceCompanies.find((item) => item.id === ownedId);
    setCurrentPartnerCompanyId(ownedId);
    setPartnerOnline(Boolean(company?.isAvailable));
  }, [actingAs, serviceCompanies, dataReady]);

  const createJob = useCallback(
    async (input: NewJobInput) => {
      const resolvedCategoryId = resolveServiceCategoryId(serviceCategories, input.categoryId);
      let category = serviceCategories.find((item) => item.id === resolvedCategoryId);
      if (!category) throw new Error("Select a valid service category.");
      const supabase = createClient();
      if (supabase && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(category.id)) {
        const { data: liveCategory, error: categoryError } = await supabase
          .from("service_categories")
          .select("id, name, description, icon, starting_price_cents, is_active")
          .ilike("name", category.name)
          .eq("is_active", true)
          .maybeSingle();
        if (categoryError || !liveCategory) {
          throw new Error("The selected service is unavailable. Please choose it again.");
        }
        category = {
          id: liveCategory.id,
          name: liveCategory.name,
          description: liveCategory.description ?? category.description,
          icon: liveCategory.icon ?? category.icon,
          color: category.color,
          startingPrice: Math.round((liveCategory.starting_price_cents ?? 0) / 100),
          active: liveCategory.is_active,
        };
      }
      if (!supabase) throw new Error("Sign in to send a request.");

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in to send a request.");
      const actingClientId = actingRef.current?.role === "client" ? actingRef.current.userId : null;
      const insertPayload = {
        client_id: actingClientId ?? user.id,
        service_category_id: category.id,
        title: `${category.name} request`,
        description: input.description,
        address: input.address,
        urgency: input.urgency,
        estimated_price_cents: Math.round(category.startingPrice * 100),
        latitude: input.latitude,
        longitude: input.longitude,
        preferred_start_at: input.preferredStartAt,
        preferred_end_at: input.preferredEndAt,
      };
      const { data, error } = actingClientId
        ? await supabase.rpc("superadmin_create_service_request", {
            p_client_id: actingClientId,
            p_service_category_id: category.id,
            p_title: insertPayload.title,
            p_description: input.description,
            p_address: input.address,
            p_urgency: input.urgency,
            p_estimated_price_cents: insertPayload.estimated_price_cents,
            p_latitude: input.latitude,
            p_longitude: input.longitude,
            p_preferred_start_at: input.preferredStartAt,
            p_preferred_end_at: input.preferredEndAt,
          })
        : await supabase
            .from("service_requests")
            .insert(insertPayload)
            .select(
              "id, reference_code, client_id, service_category_id, title, description, address, latitude, longitude, preferred_start_at, preferred_end_at, urgency, status, dispatch_phase, estimated_price_cents, final_price_cents, created_at, accepted_company_id",
            )
            .single();
      if (error || !data) throw new Error(error?.message ?? "Unable to send request.");

      const created = mapRequest(data as unknown as DatabaseRequest);
      jobsRef.current = [created, ...jobsRef.current];
      setJobs(jobsRef.current);
      return created;
    },
    [serviceCategories],
  );

  const acceptJob = useCallback(
    async (jobId: string, companyId: string, offerId?: string): Promise<AcceptJobResult> => {
      const current = jobsRef.current.find((job) => job.id === jobId);
      if (!current || current.status !== "open") return { status: "already_claimed" };
      const company = serviceCompanies.find((item) => item.id === companyId);
      if (!company?.services.includes(current.categoryId)) return { status: "not_eligible" };
      const supabase = createClient();
      if (supabase) {
        const { data, error } = await supabase.rpc("claim_dispatch_request", {
          p_request_id: jobId,
          p_offer_id: offerId ?? null,
          p_company_id: actingRef.current?.role === "partner" ? actingRef.current.companyId : null,
        });
        const status = (data as { status?: string } | null)?.status;
        if (error) {
          return { status: "error", message: error.message };
        }
        if (status !== "assigned") {
          if (status === "offline") return { status: "offline" };
          if (status === "offer_expired") return { status: "offer_expired" };
          if (status === "not_eligible") return { status: "not_eligible" };
          if (status === "already_claimed") return { status: "already_claimed" };
          return { status: "error", message: `Claim failed (${status ?? "unknown"}).` };
        }
      }
      const updated = {
        ...current,
        status: "assigned" as const,
        companyId,
        dispatchPhase: "assigned" as const,
      };
      jobsRef.current = jobsRef.current.map((job) => (job.id === jobId ? updated : job));
      setJobs(jobsRef.current);
      return { status: "success", job: updated };
    },
    [serviceCompanies],
  );

  const respondToOffer = useCallback(
    async (offerId: string, action: "accept" | "decline", declineReason?: DeclineReason) => {
      const supabase = createClient();
      const offer = offers.find((item) => item.id === offerId);
      if (!offer || !supabase) return { status: "not_eligible" as const };
      if (action === "accept") return acceptJob(offer.jobId, offer.companyId, offer.id);
      const { data, error } = await supabase.rpc("respond_to_dispatch_offer", {
        p_offer_id: offerId,
        p_action: "decline",
        p_decline_reason: declineReason ?? null,
        p_company_id: actingRef.current?.role === "partner" ? actingRef.current.companyId : null,
      });
      if (error || (data as { status?: string } | null)?.status !== "declined") {
        return { status: "offer_expired" as const };
      }
      setOffers((current) => current.filter((item) => item.id !== offerId));
      return { status: "declined" as const };
    },
    [acceptJob, offers],
  );

  const updateJobStatus = useCallback(async (jobId: string, status: JobStatus) => {
    const supabase = createClient();
    if (supabase) {
      const acting = actingRef.current;
      const { error } = await supabase.rpc("update_service_request_status", {
        p_request_id: jobId,
        p_status: status,
        p_note: null,
        p_company_id: acting?.role === "partner" ? acting.companyId : null,
        p_client_id: acting?.role === "client" ? acting.userId : null,
      });
      if (error) throw new Error(error.message);
    }
    jobsRef.current = jobsRef.current.map((job) => (job.id === jobId ? { ...job, status } : job));
    setJobs(jobsRef.current);
  }, []);

  const setAvailability = useCallback(
    async (value: boolean) => {
      const supabase = createClient();
      if (supabase) {
        const { error } = await supabase.rpc("set_company_availability", {
          p_available: value,
          p_company_id: actingRef.current?.role === "partner" ? actingRef.current.companyId : null,
        });
        if (error) throw new Error(error.message);
      }
      setPartnerOnline(value);
      const targetId = actingRef.current?.role === "partner" && actingRef.current.companyId
        ? actingRef.current.companyId
        : currentPartnerCompanyId;
      setServiceCompanies((all) =>
        all.map((company) => (company.id === targetId ? { ...company, isAvailable: value } : company)),
      );
    },
    [currentPartnerCompanyId],
  );

  const markNotificationRead = useCallback(async (id: string) => {
    const supabase = createClient();
    if (supabase) {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    }
    setNotifications((all) =>
      all.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    );
  }, []);

  const setCategoryActive = useCallback(async (categoryId: string, active: boolean) => {
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase
        .from("service_categories")
        .update({ is_active: active })
        .eq("id", categoryId);
      if (error) throw new Error(error.message);
    }
    setServiceCategories((all) =>
      all.map((category) => (category.id === categoryId ? { ...category, active } : category)),
    );
  }, []);

  const viewerJobs = useMemo(
    () => (actingAs?.role === "client" ? jobs.filter((job) => job.userId === actingAs.userId) : jobs),
    [actingAs, jobs],
  );
  const actingCompany = actingAs?.role === "partner" && actingAs.companyId
    ? serviceCompanies.find((company) => company.id === actingAs.companyId)
    : undefined;
  const partnerCompanyId = actingCompany?.id ?? currentPartnerCompanyId;
  const partnerIsOnline = actingCompany ? Boolean(actingCompany.isAvailable) : partnerOnline;
  const companyRole = useMemo(() => {
    const subjectId = actingAs?.role === "partner" ? actingAs.userId : sessionUserId;
    if (!subjectId || !partnerCompanyId) return null;
    return companyMembers.find((member) => member.userId === subjectId && member.companyId === partnerCompanyId)?.role ?? null;
  }, [actingAs, companyMembers, partnerCompanyId, sessionUserId]);

  const value = useMemo(
    () => ({
      jobs,
      viewerJobs,
      categories: serviceCategories,
      companies: serviceCompanies,
      users: platformUsers,
      currentPartnerCompanyId: partnerCompanyId,
      companyMembers,
      companyRole,
      partnerOnline: partnerIsOnline,
      setPartnerOnline: setAvailability,
      createJob,
      acceptJob,
      respondToOffer,
      updateJobStatus,
      offers,
      notifications,
      markNotificationRead,
      setCategoryActive,
      dataReady,
      actingAs,
    }),
    [
      jobs,
      viewerJobs,
      serviceCategories,
      serviceCompanies,
      platformUsers,
      companyMembers,
      companyRole,
      partnerCompanyId,
      partnerIsOnline,
      createJob,
      acceptJob,
      respondToOffer,
      updateJobStatus,
      offers,
      notifications,
      markNotificationRead,
      setCategoryActive,
      dataReady,
      actingAs,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used within AppProvider");
  return value;
}

/** Static marketplace snapshot for portfolio / marketing previews (no Supabase). */
export function AppProviderPortfolioHarness({
  value,
  children,
}: {
  value: AppContextValue;
  children: React.ReactNode;
}) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
