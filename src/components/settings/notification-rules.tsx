"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/providers/toast-provider";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Plus, X } from "lucide-react";

const RULE_TYPE_LABELS: Record<string, string> = {
  task_overdue_days: "Task Overdue",
  no_daily_report: "Missing Report",
  client_health_below: "Low Health",
  task_blocked_days: "Blocked Task",
  no_activity_days: "No Activity",
  custom: "Custom",
};

const RULE_TYPE_OPTIONS = Object.entries(RULE_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const RULE_TYPE_BADGE_VARIANT: Record<string, "active" | "warning" | "danger" | "info" | "neutral"> = {
  task_overdue_days: "danger",
  no_daily_report: "warning",
  client_health_below: "danger",
  task_blocked_days: "warning",
  no_activity_days: "info",
  custom: "neutral",
};

interface NotificationRule {
  id: string;
  name: string;
  description: string | null;
  rule_type: string;
  threshold: number | null;
  is_active: boolean;
  notify_targets: string[] | null;
  created_at: string;
}

interface NewRuleForm {
  name: string;
  rule_type: string;
  threshold: string;
  description: string;
}

const EMPTY_FORM: NewRuleForm = {
  name: "",
  rule_type: "task_overdue_days",
  threshold: "",
  description: "",
};

export function NotificationRules() {
  const { toast } = useToast();
  const { isAdmin } = useUser();
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewRuleForm>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("notification_rules")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRules(data ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load notification rules";
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  async function handleToggleActive(ruleId: string, currentActive: boolean) {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("notification_rules")
        .update({ is_active: !currentActive })
        .eq("id", ruleId);

      if (error) throw error;

      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, is_active: !currentActive } : r))
      );
      toast(`Rule ${!currentActive ? "activated" : "deactivated"}`, "success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update rule";
      toast(message, "error");
    }
  }

  async function handleUpdateThreshold(ruleId: string, newThreshold: number) {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("notification_rules")
        .update({ threshold: newThreshold })
        .eq("id", ruleId);

      if (error) throw error;

      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, threshold: newThreshold } : r))
      );
      toast("Threshold updated", "success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update threshold";
      toast(message, "error");
    }
  }

  async function handleDelete(ruleId: string) {
    if (!confirm("Are you sure you want to delete this rule?")) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("notification_rules")
        .delete()
        .eq("id", ruleId);

      if (error) throw error;

      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      toast("Rule deleted", "success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete rule";
      toast(message, "error");
    }
  }

  async function handleAddRule() {
    if (!form.name.trim()) {
      toast("Rule name is required", "error");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const threshold = form.threshold ? Number(form.threshold) : null;

      if (form.threshold && isNaN(threshold as number)) {
        toast("Threshold must be a number", "error");
        setSaving(false);
        return;
      }

      const { data, error } = await supabase
        .from("notification_rules")
        .insert({
          name: form.name.trim(),
          rule_type: form.rule_type,
          threshold,
          description: form.description.trim() || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setRules((prev) => [data, ...prev]);
      setForm({ ...EMPTY_FORM });
      setShowForm(false);
      toast("Rule created", "success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create rule";
      toast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Notification Rules</h2>
        {isAdmin && !showForm && (
          <Button size="sm" variant="secondary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Add Rule
          </Button>
        )}
      </div>

      {/* Inline add-rule form */}
      {isAdmin && showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">New Notification Rule</CardTitle>
            <button
              onClick={() => { setShowForm(false); setForm({ ...EMPTY_FORM }); }}
              className="p-1 rounded hover:bg-[rgba(255,255,255,0.05)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
            >
              <X size={18} />
            </button>
          </CardHeader>
          <div className="space-y-3">
            <Input
              label="Rule Name"
              placeholder="e.g. Overdue tasks warning"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <SelectField
              label="Rule Type"
              options={RULE_TYPE_OPTIONS}
              value={form.rule_type}
              onChange={(e) => setForm({ ...form, rule_type: e.target.value })}
            />
            <Input
              label="Threshold"
              type="number"
              placeholder="e.g. 3 (days) or 40 (score)"
              value={form.threshold}
              onChange={(e) => setForm({ ...form, threshold: e.target.value })}
            />
            <Input
              label="Description"
              placeholder="Optional description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setShowForm(false); setForm({ ...EMPTY_FORM }); }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddRule} disabled={saving}>
                {saving ? "Saving..." : "Create Rule"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Rule cards */}
      {rules.length === 0 && !showForm && (
        <Card>
          <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
            No notification rules configured yet.
          </p>
        </Card>
      )}

      {rules.map((rule) => (
        <Card key={rule.id}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-[var(--color-text)]">{rule.name}</span>
                <Badge variant={RULE_TYPE_BADGE_VARIANT[rule.rule_type] ?? "neutral"}>
                  {RULE_TYPE_LABELS[rule.rule_type] ?? rule.rule_type}
                </Badge>
                <Badge variant={rule.is_active ? "active" : "neutral"}>
                  {rule.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              {rule.description && (
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">{rule.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-[var(--color-text-secondary)]">
                {rule.threshold !== null && (
                  <span>Threshold: <strong className="text-[var(--color-text)]">{rule.threshold}</strong></span>
                )}
                {rule.notify_targets && rule.notify_targets.length > 0 && (
                  <span>Notify: {rule.notify_targets.join(", ")}</span>
                )}
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2 shrink-0">
                {/* Threshold inline edit */}
                <input
                  type="number"
                  className="w-16 px-2 py-1 text-xs rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                  defaultValue={rule.threshold ?? ""}
                  placeholder="—"
                  onBlur={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    if (val !== null && val !== rule.threshold) {
                      handleUpdateThreshold(rule.id, val);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                />

                {/* Toggle active */}
                <button
                  onClick={() => handleToggleActive(rule.id, rule.is_active)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    rule.is_active ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"
                  }`}
                  title={rule.is_active ? "Deactivate rule" : "Activate rule"}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                      rule.is_active ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="p-1.5 rounded hover:bg-[rgba(239,68,68,0.15)] text-[var(--color-text-secondary)] hover:text-[#ef4444] transition-colors"
                  title="Delete rule"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
