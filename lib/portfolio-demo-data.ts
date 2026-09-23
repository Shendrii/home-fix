import type { AppContextValue } from "@/components/app-provider";
import type { DispatchOffer, JobRequest, ServiceCategory, User } from "@/lib/types";

const DEMO_COMPANY_ID = "portfolio-co-metrofix";
const DEMO_CATEGORY = "portfolio-cat-hvac";

const noopAsync = async () => {};

const demoCompany: AppContextValue["companies"][number] = {
  id: DEMO_COMPANY_ID,
  name: "MetroFix Pro",
  initials: "MP",
  rating: 4.9,
  reviewCount: 156,
  services: [DEMO_CATEGORY, "portfolio-cat-plumbing"],
  verified: true,
  responseTime: "~45 min",
  phone: "+63 917 555 0101",
  description: "Licensed HVAC and home repair across Batangas.",
  serviceArea: "Batangas",
  operatingHours: null,
  email: "ops@metrofix.pro",
  isAvailable: true,
  maxConcurrentJobs: 5,
  ownerId: "portfolio-partner",
};

const demoCategories: ServiceCategory[] = [
  {
    id: DEMO_CATEGORY,
    name: "Heating & AC",
    description: "Cooling and ventilation service",
    icon: "snowflake",
    color: "teal",
    startingPrice: 119,
    active: true,
  },
  {
    id: "portfolio-cat-plumbing",
    name: "Plumbing",
    description: "Leaks, clogs, and fixtures",
    icon: "wrench",
    color: "teal",
    startingPrice: 89,
    active: true,
  },
];

const priorityJob: JobRequest = {
  id: "portfolio-job-priority",
  userId: "portfolio-client",
  categoryId: DEMO_CATEGORY,
  title: "AC not cooling — bedroom unit",
  description: "Unit blows warm air after a power outage. Tenant available all afternoon.",
  address: "San Pioquinto, Malvar, Batangas, Philippines",
  preferredDate: "Today · 2:00 PM – 4:00 PM",
  urgency: "urgent",
  status: "open",
  budget: 149,
  createdAt: "12 min ago",
  dispatchPhase: "exclusive_offers",
  referenceCode: "HF-A91C2E",
  latitude: 14.045,
  longitude: 121.158,
};

const broadcastJobs: JobRequest[] = [
  {
    id: "portfolio-job-b1",
    userId: "portfolio-client-2",
    categoryId: "portfolio-cat-plumbing",
    title: "Kitchen sink slow drain",
    description: "Water pools in the basin; no known blockages below.",
    address: "Sto. Tomas, Batangas, Philippines",
    preferredDate: "Wed · 9:00 AM – 11:00 AM",
    urgency: "standard",
    status: "open",
    budget: 95,
    createdAt: "28 min ago",
    dispatchPhase: "broadcast",
    referenceCode: "HF-B33F01",
  },
  {
    id: "portfolio-job-b2",
    userId: "portfolio-client-3",
    categoryId: DEMO_CATEGORY,
    title: "Annual AC maintenance",
    description: "Two split-type units, filter clean and coolant check.",
    address: "Lipa City, Batangas, Philippines",
    preferredDate: "Fri · 1:00 PM – 3:00 PM",
    urgency: "standard",
    status: "open",
    budget: 179,
    createdAt: "1 hr ago",
    dispatchPhase: "broadcast",
    referenceCode: "HF-C77A19",
  },
];

const clientJob: JobRequest = {
  id: "portfolio-job-detail",
  userId: "portfolio-client",
  categoryId: DEMO_CATEGORY,
  title: "Heating & AC service visit",
  description: "Master bedroom split-type unit not cooling; breaker was reset yesterday.",
  address: "Sto. Tomas Municipal Hall Rd, Santo Tomas, Batangas, Philippines",
  preferredDate: "Fri, Aug 7 · 9:00 AM – 11:00 AM",
  urgency: "standard",
  status: "scheduled",
  budget: 119,
  createdAt: "Yesterday",
  companyId: DEMO_COMPANY_ID,
  dispatchPhase: "assigned",
  referenceCode: "HF-BD725F3A",
  latitude: 14.108,
  longitude: 121.141,
};

const demoUsers: User[] = [
  {
    id: "portfolio-client",
    name: "Maria Santos",
    email: "maria@example.com",
    phone: "+63 917 000 0001",
    role: "client",
    address: "Santo Tomas, Batangas",
  },
];

function baseContext(partial: Partial<AppContextValue>): AppContextValue {
  return {
    jobs: [],
    categories: demoCategories,
    companies: [demoCompany],
    users: demoUsers,
    currentPartnerCompanyId: DEMO_COMPANY_ID,
    partnerOnline: true,
    setPartnerOnline: noopAsync,
    createJob: async () => clientJob,
    acceptJob: async () => ({ status: "success" as const, job: clientJob }),
    respondToOffer: async () => ({ status: "success" as const, job: clientJob }),
    updateJobStatus: noopAsync,
    offers: [],
    notifications: [],
    markNotificationRead: noopAsync,
    setCategoryActive: noopAsync,
    dataReady: true,
    actingAs: null,
    viewerJobs: partial.viewerJobs ?? partial.jobs ?? [],
    ...partial,
  };
}

export function portfolioPartnerAppContext(): AppContextValue {
  const exclusiveUntil = new Date(Date.now() + 90_000).toISOString();
  const offers: DispatchOffer[] = [
    {
      id: "portfolio-offer-1",
      jobId: priorityJob.id,
      companyId: DEMO_COMPANY_ID,
      status: "pending",
      exclusiveUntil,
      rankScore: 0.92,
      reason: "Verified match · 4.2 km",
      distanceKm: 4.2,
    },
  ];

  return baseContext({
    jobs: [priorityJob, ...broadcastJobs],
    offers,
    currentPartnerCompanyId: DEMO_COMPANY_ID,
    partnerOnline: true,
  });
}

export function portfolioClientJobContext(): AppContextValue {
  return baseContext({
    jobs: [clientJob],
    currentPartnerCompanyId: null,
    partnerOnline: false,
  });
}

export const PORTFOLIO_CLIENT_PROFILE = {
  id: "portfolio-client",
  full_name: "Maria Santos",
  role: "client" as const,
  phone: "+63 917 000 0001",
  default_address: "Santo Tomas, Batangas, Philippines",
  email: "maria@example.com",
};

export const PORTFOLIO_PARTNER_PROFILE = {
  id: "portfolio-partner",
  full_name: "Alex Rivera",
  role: "partner" as const,
  phone: "+63 917 555 0101",
  default_address: "Malvar, Batangas, Philippines",
  email: "alex@metrofix.pro",
};

export const PORTFOLIO_ADMIN_PROFILE = {
  id: "portfolio-admin",
  full_name: "Jordan Reyes",
  role: "admin" as const,
  phone: "+63 917 000 0100",
  default_address: "Lipa City, Batangas, Philippines",
  email: "ops@homefix.app",
};

export function portfolioAdminAppContext(): AppContextValue {
  return baseContext({
    currentPartnerCompanyId: null,
    partnerOnline: false,
  });
}
