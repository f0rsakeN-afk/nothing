import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getReports,
  getReport,
  updateReportStatus,
  getFeedback,
  deleteFeedback,
  getContacts,
  deleteContact,
  type ReportsFilter,
  type FeedbackFilter,
  type ContactFilter,
  type ReportStatus,
} from "@/services/admin/inbox.service";

// ─── Reports ──────────────────────────────────────────────────────────────────

export function useReports(filter: ReportsFilter = {}) {
  return useQuery({
    queryKey: ["admin", "reports", filter],
    queryFn: () => getReports(filter),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useReport(id: string) {
  return useQuery({
    queryKey: ["admin", "reports", id],
    queryFn: () => getReport(id),
    enabled: !!id,
  });
}

export function useUpdateReportStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: ReportStatus } }) =>
      updateReportStatus(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      queryClient.refetchQueries({ queryKey: ["admin", "reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "reports", id] });
    },
  });
}

// ─── Feedback ──────────────────────────────────────────────────────────────────

export function useFeedback(filter: FeedbackFilter = {}) {
  return useQuery({
    queryKey: ["admin", "feedback", filter],
    queryFn: () => getFeedback(filter),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useDeleteFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteFeedback,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "feedback"] });
      queryClient.refetchQueries({ queryKey: ["admin", "feedback"] });
    },
  });
}

// ─── Contacts ───────────────────────────────────────────────────────────────────

export function useContacts(filter: ContactFilter = {}) {
  return useQuery({
    queryKey: ["admin", "contacts", filter],
    queryFn: () => getContacts(filter),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "contacts"] });
      queryClient.refetchQueries({ queryKey: ["admin", "contacts"] });
    },
  });
}