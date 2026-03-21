"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmployeeDetail } from "@/components/team/employee-detail";

export default function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/team">
          <Button size="sm" variant="ghost">&larr; Back to Team</Button>
        </Link>
        <h1 className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-text)]">
          Employee Details
        </h1>
      </div>
      <EmployeeDetail employeeId={id} />
    </div>
  );
}
