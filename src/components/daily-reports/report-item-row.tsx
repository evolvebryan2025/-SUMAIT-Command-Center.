"use client";

import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus, Link as LinkIcon } from "lucide-react";

export interface ReportItemData {
  description: string;
  links: string[];
  item_type: "completed" | "pending" | "blocker" | "meeting_note";
  task_id?: string | null;
}

interface ReportItemRowProps {
  item: ReportItemData;
  onChange: (updated: ReportItemData) => void;
  onRemove: () => void;
}

export function ReportItemRow({ item, onChange, onRemove }: ReportItemRowProps) {
  const handleDescriptionChange = (value: string) => {
    onChange({ ...item, description: value });
  };

  const handleLinkChange = (index: number, value: string) => {
    const updatedLinks = item.links.map((link, i) => (i === index ? value : link));
    onChange({ ...item, links: updatedLinks });
  };

  const handleAddLink = () => {
    onChange({ ...item, links: [...item.links, ""] });
  };

  const handleRemoveLink = (index: number) => {
    const updatedLinks = item.links.filter((_, i) => i !== index);
    onChange({ ...item, links: updatedLinks });
  };

  return (
    <div className="relative group rounded-[var(--radius)] border border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] p-4 space-y-3">
      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-2 right-2 p-1 rounded-full text-[var(--color-text-secondary)] hover:text-red-400 hover:bg-[rgba(239,68,68,0.1)] transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
        title="Remove item"
      >
        <X size={16} />
      </button>

      {/* Description */}
      <Textarea
        placeholder="Describe what you worked on..."
        value={item.description}
        onChange={(e) => handleDescriptionChange(e.target.value)}
        className="min-h-[60px]"
      />

      {/* Links */}
      <div className="space-y-2">
        {item.links.map((link, index) => (
          <div key={index} className="flex items-center gap-2">
            <LinkIcon size={14} className="text-[var(--color-text-secondary)] shrink-0" />
            <Input
              type="url"
              placeholder="https://..."
              value={link}
              onChange={(e) => handleLinkChange(index, e.target.value)}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => handleRemoveLink(index)}
              className="p-1 text-[var(--color-text-secondary)] hover:text-red-400 cursor-pointer"
              title="Remove link"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleAddLink}
        >
          <Plus size={14} />
          Add Link
        </Button>
      </div>
    </div>
  );
}
