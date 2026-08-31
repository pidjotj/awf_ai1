// Current Batch <-> Grade mapping, updated by hand once a year as cohorts move up.
// Batch 1 entered at Grade 10 a year before Batch 2; a new batch always enters at Grade 10.
export const GRADE_TO_BATCH: Record<string, string> = {
  "Grade 11": "Batch 1",
  "Grade 10": "Batch 2",
}

export function batchLabelForGrade(grade: string): string {
  return GRADE_TO_BATCH[grade] ?? grade
}
