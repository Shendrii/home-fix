import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return <main id="main-content" className="grid min-h-dvh place-items-center bg-background p-5 text-center"><div><p className="font-semibold text-primary">Access restricted</p><h1 className="mt-2 text-3xl font-bold text-balance">You don’t have access to this workspace.</h1><Button className="mt-6" render={<Link href="/dashboard" />}>Go to dashboard</Button></div></main>;
}
