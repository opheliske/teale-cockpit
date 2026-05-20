"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { impersonationStore } from "@/lib/impersonation-store";

export default function ClientGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (impersonationStore.get()) {
      setAllowed(true);
    } else {
      router.replace("/csm");
    }
  }, [router]);

  if (!allowed) return null;
  return <>{children}</>;
}
