"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { REPORT_TYPES, REPORT_TYPE_LABELS } from "@/lib/constants";
import type { Client, Profile, GeneratedReport, DevKit } from "@/lib/types";

interface ReportGeneratorProps {
  onGenerated: (report: GeneratedReport) => void;
}

export function ReportGenerator({ onGenerated }: ReportGeneratorProps) {
  const [type, setType] = useState<string>(REPORT_TYPES[0]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [devKits, setDevKits] = useState<DevKit[]>([]);
  const [devKitId, setDevKitId] = useState("");
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const supabase = createClient();
    async function loadOptions() {
      const [clientRes, empRes, devKitRes] = await Promise.all([
        supabase.from("clients").select("id, name, company").order("name"),
        supabase.from("profiles").select("id, name, email").eq("is_active", true).order("name"),
        supabase.from("dev_kits").select("id, name").order("name"),
      ]);
      setClients((clientRes.data as Client[]) || []);
      setEmployees((empRes.data as Profile[]) || []);
      setDevKits((devKitRes.data as DevKit[]) || []);
    }
    loadOptions();
  }, []);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    const parameters: Record<string, string> = {};

    switch (type) {
      case "morning_brief":
        parameters.date = date;
        break;
      case "client_report":
        parameters.clientId = clientId;
        break;
      case "employee_report":
        parameters.employeeId = employeeId;
        break;
      case "team_performance":
        parameters.startDate = startDate;
        parameters.endDate = endDate;
        break;
    }

    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, parameters, devKitId: devKitId || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        onGenerated(data);
      }
    } finally {
      setLoading(false);
    }
  }, [type, date, clientId, employeeId, startDate, endDate, devKitId, onGenerated]);

  const typeOptions = REPORT_TYPES.map((t) => ({ value: t, label: REPORT_TYPE_LABELS[t] }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Report</CardTitle>
      </CardHeader>
      <div className="space-y-4">
        <SelectField
          label="Report Type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={typeOptions}
        />

        {type === "morning_brief" && (
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        )}

        {type === "client_report" && (
          <SelectField
            label="Client"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            options={[
              { value: "", label: "Select client..." },
              ...clients.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        )}

        {type === "employee_report" && (
          <SelectField
            label="Employee"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            options={[
              { value: "", label: "Select employee..." },
              ...employees.map((e) => ({ value: e.id, label: e.name })),
            ]}
          />
        )}

        {type === "team_performance" && (
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        )}

        <SelectField
          label="Theme"
          value={devKitId}
          onChange={(e) => setDevKitId(e.target.value)}
          options={[
            { value: "", label: "Default (SUMAIT AI)" },
            ...devKits.map((dk) => ({ value: dk.id, label: dk.name })),
          ]}
        />

        <Button onClick={handleGenerate} disabled={loading} className="w-full">
          {loading ? "Generating..." : "Generate Report"}
        </Button>
      </div>
    </Card>
  );
}
