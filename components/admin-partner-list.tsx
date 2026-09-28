"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function AdminPartnerList() {
  const { companies, users, dataReady } = useApp();
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return companies;
    return companies.filter((company) => {
      const owner = users.find((user) => user.id === company.ownerId);
      return `${company.name} ${company.email ?? ""} ${owner?.name ?? ""} ${owner?.email ?? ""}`.toLowerCase().includes(value);
    });
  }, [companies, query, users]);

  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-teal-700">Marketplace partners</p>
          <h2 className="mt-1 text-xl font-bold">Partner companies</h2>
          <p className="mt-1 text-sm text-slate-500">View active companies and the partner linked to each one.</p>
        </div>
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 bg-white pl-9" placeholder="Search partners…" aria-label="Search partner companies" />
        </div>
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Partner</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Availability</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {dataReady && visible.map((company) => {
              const owner = users.find((user) => user.id === company.ownerId);
              return (
                <tr key={company.id} className="cursor-pointer hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <Link href={`/admin/partners/${company.id}`} className="block font-semibold text-slate-900 focus-visible:outline-none focus-visible:text-teal-700">
                      {company.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">{company.email || "No email on file"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{owner?.name ?? "Partner pending"}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{owner?.email || "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={company.verified ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}>
                      {company.verified ? "Verified" : "Review needed"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{company.isAvailable ? "On duty" : "Off duty"}</td>
                </tr>
              );
            })}
            {!dataReady && <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">Loading partners…</td></tr>}
            {dataReady && !visible.length && <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">No partner companies found.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
