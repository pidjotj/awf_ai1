import { countsAsValidated } from "@/pages/Planning/creditUtils"
import type { Slot, StepCode } from "@/types/domain"

export type StepCredits = Record<StepCode, number>

export interface CampusMacroPlan {
  /** Credits actually delivered so far this school year. */
  completed: StepCredits
  /** Credits lost to individual absences (counted separately from "completed"). */
  voluntaryAbsence: StepCredits
  /** Reference target from last year's macro-planning model. */
  model2526: StepCredits
  /** Reference target from this year's macro-planning model. */
  model2627: StepCredits
  /** Credits still to schedule/deliver this school year (26-27). */
  toDo2627: StepCredits
}

// Transcribed from the Y25-26 macro-planning sheet (school year 26-27: 13/07/2026 -> 26/05/2027).
export const macroPlan: Record<"MALANG" | "CIMAHI", CampusMacroPlan> = {
  MALANG: {
    completed: { A: 191, B: 137, C: 232, D: 0 },
    voluntaryAbsence: { A: 0, B: 0, C: 0, D: 0 },
    model2526: { A: 205, B: 140, C: 411, D: 0 },
    model2627: { A: 214, B: 140, C: 430, D: 140 },
    toDo2627: { A: 228, B: 143, C: 609, D: 140 },
  },
  CIMAHI: {
    completed: { A: 173, B: 114, C: 292, D: 0 },
    voluntaryAbsence: { A: 7, B: 0, C: 0, D: 0 },
    model2526: { A: 205, B: 140, C: 411, D: 0 },
    model2627: { A: 214, B: 140, C: 430, D: 140 },
    toDo2627: { A: 253, B: 166, C: 549, D: 140 },
  },
}

/** Baseline credit target per Step, per Batch (Step C counts each assigned IAT separately: 140 x 2 minimum). */
export const STEP_CREDITS_PER_BATCH: StepCredits = { A: 140, B: 140, C: 280, D: 140 }
export const BATCH_COUNT = 3

export function sumStepCredits(credits: StepCredits): number {
  return credits.A + credits.B + credits.C + credits.D
}

const ALL_STEPS: StepCode[] = ["A", "B", "C", "D"]

/**
 * Folds validated Slots into the macro-planning snapshot: every Completed slot moves its credits
 * from "to do" to "completed" for its campus and step, so the dashboard reacts live to Validate.
 */
export function computeLiveMacroPlan(slots: Slot[]): Record<"MALANG" | "CIMAHI", CampusMacroPlan> {
  const campuses = ["MALANG", "CIMAHI"] as const
  const result = {} as Record<"MALANG" | "CIMAHI", CampusMacroPlan>

  for (const campus of campuses) {
    const base = macroPlan[campus]
    const completed = { ...base.completed }
    const toDo2627 = { ...base.toDo2627 }

    for (const step of ALL_STEPS) {
      const liveCredits = slots
        .filter((s) => s.campus === campus && s.step === step && s.status === "Completed" && countsAsValidated(s))
        .reduce((sum, s) => sum + s.credits, 0)
      completed[step] += liveCredits
      toDo2627[step] = Math.max(0, toDo2627[step] - liveCredits)
    }

    result[campus] = { ...base, completed, toDo2627 }
  }

  return result
}
