"use client";

import Link from "next/link";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmployeeList } from "@/components/team/employee-list";

export default function TeamPage() {
  const { isAdmin, loading } = useUser();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-text)]">
          Team
        </h1>
        {loading ? (
          <Skeleton className="h-9 w-32" />
        ) : isAdmin ? (
          <Link href="/team/new">
            <Button size="sm">Add Employee</Button>
          </Link>
        ) : null}
      </div>
      <EmployeeList />
    </div>
  );
}
