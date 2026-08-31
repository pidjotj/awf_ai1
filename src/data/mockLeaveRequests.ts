import type { LeaveRequest } from "@/types/domain"

export const mockLeaveRequests: LeaveRequest[] = [
  {
    id: "1",
    requester: "Jonathan",
    type: "CP",
    startDate: "2026-07-20",
    endDate: "2026-07-27",
    comment: "Family vacation",
    status: "Pending",
    createdAt: "2026-06-10T09:00:00",
  },
  {
    id: "2",
    requester: "Etienne",
    type: "RTT",
    startDate: "2026-06-15",
    endDate: "2026-06-15",
    status: "Accepted",
    createdAt: "2026-06-01T14:30:00",
    decidedBy: "Olivier Autran",
    decidedAt: "2026-06-02T08:15:00",
  },
  {
    id: "3",
    requester: "Xavier",
    type: "Remote work",
    startDate: "2026-06-22",
    endDate: "2026-06-24",
    comment: "Internet installation at new place",
    status: "Refused",
    createdAt: "2026-06-05T11:00:00",
    decidedBy: "Antoine Des Deserts",
    decidedAt: "2026-06-06T10:00:00",
  },
]
