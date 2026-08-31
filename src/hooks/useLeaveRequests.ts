import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createLeaveRequest, decideLeaveRequest, fetchLeaveRequests } from "@/data/leaveRepository"
import type { LeaveStatus, NewLeaveRequest } from "@/types/domain"

const LEAVE_KEY = ["leave-requests"]

export function useLeaveRequests() {
  return useQuery({ queryKey: LEAVE_KEY, queryFn: fetchLeaveRequests })
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (record: NewLeaveRequest) => createLeaveRequest(record),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LEAVE_KEY }),
  })
}

export function useDecideLeaveRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, decidedBy }: { id: string; status: Extract<LeaveStatus, "Accepted" | "Refused">; decidedBy: string }) =>
      decideLeaveRequest(id, status, decidedBy),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LEAVE_KEY }),
  })
}
