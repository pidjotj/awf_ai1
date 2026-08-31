import { mockEvaluationSheets } from "@/data/mockEvaluationSheets"
import { logAction } from "@/data/auditLogRepository"
import { fetchSlots, updateSlot } from "@/data/slotsRepository"
import { fetchCourses } from "@/data/referenceData"
import { createAttendanceRecords, fetchAttendance } from "@/data/attendanceRepository"
import { useCurrentUser } from "@/store/currentUser"
import { fetchAllPages, isLive, unwrap } from "@/data/dataverseHelpers"
import { Crf82_evaluationsheetsService } from "@/generated"
import type { Crf82_evaluationsheets, Crf82_evaluationsheetsBase } from "@/generated/models/Crf82_evaluationsheetsModel"
import { buildAttendanceForValidation } from "@/pages/Planning/scheduling"
import type {
  Course,
  CourseTypeCode,
  EvaluationObjectiveScore,
  EvaluationScore,
  EvaluationScoreValue,
  EvaluationSheet,
  NewEvaluationSheet,
  StepCode,
} from "@/types/domain"

// Backs the real "EvaluationSheets" Dataverse table in production; `npm run dev` stays on the
// in-memory mock seed (see src/data/dataverseHelpers.ts). createAttendanceRecords() (called below) is
// now live-wired too (src/data/attendanceRepository.ts) — its status field turned out to be plain Text
// rather than the Choice column the generated schema claims, so all 7 statuses write freely, no gap.
//
// KNOWN SCHEMA QUIRK: of the 4 program-ownership scores, crf82_generalknowledgescore and
// crf82_lessonappropriationscore are Dataverse Number columns while crf82_practicalunderstandingscore
// and crf82_theoreticalunderstandingscore are Text — so "N/A" can only be stored literally on the
// latter two; on the Number-typed ones it's written as an empty value (no way to distinguish "N/A" from
// "not yet rated" there until those columns are typed consistently).
const evaluationSheets: EvaluationSheet[] = mockEvaluationSheets.map((sheet) => ({ ...sheet }))

export const EVALUATION_PASS_THRESHOLD: Record<"C" | "D", number> = { C: 3.5, D: 4 }

function nextId() {
  const max = evaluationSheets.reduce((acc, sheet) => Math.max(acc, Number(sheet.id) || 0), 0)
  return String(max + 1)
}

function numericScores(scores: EvaluationScore[]) {
  return scores.filter((s): s is Exclude<EvaluationScore, "N/A"> => s !== "N/A")
}

/** N/A doesn't count as a 0 — it's simply excluded from the average, exactly like the paper form. */
export function computeEvaluationAverage(record: Pick<NewEvaluationSheet, "objectives" | "programOwnership">) {
  const scores = [
    ...numericScores(record.objectives.map((o) => o.score)),
    ...numericScores(Object.values(record.programOwnership)),
  ]
  if (scores.length === 0) return 0
  return scores.reduce((sum, s) => sum + s, 0) / scores.length
}

function scoreFromNumber(n?: number | null): EvaluationScore {
  return n == null ? "N/A" : (n as EvaluationScoreValue)
}
function scoreFromText(s?: string | null): EvaluationScore {
  return !s || s === "N/A" ? "N/A" : (Number(s) as EvaluationScoreValue)
}
function scoreToNumber(s: EvaluationScore): number | undefined {
  return s === "N/A" ? undefined : s
}
function scoreToText(s: EvaluationScore): string {
  return s === "N/A" ? "N/A" : String(s)
}

/** "N/A", missing, or anything that doesn't parse to a real 1–5 stays "N/A" — never silently becomes 0. */
function objectiveScoreFromRaw(raw: unknown): EvaluationScore {
  if (raw === "N/A" || raw === undefined || raw === null || raw === "") return "N/A"
  const n = Number(raw)
  return Number.isFinite(n) && n >= 1 && n <= 5 ? (n as EvaluationScoreValue) : "N/A"
}

/**
 * Historical EvaluationSheet rows store objectives in a bare `{objective: <1-based index>, score:
 * "<digit>"}` shape — no category/text at all, confirmed directly against a real stored value. The
 * objective's name has to be joined in from the course's own `trainingObjectives` by that index instead
 * (which is why toDomain() below now needs the matching Course). New sheets created by this app already
 * write the full `{category, text, score}` shape (see createEvaluationSheet), which passes through as-is
 * — except `score`, which historically also showed up as a string here, silently turning
 * numericAverage()'s addition into string concatenation (confirmed live: that's exactly what produced
 * averages like "8888.8/5" instead of a real 1–5 range). Coerced to a real number either way.
 */
function parseObjectives(json: string | undefined, course: Course | undefined): EvaluationObjectiveScore[] {
  if (!json) return []
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return []
  }
  if (!Array.isArray(raw)) return []

  return raw.map((entry): EvaluationObjectiveScore => {
    const e = (entry ?? {}) as { category?: unknown; text?: unknown; objective?: unknown; score?: unknown }
    if (typeof e.category === "string" || typeof e.text === "string") {
      return { category: (e.category as string) ?? "", text: (e.text as string) ?? "", score: objectiveScoreFromRaw(e.score) }
    }
    const index = Number(e.objective) - 1
    const fromCourse = course?.trainingObjectives?.[index]
    return {
      category: fromCourse?.category ?? "",
      text: fromCourse?.text ?? (e.objective !== undefined ? `Objective ${e.objective}` : ""),
      score: objectiveScoreFromRaw(e.score),
    }
  })
}

