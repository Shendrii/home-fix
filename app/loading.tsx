import { Wrench } from "lucide-react";

export default function Loading() {
  return (
    <main
      className="grid min-h-dvh place-items-center bg-[#faf8f3] px-5 text-slate-950"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col items-center text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-900/10">
          <Wrench className="size-6 animate-spin" aria-hidden="true" />
        </span>
        <p className="mt-4 font-semibold">Loading HomeFix…</p>
        <p className="mt-1 text-sm text-slate-500">Getting your workspace ready.</p>
      </div>
    </main>
  );
}
