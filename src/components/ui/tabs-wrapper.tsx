"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export function Tabs({ children, ...props }: TabsPrimitive.TabsProps) {
  return <TabsPrimitive.Root {...props}>{children}</TabsPrimitive.Root>;
}

export function TabsList({ children, className, ...props }: TabsPrimitive.TabsListProps) {
  return (
    <TabsPrimitive.List
      className={cn(
        "flex gap-1 border-b border-[var(--color-border)] mb-6",
        className
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.List>
  );
}

export function TabsTrigger({ children, className, ...props }: TabsPrimitive.TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] border-b-2 border-transparent -mb-px transition-all cursor-pointer",
        "data-[state=active]:text-[var(--color-primary)] data-[state=active]:border-[var(--color-primary)]",
        "hover:text-[var(--color-text)]",
        className
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.Trigger>
  );
}

export function TabsContent({ children, className, ...props }: TabsPrimitive.TabsContentProps) {
  return (
    <TabsPrimitive.Content className={cn("outline-none", className)} {...props}>
      {children}
    </TabsPrimitive.Content>
  );
}
