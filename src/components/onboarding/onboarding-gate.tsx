"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/hooks/use-user";

interface OnboardingGateProps {
  readonly children: React.ReactNode;
}

export function OnboardingGate({ children }: OnboardingGateProps) {
  const { profile, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const isWelcomePage = pathname === "/welcome";
  const needsOnboarding =
    !loading &&
    profile !== null &&
    profile.role === "member" &&
    profile.onboarded_at === null;

  useEffect(() => {
    if (needsOnboarding && !isWelcomePage) {
      router.push("/welcome");
    }
  }, [needsOnboarding, isWelcomePage, router]);

  // While loading, render children to avoid flash
  if (loading) {
    return <>{children}</>;
  }

  // If needs onboarding but not on welcome page, render nothing while redirecting
  if (needsOnboarding && !isWelcomePage) {
    return null;
  }

  return <>{children}</>;
}
