"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useTheme } from "@/providers/theme-provider";

export function DevKitSwitcher() {
  const { activeKit, setActiveKit, devKits, loading } = useTheme();

  if (loading || !activeKit) {
    return <div className="h-10 bg-[rgba(255,255,255,0.05)] rounded-lg animate-pulse" />;
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[var(--color-border)] hover:bg-[rgba(255,255,255,0.08)] transition-all cursor-pointer outline-none">
        <div className="w-6 h-6 rounded-md border border-[rgba(255,255,255,0.2)] shrink-0" style={{ background: activeKit.color_primary }} />
        <span className="flex-1 text-sm font-medium text-[var(--color-text)] truncate text-left">{activeKit.name}</span>
        <ChevronDown size={14} className="text-[var(--color-text-secondary)] shrink-0" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="min-w-[200px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-1 shadow-xl z-50" sideOffset={8} align="start">
          {devKits.map((kit) => (
            <DropdownMenu.Item
              key={kit.id}
              className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer hover:bg-[rgba(255,255,255,0.08)] outline-none"
              onSelect={() => setActiveKit(kit)}
            >
              <div className="w-5 h-5 rounded border border-[rgba(255,255,255,0.2)] shrink-0" style={{ background: kit.color_primary }} />
              <span className="text-sm text-[var(--color-text)]">{kit.name}</span>
              {kit.id === activeKit.id && <span className="ml-auto text-xs text-[var(--color-primary)]">Active</span>}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
