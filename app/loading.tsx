import { Wrench } from "lucide-react";

export default function Loading() {
  return (
    <main
      id="main-content"
      className="grid min-h-dvh place-items-center bg-background px-5 text-foreground"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col items-center text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <Wrench className="size-6 animate-spin" aria-hidden="true" />
        </span>
        <p className="mt-4 font-semibold">Loading HomeFix…</p>
        <p className="mt-1 text-sm text-muted-foreground">Getting your workspace ready.</p>
      </div>
    </main>
  );
}
