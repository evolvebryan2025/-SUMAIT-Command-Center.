"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Calendar, DollarSign, Plus, TrendingUp } from "lucide-react";
import { useToast } from "@/providers/toast-provider";
import { useUser } from "@/hooks/use-user";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/ui/select-field";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { capitalize, formatDate } from "@/lib/utils";
import type { Client, ClientEvent, ClientEventType, LifecycleStage } from "@/lib/types";

interface LifecycleTabProps {
  clientId: string;
  client: Client;
  onClientUpdated: () => void;
}

const LIFECYCLE_STAGES: LifecycleStage[] = [
  "prospect",
  "onboarding",
  "active",
  "at_risk",
  "churned",
  "paused",
];

const STAGE_COLORS: Record<string, string> = {
  prospect: "info",
  onboarding: "warning",
  active: "active",
  at_risk: "danger",
  churned: "neutral",
  paused: "neutral",
};

const EVENT_TYPES: ClientEventType[] = [
  "note",
  "meeting",
  "milestone",
  "issue",
  "renewal",
  "health_change",
];

const EVENT_ICONS: Record<string, string> = {
  stage_change: "->",
  health_change: "HP",
  note: "N",
  meeting: "M",
  milestone: "MS",
  issue: "!",
  renewal: "R",
};