function toDomain(r: Crf82_evaluationsheets, course?: Course): EvaluationSheet {
  return {
    id: r.crf82_evaluationsheetid,
    slotId: r.crf82_slotidentifier ?? "",
    date: r.crf82_assessmentdate ?? "",
    campus: r.crf82_campusname ?? "",
    step: (r.crf82_stepcode ?? "C") as Extract<StepCode, "C" | "D">,
    iat: r.crf82_instructorassistanttrainer ?? "",
    ft: r.crf82_fieldtrainer ?? "",
    course: r.crf82_coursename ?? "",
    courseType: (r.crf82_coursetype ?? "TH") as CourseTypeCode,
    attempt: r.crf82_attemptnumber ?? 1,
    objectives: parseObjectives(r.crf82_objectivesjson, course),
    comment: r.crf82_comments ?? "",
    programOwnership: {
      generalAeronauticKnowledge: scoreFromNumber(r.crf82_generalknowledgescore),
      theoreticalUnderstanding: scoreFromText(r.crf82_theoreticalunderstandingscore),
      practicalWorkUnderstanding: scoreFromText(r.crf82_practicalunderstandingscore),
      lessonAppropriation: scoreFromNumber(r.crf82_lessonappropriationscore),
    },
    averageScore: r.crf82_averagescore ?? 0,
    passed: r.crf82_passedstatus ?? false,
    createdBy: r.crf82_createdby ?? "",
    createdAt: r.crf82_creationdate ?? "",
  }
}

export async function fetchEvaluationSheets(): Promise<EvaluationSheet[]> {
  if (!isLive) return evaluationSheets.map((sheet) => ({ ...sheet }))
  const [rows, courses] = await Promise.all([fetchAllPages(Crf82_evaluationsheetsService.getAll), fetchCourses()])
  const coursesById = new Map(courses.map((c) => [c.id, c]))
  return rows.map((r) => toDomain(r, coursesById.get(r.crf82_coursename ?? "")))
}

export async function createEvaluationSheet(record: NewEvaluationSheet): Promise<EvaluationSheet> {
  const [slots, courses, attendance] = await Promise.all([fetchSlots(), fetchCourses(), fetchAttendance()])
  const slot = slots.find((s) => s.id === record.slotId)
  const course = courses.find((c) => c.id === record.course)
  if (!slot) throw new Error(`Slot ${record.slotId} not found`)

  const averageScore = computeEvaluationAverage(record)
  // The paper form's label reads "average > 4", but its own worked example shows an average of exactly
  // 4.0 marked "Yes" (passed) — so the real rule is inclusive despite the label. Flagged to the user.
  const passed = averageScore >= EVALUATION_PASS_THRESHOLD[record.step]

  // Reuse the same attendance-building logic the old manual Pass/Fail Validate used — attempt numbering
  // and the Step C "additional observing IATs" handling stay identical, only the outcome now comes from
  // the sheet's computed score instead of a manual choice.
  const attendanceDrafts = course
    ? buildAttendanceForValidation(slot, course, attendance, passed ? "Present" : "Failed")
    : []
  const attempt = attendanceDrafts.find((a) => a.iat === record.iat)?.attempt ?? 1
  const createdBy = useCurrentUser.getState().name
  const createdAt = new Date().toISOString()

  const created: EvaluationSheet = isLive
    ? toDomain(
        unwrap(
          await Crf82_evaluationsheetsService.create({
            statecode: 0,
            crf82_assessmenttitle: `${record.course} — Step ${record.step} — ${record.iat}`,
            crf82_slotidentifier: record.slotId,
            crf82_assessmentdate: record.date,
            crf82_campusname: record.campus,
            crf82_stepcode: record.step,
            crf82_instructorassistanttrainer: record.iat,
            crf82_fieldtrainer: record.ft,
            crf82_coursename: record.course,
            crf82_coursetype: record.courseType,
            crf82_attemptnumber: attempt,
            crf82_objectivesjson: JSON.stringify(record.objectives),
            crf82_comments: record.comment,
            crf82_generalknowledgescore: scoreToNumber(record.programOwnership.generalAeronauticKnowledge),
            crf82_theoreticalunderstandingscore: scoreToText(record.programOwnership.theoreticalUnderstanding),
            crf82_practicalunderstandingscore: scoreToText(record.programOwnership.practicalWorkUnderstanding),
            crf82_lessonappropriationscore: scoreToNumber(record.programOwnership.lessonAppropriation),
            crf82_averagescore: averageScore,
            crf82_passedstatus: passed,
            crf82_createdby: createdBy,
            crf82_creationdate: createdAt,
          } as Omit<Crf82_evaluationsheetsBase, "crf82_evaluationsheetid">)
        ),
        course
      )
    : (() => {
        const sheet: EvaluationSheet = { ...record, id: nextId(), attempt, averageScore, passed, createdBy, createdAt }
        evaluationSheets.push(sheet)
        return sheet
      })()

  await updateSlot(slot.id, { status: "Completed", validated: passed })
  if (attendanceDrafts.length > 0) {
    await createAttendanceRecords(attendanceDrafts.map((draft) => ({ ...draft, slotId: slot.id })))
  }

  logAction(
    created.createdBy,
    "Evaluation sheet saved",
    `${created.course} — Step ${created.step} — ${created.iat} — ${passed ? "Passed" : "Not validated"} (${averageScore.toFixed(1)}/5)`
  )

  return { ...created }
}
