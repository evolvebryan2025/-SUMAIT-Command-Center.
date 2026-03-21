"use client";

import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs-wrapper";
import { CampaignCards, type Campaign } from "@/components/campaigns/campaign-cards";
import { CampaignFormDialog } from "@/components/campaigns/campaign-form-dialog";
import { CampaignAnalytics } from "@/components/campaigns/campaign-analytics";
import { AccountSelector } from "@/components/campaigns/account-selector";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "draft", label: "Draft" },
  { value: "completed", label: "Completed" },
];

export default function CampaignsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const handleSaved = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleSelectCampaign = useCallback((campaign: Campaign) => {
    setSelectedCampaign(campaign);
  }, []);

  const handleCloseAnalytics = useCallback(() => {
    setSelectedCampaign(null);
  }, []);

  const handleAccountChange = useCallback((accountId: string | null) => {
    setSelectedAccountId(accountId);
    setSelectedCampaign(null);
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-text)] mb-1">
            Campaigns
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm">
            Manage email campaigns via Instantly.ai
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AccountSelector
            selectedAccountId={selectedAccountId}
            onAccountChange={handleAccountChange}
          />
          <Button onClick={() => setDialogOpen(true)}>
            <Plus size={16} />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Status filter tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {STATUS_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <CampaignCards
              statusFilter={tab.value}
              onSelectCampaign={handleSelectCampaign}
              refreshKey={refreshKey}
              accountId={selectedAccountId}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Analytics panel for selected campaign */}
      {selectedCampaign && (
        <CampaignAnalytics
          campaign={selectedCampaign}
          onClose={handleCloseAnalytics}
          accountId={selectedAccountId}
        />
      )}

      {/* Create campaign dialog */}
      <CampaignFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={handleSaved}
        accountId={selectedAccountId}
      />
    </div>
  );
}
