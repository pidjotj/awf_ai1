import { mockLeaveRequests } from "@/data/mockLeaveRequests"
import { logAction } from "@/data/auditLogRepository"
import { useCurrentUser } from "@/store/currentUser"
import { choiceCodeFor, fetchAllPages, isLive, unwrap } from "@/data/dataverseHelpers"
import { Crf82_leaverequestsModel, Crf82_leaverequestsService } from "@/generated"
import type { Crf82_leaverequests, Crf82_leaverequestsBase } from "@/generated/models/Crf82_leaverequestsModel"
import type { LeaveRequest, LeaveStatus, LeaveType, NewLeaveRequest } from "@/types/domain"

// Backs the real "LeaveRequests" Dataverse table in production; `npm run dev` stays on the in-memory
// mock seed (see src/data/dataverseHelpers.ts).
//
// KNOWN GAP: the Dataverse choice column for crf82_leavetype only has CP / RTT / Remotework — "CS" (one
// of this app's 4 leave types) has no matching choice option yet. Submitting a "CS" request against the
// live table will throw until "CS" is added to that choice set in Dataverse.
const LEAVE_TYPE_LABELS: Record<LeaveType, string> = { CP: "CP", CS: "CS", RTT: "RTT", "Remote work": "Remotework" }
const LEAVE_TYPE_FROM_LABEL: Record<string, LeaveType> = { CP: "CP", CS: "CS", RTT: "RTT", Remotework: "Remote work" }

const leaveRequests: LeaveRequest[] = mockLeaveRequests.map((r) => ({ ...r }))

function nextId() {
  const max = leaveRequests.reduce((acc, r) => Math.max(acc, Number(r.id) || 0), 0)
  return String(max + 1)
}

function summary(r: Pick<LeaveRequest, "requester" | "type" | "startDate" | "endDate">) {
  return `${r.requester} — ${r.type} — ${r.startDate} to ${r.endDate}`
}

function toDomain(r: Crf82_leaverequests): LeaveRequest {
  const typeLabel = r.crf82_leavetype === undefined ? undefined : Crf82_leaverequestsModel.Crf82_leaverequestscrf82_leavetype[r.crf82_leavetype]
  const statusLabel = r.crf82_requeststatus === undefined ? undefined : Crf82_leaverequestsModel.Crf82_leaverequestscrf82_requeststatus[r.crf82_requeststatus]
  return {
    id: r.crf82_leaverequestid,
    requester: r.crf82_requestername ?? "",
    type: (typeLabel ? (LEAVE_TYPE_FROM_LABEL[typeLabel] ?? "CP") : "CP") as LeaveType,
    startDate: r.crf82_startdate ?? "",
    endDate: r.crf82_enddate ?? "",
    comment: r.crf82_comments || undefined,
    status: (statusLabel ?? "Pending") as LeaveStatus,
    createdAt: r.crf82_creationtimestamp ?? "",
    decidedBy: r.crf82_decisionmaker || undefined,
    decidedAt: r.crf82_decisiontimestamp || undefined,
  }
}

export async function fetchLeaveRequests(): Promise<LeaveRequest[]> {
  if (!isLive) return leaveRequests.map((r) => ({ ...r }))
  const rows = await fetchAllPages(Crf82_leaverequestsService.getAll)
  return rows.map(toDomain)
}

export async function createLeaveRequest(record: NewLeaveRequest): Promise<LeaveRequest> {
  if (!isLive) {
    const created: LeaveRequest = { ...record, id: nextId(), status: "Pending", createdAt: new Date().toISOString() }
    leaveRequests.push(created)
    logAction(useCurrentUser.getState().name, "Leave request submitted", summary(created))
    return { ...created }
  }

  const payload: Omit<Crf82_leaverequestsBase, "crf82_leaverequestid"> = {
    statecode: 0,
    crf82_requesttitle: summary(record),
    crf82_requestername: record.requester,
    crf82_leavetype: choiceCodeFor(Crf82_leaverequestsModel.Crf82_leaverequestscrf82_leavetype, LEAVE_TYPE_LABELS[record.type]) as 0 | 1 | 2,
    crf82_startdate: record.startDate,
    crf82_enddate: record.endDate,
    crf82_comments: record.comment,
    crf82_requeststatus: 0, // Pending
  } as Omit<Crf82_leaverequestsBase, "crf82_leaverequestid">

  const created = toDomain(unwrap(await Crf82_leaverequestsService.create(payload)))
  logAction(useCurrentUser.getState().name, "Leave request submitted", summary(created))
  return created
}

export async function decideLeaveRequest(
  id: string,
  status: Extract<LeaveStatus, "Accepted" | "Refused">,
  decidedBy: string
): Promise<LeaveRequest> {
  if (!isLive) {
    const index = leaveRequests.findIndex((r) => r.id === id)
    if (index === -1) throw new Error(`Leave request ${id} not found`)
    leaveRequests[index] = {
      ...leaveRequests[index],
      status,
      decidedBy,
      decidedAt: new Date().toISOString(),
    }
    const updated = leaveRequests[index]
    logAction(decidedBy, `Leave request ${status.toLowerCase()}`, summary(updated))
    return { ...updated }
  }

  const statusCode = status === "Accepted" ? 1 : 2
  const updated = toDomain(
    unwrap(
      await Crf82_leaverequestsService.update(id, {
        crf82_requeststatus: statusCode,
        crf82_decisionmaker: decidedBy,
        crf82_decisiontimestamp: new Date().toISOString(),
      })
    )
  )
  logAction(decidedBy, `Leave request ${status.toLowerCase()}`, summary(updated))
  return updated
}
