"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getReports, updateReportStatus, getFeedback, deleteFeedback, getContacts, deleteContact, deleteReport } from "@/services/admin/inbox.service";
import { ReportsTable } from "@/components/admin/inbox/reports-table";
import { FeedbackTable } from "@/components/admin/inbox/feedback-table";
import { ContactsTable } from "@/components/admin/inbox/contacts-table";
import { toast } from "@/components/ui/sileo-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Inbox, MessageSquare, Mail, AlertTriangle, Download } from "lucide-react";

type Tab = "reports" | "feedback" | "contacts";

const TABS = [
  { id: "reports" as const, label: "Reports", icon: AlertTriangle },
  { id: "feedback" as const, label: "Feedback", icon: MessageSquare },
  { id: "contacts" as const, label: "Contacts", icon: Mail },
];

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState<Tab>("reports");

  // Reports state
  const [reportSearch, setReportSearch] = useState("");
  const [reportStatusFilter, setReportStatusFilter] = useState("");
  const [reportPage, setReportPage] = useState(1);

  // Feedback state
  const [feedbackSearch, setFeedbackSearch] = useState("");
  const [feedbackPage, setFeedbackPage] = useState(1);

  // Contacts state
  const [contactSearch, setContactSearch] = useState("");
  const [contactTopicFilter, setContactTopicFilter] = useState("");
  const [contactPage, setContactPage] = useState(1);

  // Queries - only active tab is fetched
  const reportsQuery = useQuery({
    queryKey: ["admin", "reports", reportSearch, reportStatusFilter, reportPage],
    queryFn: () => getReports({
      search: reportSearch || undefined,
      status: (reportStatusFilter || undefined) as any,
      page: reportPage,
      limit: 20,
    }),
    enabled: activeTab === "reports",
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const feedbackQuery = useQuery({
    queryKey: ["admin", "feedback", feedbackSearch, feedbackPage],
    queryFn: () => getFeedback({ search: feedbackSearch || undefined, page: feedbackPage, limit: 20 }),
    enabled: activeTab === "feedback",
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const contactsQuery = useQuery({
    queryKey: ["admin", "contacts", contactSearch, contactTopicFilter, contactPage],
    queryFn: () => getContacts({
      search: contactSearch || undefined,
      topic: contactTopicFilter || undefined,
      page: contactPage,
      limit: 20,
    }),
    enabled: activeTab === "contacts",
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Current query based on active tab
  const currentQuery = useMemo(() => {
    switch (activeTab) {
      case "reports": return reportsQuery;
      case "feedback": return feedbackQuery;
      case "contacts": return contactsQuery;
    }
  }, [activeTab, reportsQuery, feedbackQuery, contactsQuery]);

  // Handlers with useCallback
  const handleReportStatusChange = useCallback(async (id: string, status: string) => {
    try {
      await updateReportStatus(id, { status: status as any });
      reportsQuery.refetch();
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
    }
  }, [reportsQuery]);

  const handleReportDelete = useCallback(async (id: string) => {
    try {
      await deleteReport(id);
      reportsQuery.refetch();
      toast.success("Report deleted");
    } catch {
      toast.error("Failed to delete report");
    }
  }, [reportsQuery]);

  const handleFeedbackDelete = useCallback(async (id: string) => {
    try {
      await deleteFeedback(id);
      feedbackQuery.refetch();
      toast.success("Feedback deleted");
    } catch {
      toast.error("Failed to delete feedback");
    }
  }, [feedbackQuery]);

  const handleContactDelete = useCallback(async (id: string) => {
    try {
      await deleteContact(id);
      contactsQuery.refetch();
      toast.success("Contact deleted");
    } catch {
      toast.error("Failed to delete contact");
    }
  }, [contactsQuery]);

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Inbox className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Inbox</h1>
            <p className="text-sm text-muted-foreground">Manage reports, feedback, and contacts</p>
          </div>
        </div>
        {activeTab === "reports" && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              const params = new URLSearchParams();
              if (reportStatusFilter) params.set("status", reportStatusFilter);
              window.location.href = `/api/admin/reports/export?${params.toString()}`;
            }}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        )}
      </div>

      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-fit">
        {TABS.map((tab) => {
          const count = currentQuery?.data?.pagination?.total;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleTabChange(tab.id)}
              className="gap-2"
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {count !== undefined && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      <div className="bg-background rounded-xl border border-border p-6">
        {activeTab === "reports" && (
          <ReportsTable
            reports={reportsQuery.data?.data || []}
            pagination={reportsQuery.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0, hasMore: false }}
            search={reportSearch}
            statusFilter={reportStatusFilter}
            onSearchChange={setReportSearch}
            onStatusChange={setReportStatusFilter}
            onPageChange={setReportPage}
            onStatusUpdate={handleReportStatusChange}
            onDelete={handleReportDelete}
          />
        )}

        {activeTab === "feedback" && (
          <FeedbackTable
            feedbacks={feedbackQuery.data?.data || []}
            pagination={feedbackQuery.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0, hasMore: false }}
            search={feedbackSearch}
            onSearchChange={setFeedbackSearch}
            onPageChange={setFeedbackPage}
            onDelete={handleFeedbackDelete}
          />
        )}

        {activeTab === "contacts" && (
          <ContactsTable
            contacts={contactsQuery.data?.data || []}
            pagination={contactsQuery.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0, hasMore: false }}
            search={contactSearch}
            topicFilter={contactTopicFilter}
            onSearchChange={setContactSearch}
            onTopicChange={setContactTopicFilter}
            onPageChange={setContactPage}
            onDelete={handleContactDelete}
          />
        )}
      </div>
    </div>
  );
}