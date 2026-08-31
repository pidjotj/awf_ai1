import type { Course, CourseTypeCode, Slot } from "@/types/domain"

export function getCourseCreditTarget(course: Course | undefined, courseType: CourseTypeCode) {
  if (!course) return undefined
  return courseType === "PW" ? course.pwlCredit : (course.thCredit ?? course.pwlCredit)
}

function courseTypeLabel(courseType: CourseTypeCode) {
  return courseType === "PW" ? "PWL" : courseType
}

/** The course id mixes a short code with a free-text title (e.g. "10B.1.3 Crew Safety, Ejection seat"); keep the code. */
function courseCode(courseId: string) {
  return courseId.split(" ")[0]
}

/** Compact on-card label: {TH|PWL}-{Step}-{course code}, e.g. "TH-C-10B.1.1". */
export function compactSlotLabel(slot: Pick<Slot, "courseType" | "step" | "course">) {
  return [courseTypeLabel(slot.courseType), slot.step, courseCode(slot.course)].filter(Boolean).join("-")
}

/** Campus, course and step, decoupled — the same course tracks separate progress at each campus. */
export function deliveredCreditsKey(slot: Pick<Slot, "campus" | "course" | "step">) {
  return `${slot.campus}__${slot.course}__${slot.step ?? ""}`
}

/**
 * Only Step C/D ever go through real pass/fail grading (the Evaluation Sheet) — `validated` isn't a
 * meaningful concept for A/B, where finishing the slot is the only "done" condition there is. Treating
 * `validated === false` as disqualifying for every step meant a completed Step A/B slot whose
 * `validated` happened to default to false (which real imported data apparently does) never counted as
 * delivered and never got its green border, even though nothing about it was ever actually failed.
 */
export function countsAsValidated(slot: Pick<Slot, "step" | "validated">) {
  if (slot.step !== "C" && slot.step !== "D") return true
  return slot.validated !== false
}

/** Cumule les crédits des créneaux réalisés, par campus + cours + step. A non-validated Step C/D doesn't count. */
export function buildDeliveredCreditsMap(slots: Slot[]) {
  const map = new Map<string, number>()
  for (const slot of slots) {
    if (slot.status !== "Completed") continue
    if (!countsAsValidated(slot)) continue
    const key = deliveredCreditsKey(slot)
    map.set(key, (map.get(key) ?? 0) + slot.credits)
  }
  return map
}

/** Charge en crédits d'une journée pour un FT (les créneaux annulés ne comptent pas). */
export function dailyCreditsLoad(slots: Slot[]) {
  return slots.filter((slot) => slot.status !== "Cancelled").reduce((sum, slot) => sum + slot.credits, 0)
}
