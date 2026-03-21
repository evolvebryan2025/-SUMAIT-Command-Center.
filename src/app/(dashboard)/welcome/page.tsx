"use client";

import { Walkthrough } from "@/components/onboarding/walkthrough";

export default function WelcomePage() {
  return (
    <div className="py-8">
      <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--color-text)] text-center mb-8">
        Welcome to Command Center
      </h1>
      <Walkthrough />
    </div>
  );
}
