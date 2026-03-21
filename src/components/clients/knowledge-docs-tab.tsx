"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Pin, PinOff, Plus, Trash2, FolderOpen, Search } from "lucide-react";
import { useToast } from "@/providers/toast-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/ui/select-field";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { capitalize, formatDate } from "@/lib/utils";
import type { KnowledgeDoc, KnowledgeCategory } from "@/lib/types";

interface KnowledgeDocsTabProps {
  clientId: string;
}

const CATEGORIES: KnowledgeCategory[] = [
  "general",
  "technical",
  "brand",
  "process",
  "credentials_ref",
  "notes",
];

const CATEGORY_COLORS: Record<string, string> = {
  general: "neutral",
  technical: "info",
  brand: "active",
  process: "warning",
  credentials_ref: "danger",
  notes: "neutral",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function applyInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code class=\"bg-[rgba(255,255,255,0.08)] px-1 rounded text-xs font-mono\">$1</code>");
}

function renderMarkdown(raw: string): string {
  const lines = escapeHtml(raw).split("\n");
  const output: string[] = [];
  let inList = false;

  for (const line of lines) {
    if (line.startsWith("### ")) {
      if (inList) { output.push("</ul>"); inList = false; }
      output.push(`<h3 class="text-sm font-semibold mt-2 mb-1">${line.slice(4)}</h3>`);
    } else if (line.startsWith("## ")) {
      if (inList) { output.push("</ul>"); inList = false; }
      output.push(`<h2 class="text-base font-semibold mt-3 mb-1">${line.slice(3)}</h2>`);
    } else if (line.startsWith("# ")) {
      if (inList) { output.push("</ul>"); inList = false; }
      output.push(`<h1 class="text-lg font-bold mt-3 mb-1">${line.slice(2)}</h1>`);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) { output.push("<ul class=\"list-disc pl-4 space-y-0.5\">"); inList = true; }
      output.push(`<li>${applyInline(line.slice(2))}</li>`);
    } else if (line.trim() === "") {
      if (inList) { output.push("</ul>"); inList = false; }
      output.push("<br>");
    } else {
      if (inList) { output.push("</ul>"); inList = false; }
      output.push(`<p>${applyInline(line)}</p>`);
    }
  }

  if (inList) output.push("</ul>");
  return output.join("");
}

