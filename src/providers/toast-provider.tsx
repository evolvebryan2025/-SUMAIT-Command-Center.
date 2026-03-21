"use client";

import * as Toast from "@radix-ui/react-toast";
import { createContext, useCallback, useContext, useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, Info } from "lucide-react";

interface ToastMessage {
  id: string;
  title: string;
  variant: "success" | "error" | "info";
}

interface ToastContextType {
  toast: (title: string, variant?: "success" | "error" | "info") => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const icons = {
  success: <CheckCircle size={16} className="text-[#22c55e]" />,
  error: <XCircle size={16} className="text-[#ef4444]" />,
  info: <Info size={16} className="text-[#3b82f6]" />,
};

const borderColors = {
  success: "border-l-[#22c55e]",
  error: "border-l-[#ef4444]",
  info: "border-l-[var(--color-primary)]",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const toast = useCallback((title: string, variant: "success" | "error" | "info" = "info") => {
    const id = crypto.randomUUID();
    setMessages((prev) => [...prev, { id, title, variant }]);
    setTimeout(() => setMessages((prev) => prev.filter((m) => m.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <Toast.Provider>
        {children}
        {messages.map((msg) => (
          <Toast.Root
            key={msg.id}
            className={cn(
              "bg-[var(--color-surface)] border border-[var(--color-border)] border-l-4 rounded-[var(--radius)] p-4 shadow-lg flex items-center gap-3",
              borderColors[msg.variant]
            )}
          >
            {icons[msg.variant]}
            <Toast.Title className="text-sm font-medium text-[var(--color-text)]">{msg.title}</Toast.Title>
          </Toast.Root>
        ))}
        <Toast.Viewport className="fixed bottom-4 right-4 flex flex-col gap-2 w-80 z-[100]" />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}
