import type { AttendanceRecord, AttendanceStatus, Course, Slot, StepCode } from "@/types/domain"

const MAX_STEP_C_ATTEMPTS_PER_IAT = 3

export function courseIatCandidates(course: Course): string[] {
  return [course.primaryCMI, course.secondaryCMI, course.optionalCMI].filter((v): v is string => Boolean(v))
}

/** A slot "counts" once it's on the books, whether it happened yet or not — only Cancelled frees the step back up. */
function isActive(slot: Slot) {
  return slot.status !== "Cancelled"
}

function hasActiveStep(slots: Slot[], campus: string, courseId: string, step: StepCode) {
  return slots.some((slot) => slot.campus === campus && slot.course === courseId && slot.step === step && isActive(slot))
}

function activeStepCountByIat(slots: Slot[], campus: string, courseId: string, step: StepCode) {
  const counts = new Map<string, number>()
  for (const slot of slots) {
    if (slot.campus === campus && slot.course === courseId && slot.step === step && isActive(slot) && slot.iat) {
      counts.set(slot.iat, (counts.get(slot.iat) ?? 0) + 1)
    }
  }
  return counts
}

export type StepOption = {
  step: StepCode
  /** For Step C/D, which of the course's assigned IATs can still be picked. Undefined for A/B (the whole group attends together). */
  eligibleIats?: string[]
}

/**
 * Every step is offered by default; a step drops off the list once it's already on the books for this
 * course AT THIS CAMPUS (Planned or Completed — a Cancelled slot frees it back up). Campuses are fully
 * decoupled: a course delivered at Malang tracks its own progress, independent of the same course at
 * Cimahi. The only hard ordering rule: Step C requires a Step A to already exist (same campus). Step B
 * after Step C, or Step A after Step B, are both fine — nothing blocks them.
 *
 * Step C is per-IAT: every IAT assigned to the course must go through it (up to 3 attempts each), so it
 * stays open as long as at least one assigned IAT hasn't used up their attempts. Step D is per-IAT too,
 * open to any IAT who has been through Step C at least once and hasn't already delivered Step D themselves.
 * We don't have grading data yet, so this doesn't check the >4/5 pass threshold from the future grading form.
 */
export function getAvailableSteps(course: Course, slots: Slot[], campus: string): StepOption[] {
  const candidates = courseIatCandidates(course)
  const options: StepOption[] = []

  if (!hasActiveStep(slots, campus, course.id, "A")) options.push({ step: "A" })
  if (!hasActiveStep(slots, campus, course.id, "B")) options.push({ step: "B" })

  if (hasActiveStep(slots, campus, course.id, "A")) {
    const stepCCounts = activeStepCountByIat(slots, campus, course.id, "C")
    const eligibleForC = candidates.filter((iat) => (stepCCounts.get(iat) ?? 0) < MAX_STEP_C_ATTEMPTS_PER_IAT)
    if (eligibleForC.length > 0) options.push({ step: "C", eligibleIats: eligibleForC })
  }

  const stepCCounts = activeStepCountByIat(slots, campus, course.id, "C")
  const stepDCounts = activeStepCountByIat(slots, campus, course.id, "D")
  const eligibleForD = candidates.filter((iat) => (stepCCounts.get(iat) ?? 0) > 0 && (stepDCounts.get(iat) ?? 0) === 0)
  if (eligibleForD.length > 0) options.push({ step: "D", eligibleIats: eligibleForD })

  return options
}

/** How many Step C attempts this IAT already has on the books for this course (at this campus) — their next attempt is one more than this. */
export function nextStepCAttempt(attendance: AttendanceRecord[], campus: string, course: string, iat: string) {
  return attendance.filter((a) => a.campus === campus && a.course === course && a.iat === iat && a.step === "C").length + 1
}

/**
 * Validating a slot records it in the IAT Attendance history, dated on the slot's day. The whole
 * assigned group gets a "Present" record for Step A/B. For Step C/D, the principal IAT gets `outcome`
 * (Present if the Evaluation Sheet passed, Failed otherwise — this is what keeps a failed attempt off
 * the credit counter); for Step C, any additional IATs just sitting in get logged "Optional" (they're
 * not spending an attempt, so their record is unaffected by the outcome). Step C attempt numbers
 * continue from whatever that IAT already has on the books for this course.
 */
