// Types miroir des listes SharePoint (voir src/data/mockData.ts pour le seed).

export type CourseTypeCode = "TH" | "PW" | "BOTH"
export type StepCode = "A" | "B" | "C" | "D"
export type SlotStatus = "Planned" | "Completed" | "Cancelled"
export type CancelledBy = "FT" | "IAT" | "School" | "Other"

export interface Campus {
  title: string
}

export interface CourseTypeRef {
  title: CourseTypeCode
}

export interface GradeRef {
  title: string
}

export interface StepRef {
  title: StepCode
}

export interface Room {
  title: string
}

export interface FrenchTeacher {
  title: string
  campus?: string
  /**
   * The FT's real-world identity as it appears in their Microsoft/Entra account (full name or UPN),
   * used to resolve the signed-in Power Apps user to their short app name — see src/store/realIdentity.ts.
   * Optional because most FTs don't have this mapped yet.
   */
  microsoftAccount?: string
}

export interface IndonesianTeacher {
  title: string
  campus?: string
  group?: string
}

export interface Holiday {
  date: string
  name: string
}

/** One graded objective a lesson targets (Scientific Literacy, Technology, Career & Higher Education...) — shown on that lesson's Step C/D Evaluation Sheet for the FT to rate. */
export interface CourseObjective {
  category: string
  text: string
}

export interface Course {
  id: string
  grade: string
  courseType: CourseTypeCode
  primaryCMI?: string
  secondaryCMI?: string
  optionalCMI?: string
  primaryMLG?: string
  secondaryMLG?: string
  optionalMLG?: string
  thCredit?: number
  pwlCredit?: number | null
  trainingObjectives?: CourseObjective[]
}

export interface Slot {
  id: string
  date: string
  campus: string
  startTime?: string
  endTime?: string
  ft: string
  room: string
  grade: string
  courseType: CourseTypeCode
  course: string
  step?: StepCode
  /** The single IAT involved for Step C/D (who is being coached, or who now delivers alone). Unset for Step A/B, where the course's whole assigned IAT group attends. */
  iat?: string
  /** Extra IATs sitting in on a Step C session (observing) — not the one being evaluated, no attempt is consumed for them. */
  additionalIats?: string[]
  status: SlotStatus
  cancelledBy?: CancelledBy
  cancelReason?: string
  iteration?: number
  /** Poids du créneau en crédits (1 crédit = 40 min de cours diffusé). */
  credits: number
  /**
   * Step C only: whether the principal IAT passed when this slot was validated. Undefined for every
   * other step (always counts). false means the session happened but its credits don't count toward
   * the global counter, and the IAT Attendance record is logged as "Failed" rather than "Present".
   */
  validated?: boolean
}

export type NewSlot = Omit<Slot, "id">

export type AttendanceStatus = "Present" | "Absent" | "Failed" | "Remedial" | "Optional" | "Partial" | "Planned"

/**
 * One IAT's attendance at one step (or, for Step C, one attempt) of one course — sourced from the
 * IAT Attendance sheets. This is the historical record; Slot is the scheduling/booking side.
 */
export interface AttendanceRecord {
  id: string
  campus: string
  course: string
  grade: string
  iat: string
  step: StepCode
  /** Attempt number for Step C (1-3, max 3 per IAT); always 1 for A/B/D. */
  attempt: number
  status: AttendanceStatus
  date?: string
  /** The Slot this attempt was delivered in — lets the UI jump straight to its Evaluation Sheet. Unset on legacy records predating that feature. */
  slotId?: string
}

export type LeaveType = "CP" | "CS" | "RTT" | "Remote work"
export type LeaveStatus = "Pending" | "Accepted" | "Refused"

export interface LeaveRequest {
  id: string
  requester: string
  type: LeaveType
  startDate: string
  endDate: string
  comment?: string
  status: LeaveStatus
  createdAt: string
  decidedBy?: string
  decidedAt?: string
}

export type NewLeaveRequest = Omit<LeaveRequest, "id" | "status" | "createdAt" | "decidedBy" | "decidedAt">

/**
 * A school-wide (or single-campus) window where no course can be scheduled — exams, a school trip,
 * a facility closure... Distinct from Holiday (single fixed public-holiday dates) and from
 * LeaveRequest (one FT's personal absence). Kept around for the future credit-planning calculation,
 * not just for blocking the grid today.
 */
export interface BlockedPeriod {
  id: string
  name: string
  startDate: string
  endDate: string
  /** Empty/undefined = blocks every campus. */
  campus?: string
  comment?: string
}

export type NewBlockedPeriod = Omit<BlockedPeriod, "id">

export interface AuditLogEntry {
  id: string
  timestamp: string
  actor: string
  action: string
  summary: string
}

/** 1-5, or unrated ("N/A" — doesn't count as a 0, it's just excluded from the average). */
export type EvaluationScoreValue = 1 | 2 | 3 | 4 | 5
export type EvaluationScore = EvaluationScoreValue | "N/A"

export interface EvaluationObjectiveScore {
  category: string
  text: string
  score: EvaluationScore
}

export interface EvaluationProgramOwnership {
  generalAeronauticKnowledge: EvaluationScore
  theoreticalUnderstanding: EvaluationScore
  practicalWorkUnderstanding: EvaluationScore
  lessonAppropriation: EvaluationScore
}

/**
 * The Step C/D grading form ("Evaluation Sheet") — replaces the old manual Pass/Fail choice at
 * Validate time. One sheet per delivered attempt (tied to exactly one Slot). Its computed average
 * decides pass/fail against the step's threshold (>= 3.5/5 for Step C, >= 4/5 for Step D), which then
 * drives the IAT Attendance record and whether the slot's credits count toward the global counter.
 */
export interface EvaluationSheet {
  id: string
  slotId: string
  date: string
  campus: string
  step: Extract<StepCode, "C" | "D">
  iat: string
  ft: string
  course: string
  courseType: CourseTypeCode
  /** Step C attempt number (1-3); always 1 for Step D. */
  attempt: number
  objectives: EvaluationObjectiveScore[]
  comment: string
  programOwnership: EvaluationProgramOwnership
  averageScore: number
  passed: boolean
  createdBy: string
  createdAt: string
}

export type NewEvaluationSheet = Omit<EvaluationSheet, "id" | "attempt" | "averageScore" | "passed" | "createdBy" | "createdAt">
