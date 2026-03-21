export type DeadlineBadge = { label: string; variant: "danger" | "warning" };

export function getDeadlineBadge(
  dueDate: string | null,
  status: string
): DeadlineBadge | null {
  if (!dueDate || status === "completed") return null;
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  if (dueDate < today) return { label: "Overdue", variant: "danger" };
  if (dueDate === today || dueDate === tomorrow)
    return { label: "Due soon", variant: "warning" };
  return null;
}
