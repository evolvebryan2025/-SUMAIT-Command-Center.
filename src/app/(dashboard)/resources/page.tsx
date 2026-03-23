"use client";

import { ResourceHub } from "@/components/resources/resource-hub";

export default function ResourcesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-text)] mb-2">
        Resource Hub
      </h1>
      <p className="text-[var(--color-text-secondary)] mb-6">
        All client deliverables, tools, and deployments in one place.
      </p>
      <ResourceHub />
    </div>
  );
}