export function KnowledgeDocsTab({ clientId }: KnowledgeDocsTabProps) {
  const { toast } = useToast();

  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState<KnowledgeDoc | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "general" as KnowledgeCategory,
  });
  const [saving, setSaving] = useState(false);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/knowledge-docs?clientId=${clientId}`);
    const data = await res.json();
    if (res.ok) {
      setDocs(data.docs ?? []);
    } else {
      toast(data.error ?? "Failed to load documents", "error");
    }
    setLoading(false);
  }, [clientId, toast]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const filteredDocs = useMemo(() => {
    return docs.filter((doc) => {
      if (filterCategory !== "all" && doc.category !== filterCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return doc.title.toLowerCase().includes(q) || doc.content.toLowerCase().includes(q);
      }
      return true;
    });
  }, [docs, searchQuery, filterCategory]);

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) {
      toast("Title is required", "error");
      return;
    }

    setSaving(true);

    if (editingDoc) {
      const res = await fetch(`/api/knowledge-docs/${editingDoc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          content: form.content,
          category: form.category,
        }),
      });
      setSaving(false);
      if (res.ok) {
        toast("Document updated", "success");
        setEditingDoc(null);
        fetchDocs();
      } else {
        const data = await res.json();
        toast(data.error ?? "Failed to update", "error");
      }
    } else {
      const res = await fetch("/api/knowledge-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          title: form.title.trim(),
          content: form.content,
          category: form.category,
        }),
      });
      setSaving(false);
      if (res.ok) {
        toast("Document created", "success");
        setShowAddForm(false);
        setForm({ title: "", content: "", category: "general" });
        fetchDocs();
      } else {
        const data = await res.json();
        toast(data.error ?? "Failed to create", "error");
      }
    }
  }, [form, editingDoc, clientId, toast, fetchDocs]);

  const handlePin = useCallback(async (doc: KnowledgeDoc) => {
    const res = await fetch(`/api/knowledge-docs/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: !doc.is_pinned }),
    });
    if (res.ok) fetchDocs();
  }, [fetchDocs]);

  const handleDelete = useCallback(async (doc: KnowledgeDoc) => {
    if (!confirm(`Delete "${doc.title}"?`)) return;
    const res = await fetch(`/api/knowledge-docs/${doc.id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Document deleted", "success");
      fetchDocs();
    }
  }, [toast, fetchDocs]);

  const startEdit = useCallback((doc: KnowledgeDoc) => {
    setEditingDoc(doc);
    setForm({ title: doc.title, content: doc.content, category: doc.category });
    setShowAddForm(false);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingDoc(null);
    setShowAddForm(false);
    setForm({ title: "", content: "", category: "general" });
  }, []);

  const categoryOptions = useMemo(
    () => [
      { value: "all", label: "All Categories" },
      ...CATEGORIES.map((c) => ({ value: c, label: capitalize(c.replace(/_/g, " ")) })),
    ],
    []
  );

  const formCategoryOptions = useMemo(
    () => CATEGORIES.map((c) => ({ value: c, label: capitalize(c.replace(/_/g, " ")) })),
    []
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const isFormOpen = showAddForm || editingDoc;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--color-text)] flex items-center gap-2">
          <FolderOpen size={20} className="text-[var(--color-primary)]" />
          Knowledge Base ({docs.length})
        </h3>
        {!isFormOpen && (
          <Button size="sm" onClick={() => { setShowAddForm(true); setForm({ title: "", content: "", category: "general" }); }}>
            <Plus size={14} className="mr-1" /> New Document
          </Button>
        )}
      </div>

      {/* Search + filter */}
      {docs.length > 0 && !isFormOpen && (
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
            <Input
              className="w-full pl-9 pr-4 py-2 rounded-[var(--radius)] bg-[rgba(255,255,255,0.05)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)]"
              placeholder="Search docs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-44">
            <SelectField
              options={categoryOptions}
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Add/Edit form */}
      {isFormOpen && (
        <Card>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Input
                  label="Title *"
                  placeholder="Document title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <SelectField
                label="Category"
                options={formCategoryOptions}
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as KnowledgeCategory }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                Content <span className="text-[var(--color-text-secondary)] font-normal">(Markdown supported)</span>
              </label>
              <Textarea
                className="w-full min-h-[200px] p-4 rounded-[var(--radius)] bg-[rgba(255,255,255,0.05)] border border-[var(--color-border)] text-sm text-[var(--color-text)] font-mono resize-y focus:outline-none focus:border-[var(--color-primary)]"
                placeholder="Write your document content here... Markdown is supported."
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editingDoc ? "Update Document" : "Create Document"}
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Empty state */}
      {filteredDocs.length === 0 && !isFormOpen && (
        <EmptyState
          title={searchQuery || filterCategory !== "all" ? "No matching documents" : "No documents yet"}
          description={searchQuery || filterCategory !== "all"
            ? "Try adjusting your search or filter."
            : "Create documents to store client knowledge, processes, and technical notes."}
          action={
            !searchQuery && filterCategory === "all" ? (
              <Button size="sm" onClick={() => setShowAddForm(true)}>
                <Plus size={14} className="mr-1" /> New Document
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Document list */}
      {filteredDocs.map((doc) => (
        <Card key={doc.id} className={doc.is_pinned ? "border-[var(--color-primary)] border-opacity-30" : ""}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                {doc.is_pinned && <Pin size={14} className="text-[var(--color-primary)]" />}
                <h4 className="font-semibold text-sm text-[var(--color-text)]">{doc.title}</h4>
                <Badge variant={CATEGORY_COLORS[doc.category] as "active" | "warning" | "danger" | "info" | "neutral" ?? "neutral"}>
                  {capitalize(doc.category.replace(/_/g, " "))}
                </Badge>
              </div>
              <div
                className="text-sm text-[var(--color-text-secondary)] line-clamp-4 [&_h1]:text-[var(--color-text)] [&_h2]:text-[var(--color-text)] [&_h3]:text-[var(--color-text)] [&_strong]:text-[var(--color-text)] [&_code]:text-[var(--color-text)]"
                dangerouslySetInnerHTML={{
                  __html: doc.content ? renderMarkdown(doc.content) : "No content",
                }}
              />
              <div className="flex items-center gap-3 mt-2 text-xs text-[var(--color-text-secondary)]">
                <span>Updated {formatDate(doc.updated_at)}</span>
                {doc.knowledge_attachments && doc.knowledge_attachments.length > 0 && (
                  <span className="flex items-center gap-1">
                    <FileText size={10} /> {doc.knowledge_attachments.length} file(s)
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => handlePin(doc)}
                className="p-1.5 rounded hover:bg-[rgba(255,255,255,0.05)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] cursor-pointer"
                title={doc.is_pinned ? "Unpin" : "Pin"}
              >
                {doc.is_pinned ? <PinOff size={14} /> : <Pin size={14} />}
              </button>
              <Button size="sm" variant="ghost" onClick={() => startEdit(doc)}>
                Edit
              </Button>
              <button
                type="button"
                onClick={() => handleDelete(doc)}
                className="p-1.5 rounded hover:bg-[rgba(239,68,68,0.1)] text-[var(--color-text-secondary)] hover:text-[var(--status-danger)] cursor-pointer"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
