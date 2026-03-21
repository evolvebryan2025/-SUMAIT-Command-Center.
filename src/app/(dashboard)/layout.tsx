import { ThemeProvider } from "@/providers/theme-provider";
import { ToastProvider } from "@/providers/toast-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ChatWidget } from "@/components/ai/chat-widget";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Sidebar />
        <MobileNav />
        <main className="lg:pl-60 min-h-screen">
          <div className="flex items-center justify-end px-6 lg:px-8 pt-4 pb-0">
            <NotificationBell />
          </div>
          <div className="max-w-[1440px] mx-auto px-6 lg:px-8 pb-6 lg:pb-8">
            {children}
          </div>
        </main>
        <ChatWidget />
      </ToastProvider>
    </ThemeProvider>
  );
}
