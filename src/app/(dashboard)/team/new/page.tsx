"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmployeeForm } from "@/components/team/employee-form";

export default function NewEmployeePage() {
  const { isAdmin, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push("/team");
    }
  }, [loading, isAdmin, router]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/team">
          <Button size="sm" variant="ghost">&larr; Back to Team</Button>
        </Link>
        <h1 className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-text)]">
          Add Employee
        </h1>
      </div>
      <EmployeeForm onSave={() => router.push("/team")} />
    </div>
  );
}