export function buildAttendanceForValidation(
  slot: Pick<Slot, "campus" | "course" | "grade" | "step" | "iat" | "additionalIats" | "date">,
  course: Course,
  attendance: AttendanceRecord[],
  outcome: Extract<AttendanceStatus, "Present" | "Failed"> = "Present"
): Omit<AttendanceRecord, "id">[] {
  if (!slot.step) return []

  if (slot.step === "C") {
    const records: Omit<AttendanceRecord, "id">[] = []
    if (slot.iat) {
      records.push({
        campus: slot.campus,
        course: slot.course,
        grade: slot.grade,
        iat: slot.iat,
        step: "C",
        attempt: nextStepCAttempt(attendance, slot.campus, slot.course, slot.iat),
        status: outcome,
        date: slot.date,
      })
    }
    for (const iat of slot.additionalIats ?? []) {
      records.push({
        campus: slot.campus,
        course: slot.course,
        grade: slot.grade,
        iat,
        step: "C",
        attempt: 1,
        status: "Optional",
        date: slot.date,
      })
    }
    return records
  }

  const involvedIats = slot.step === "D" ? (slot.iat ? [slot.iat] : []) : courseIatCandidates(course)
  // Step D has a real pass/fail (the Evaluation Sheet's outcome); Step A/B don't go through grading, so they're always Present.
  const status = slot.step === "D" ? outcome : "Present"

  return involvedIats.map((iat) => ({
    campus: slot.campus,
    course: slot.course,
    grade: slot.grade,
    iat,
    step: slot.step!,
    attempt: 1,
    status,
    date: slot.date,
  }))
}

function minutesOfDay(dateTime: string) {
  const d = new Date(dateTime)
  return d.getHours() * 60 + d.getMinutes()
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return minutesOfDay(aStart) < minutesOfDay(bEnd) && minutesOfDay(bStart) < minutesOfDay(aEnd)
}

export function iatsInvolvedInSlot(slot: Slot, coursesById: Map<string, Course>): string[] {
  if (slot.iat) return [slot.iat]
  const course = coursesById.get(slot.course)
  return course ? courseIatCandidates(course) : []
}

export type IatConflict = { iat: string; slot: Slot }

/** Any of `candidateIats` already booked (any FT, any campus) in an overlapping window that day. Non-blocking by design. */
export function findIatConflicts(
  slots: Slot[],
  coursesById: Map<string, Course>,
  candidate: { date: string; startTime?: string; endTime?: string; iats: string[]; excludeSlotId?: string }
): IatConflict[] {
  if (!candidate.startTime || !candidate.endTime || candidate.iats.length === 0) return []

  const conflicts: IatConflict[] = []
  for (const slot of slots) {
    if (slot.id === candidate.excludeSlotId) continue
    if (slot.status === "Cancelled") continue
    if (slot.date !== candidate.date) continue
    if (!slot.startTime || !slot.endTime) continue
    if (!overlaps(candidate.startTime, candidate.endTime, slot.startTime, slot.endTime)) continue

    const involved = iatsInvolvedInSlot(slot, coursesById)
    for (const iat of candidate.iats) {
      if (involved.includes(iat)) conflicts.push({ iat, slot })
    }
  }
  return conflicts
}

export type RoomConflict = { room: string; slot: Slot }

/**
 * Same room, same campus, overlapping time on the same day — shouldn't be possible, but nothing
 * currently stops a double-booking, so this just flags it. Scoped to one campus: two campuses can
 * happen to have a room with the same name ("Classroom") without being the same physical room.
 */
export function findRoomConflicts(
  slots: Slot[],
  candidate: { date: string; campus: string; startTime?: string; endTime?: string; room: string; excludeSlotId?: string }
): RoomConflict[] {
  if (!candidate.startTime || !candidate.endTime || !candidate.room) return []

  const conflicts: RoomConflict[] = []
  for (const slot of slots) {
    if (slot.id === candidate.excludeSlotId) continue
    if (slot.status === "Cancelled") continue
    if (slot.campus !== candidate.campus) continue
    if (slot.date !== candidate.date) continue
    if (slot.room !== candidate.room) continue
    if (!slot.startTime || !slot.endTime) continue
    if (!overlaps(candidate.startTime, candidate.endTime, slot.startTime, slot.endTime)) continue
    conflicts.push({ room: candidate.room, slot })
  }
  return conflicts
}