export function LifecycleTab({ clientId, client, onClientUpdated }: LifecycleTabProps) {
  const { toast } = useToast();
  const { isAdmin } = useUser();

  const [events, setEvents] = useState<ClientEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [savingStage, setSavingStage] = useState(false);

  // Lifecycle edit
  const [editingLifecycle, setEditingLifecycle] = useState(false);
  const [lcForm, setLcForm] = useState({
    lifecycleStage: client.lifecycle_stage ?? "prospect",
    nextReviewDate: client.next_review_date ?? "",
    monthlyValue: String(client.monthly_value ?? 0),
  });

  // Event form
  const [eventForm, setEventForm] = useState({
    eventType: "note" as ClientEventType,
    title: "",
    description: "",
  });
  const [savingEvent, setSavingEvent] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/clients/${clientId}/events`);
    const data = await res.json();
    if (res.ok) {
      setEvents(data.events ?? []);
    } else {
      console.error("Failed to fetch events:", data.error ?? res.statusText);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    setLcForm({
      lifecycleStage: client.lifecycle_stage ?? "prospect",
      nextReviewDate: client.next_review_date ?? "",
      monthlyValue: String(client.monthly_value ?? 0),
    });
  }, [client]);

  const handleSaveLifecycle = useCallback(async () => {
    setSavingStage(true);
    const res = await fetch(`/api/clients/${clientId}/lifecycle`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lifecycleStage: lcForm.lifecycleStage,
        nextReviewDate: lcForm.nextReviewDate || null,
        monthlyValue: parseFloat(lcForm.monthlyValue) || 0,
      }),
    });
    setSavingStage(false);

    if (res.ok) {
      toast("Lifecycle updated", "success");
      setEditingLifecycle(false);
      onClientUpdated();
      fetchEvents(); // Refresh to show stage change event
    } else {
      const data = await res.json();
      toast(data.error ?? "Failed to update", "error");
    }
  }, [clientId, lcForm, toast, onClientUpdated, fetchEvents]);

  const handleAddEvent = useCallback(async () => {
    if (!eventForm.title.trim()) {
      toast("Title is required", "error");
      return;
    }
    setSavingEvent(true);
    const res = await fetch(`/api/clients/${clientId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: eventForm.eventType,
        title: eventForm.title.trim(),
        description: eventForm.description.trim() || undefined,
      }),
    });
    setSavingEvent(false);

    if (res.ok) {
      toast("Event added", "success");
      setShowEventForm(false);
      setEventForm({ eventType: "note", title: "", description: "" });
      fetchEvents();
    } else {
      const data = await res.json();
      toast(data.error ?? "Failed to add event", "error");
    }
  }, [clientId, eventForm, toast, fetchEvents]);

  const stageOptions = useMemo(
    () => LIFECYCLE_STAGES.map((s) => ({ value: s, label: capitalize(s.replace(/_/g, " ")) })),
    []
  );

  const eventTypeOptions = useMemo(
    () => EVENT_TYPES.map((t) => ({ value: t, label: capitalize(t.replace(/_/g, " ")) })),
    []
  );

  // Stage progress indicator
  const stageIndex = LIFECYCLE_STAGES.indexOf(client.lifecycle_stage ?? "prospect");

  return (
    <div className="space-y-6">
      {/* Lifecycle Stage Card */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--color-text)] flex items-center gap-2">
            <TrendingUp size={20} className="text-[var(--color-primary)]" />
            Client Lifecycle
          </h3>
          {isAdmin && !editingLifecycle && (
            <Button size="sm" variant="ghost" onClick={() => setEditingLifecycle(true)}>
              Edit
            </Button>
          )}
        </div>

        {editingLifecycle ? (
          <div className="space-y-4">
            <SelectField
              label="Lifecycle Stage"
              options={stageOptions}
              value={lcForm.lifecycleStage}
              onChange={(e) => setLcForm((f) => ({ ...f, lifecycleStage: e.target.value as LifecycleStage }))}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Next Review Date"
                type="date"
                value={lcForm.nextReviewDate}
                onChange={(e) => setLcForm((f) => ({ ...f, nextReviewDate: e.target.value }))}
              />
              <Input
                label="Monthly Value ($)"
                type="number"
                value={lcForm.monthlyValue}
                onChange={(e) => setLcForm((f) => ({ ...f, monthlyValue: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={handleSaveLifecycle} disabled={savingStage}>
                {savingStage ? "Saving..." : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingLifecycle(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Stage progress bar */}
            <div className="flex items-center gap-1 mb-4">
              {LIFECYCLE_STAGES.map((stage, i) => (
                <div key={stage} className="flex items-center flex-1">
                  <div
                    className={`h-2 w-full rounded-full transition-colors ${
                      i <= stageIndex
                        ? stage === "at_risk" || stage === "churned"
                          ? "bg-[var(--status-danger)]"
                          : "bg-[var(--color-primary)]"
                        : "bg-[rgba(255,255,255,0.1)]"
                    }`}
                  />
                  {i < LIFECYCLE_STAGES.length - 1 && <ArrowRight size={12} className="text-[var(--color-text-secondary)] mx-0.5 shrink-0" />}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-xs text-[var(--color-text-secondary)] block mb-1">Stage</span>
                <Badge variant={STAGE_COLORS[client.lifecycle_stage ?? "prospect"] as "active" | "warning" | "danger" | "info" | "neutral"}>
                  {capitalize((client.lifecycle_stage ?? "prospect").replace(/_/g, " "))}
                </Badge>
              </div>
              <div>
                <span className="text-xs text-[var(--color-text-secondary)] block mb-1">Monthly Value</span>
                <span className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-1">
                  <DollarSign size={14} />
                  {(client.monthly_value ?? 0).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-xs text-[var(--color-text-secondary)] block mb-1">Next Review</span>
                <span className="text-sm text-[var(--color-text)] flex items-center gap-1">
                  <Calendar size={14} />
                  {client.next_review_date ? formatDate(client.next_review_date) : "Not set"}
                </span>
              </div>
              <div>
                <span className="text-xs text-[var(--color-text-secondary)] block mb-1">Onboarded</span>
                <span className="text-sm text-[var(--color-text)]">
                  {client.onboarded_at ? formatDate(client.onboarded_at) : "—"}
                </span>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Timeline */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--color-text)]">Timeline</h3>
          {isAdmin && !showEventForm && (
            <Button size="sm" onClick={() => setShowEventForm(true)}>
              <Plus size={14} className="mr-1" /> Add Event
            </Button>
          )}
        </div>

        {/* Add event form */}
        {showEventForm && (
          <Card className="mb-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Title *"
                  placeholder="Event title"
                  value={eventForm.title}
                  onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))}
                />
                <SelectField
                  label="Event Type"
                  options={eventTypeOptions}
                  value={eventForm.eventType}
                  onChange={(e) => setEventForm((f) => ({ ...f, eventType: e.target.value as ClientEventType }))}
                />
              </div>
              <Textarea
                label="Description (optional)"
                placeholder="Additional details..."
                value={eventForm.description}
                onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))}
              />
              <div className="flex items-center gap-3">
                <Button size="sm" onClick={handleAddEvent} disabled={savingEvent}>
                  {savingEvent ? "Saving..." : "Add Event"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowEventForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        )}

        {!loading && events.length === 0 && (
          <p className="text-sm text-[var(--color-text-secondary)] text-center py-8">
            No timeline events yet. Add a note, meeting, or milestone to start tracking.
          </p>
        )}

        {!loading && events.length > 0 && (
          <div className="relative pl-8 space-y-0">
            {/* Timeline line */}
            <div className="absolute left-3 top-2 bottom-2 w-px bg-[var(--color-border)]" />

            {events.map((event) => (
              <div key={event.id} className="relative pb-6">
                {/* Dot */}
                <div className="absolute -left-5 top-1 w-6 h-6 rounded-full bg-[var(--color-surface)] border-2 border-[var(--color-border)] flex items-center justify-center">
                  <span className="text-[8px] font-bold text-[var(--color-text-secondary)]">
                    {EVENT_ICONS[event.event_type] ?? "E"}
                  </span>
                </div>
                {/* Content */}
                <div className="ml-4">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-[var(--color-text)]">{event.title}</span>
                    <Badge variant="neutral">{capitalize(event.event_type.replace(/_/g, " "))}</Badge>
                  </div>
                  {event.description && (
                    <p className="text-sm text-[var(--color-text-secondary)]">{event.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-xs text-[var(--color-text-secondary)]">
                    <span>{formatDate(event.created_at)}</span>
                    {event.profiles?.name && <span>by {event.profiles.name}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
