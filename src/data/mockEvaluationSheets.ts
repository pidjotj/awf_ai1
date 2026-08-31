import type { EvaluationSheet } from "@/types/domain"

// No historical Evaluation Sheets exist yet — the feature is new, and past Step C/D validations were
// graded with the old manual Pass/Fail choice (see mockAttendance.ts) rather than a saved sheet. New
// sheets are created going forward whenever a Step C/D slot gets graded.
export const mockEvaluationSheets: EvaluationSheet[] = []
