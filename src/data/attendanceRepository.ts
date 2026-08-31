import { mockAttendance } from "@/data/mockAttendance"
import { logAction } from "@/data/auditLogRepository"
import { useCurrentUser } from "@/store/currentUser"
import { fetchAllPages, isLive, unwrap } from "@/data/dataverseHelpers"
import { Crf82_iatattendancesService } from "@/generated"
import type { Crf82_iatattendances, Crf82_iatattendancesBase } from "@/generated/models/Crf82_iatattendancesModel"
import type { AttendanceRecord, AttendanceStatus, StepCode } from "@/types/domain"

// Backs the real "IATAttendance" Dataverse table in production; `npm run dev` stays on the in-memory
// mock seed (see src/data/dataverseHelpers.ts).
//
// STALE GENERATED SCHEMA: the generated model (src/generated/models/Crf82_iatattendancesModel.ts) claims
// "Iat"/"Step" are crf82_studentname/crf82_stepcode and "Status" is a Choice column — all wrong for the
// live table, confirmed directly against the real column list in the maker portal. The real logical names
// are crf82_instructorassistant/crf82_steplevel, and Status is actually plain Text (crf82_attendancestatus
// is the right logical name, just the wrong data type in the generated model). Reading it as a choice
// code silently produced `undefined` for every row (indexing the {0:'Present',1:'Optional'} lookup table
// with a string key never matches), which is why every status badge lost its color in production. The
// upside of it being Text: there's no choice-set gap to fill — any of the 7 statuses can be written
// as-is, no Dataverse-side setup needed. Since src/generated/ can't be hand-edited, the corrected shape is
// declared locally below; if the data source ever gets regenerated with the right schema, this type (and
// its use in toDomain/createAttendanceRecords) can be dropped in favor of the regenerated one.
type Crf82_iatattendancesReadable = Omit<Crf82_iatattendances, "crf82_attendancestatus"> & {
  crf82_instructorassistant?: string
  crf82_steplevel?: string
  crf82_attendancestatus?: string
}
type Crf82_iatattendancesWritable = Omit<Crf82_iatattendancesBase, "crf82_iatattendanceid" | "crf82_attendancestatus"> & {
  crf82_instructorassistant?: string
  crf82_steplevel?: string
  crf82_attendancestatus?: string
}

const KNOWN_STATUSES: readonly AttendanceStatus[] = ["Present", "Absent", "Failed", "Remedial", "Optional", "Partial", "Planned"]

/** Matches the free-text status value against the app's known statuses, case/whitespace-insensitively. */
function normalizeStatus(raw?: string): AttendanceStatus {
  if (!raw?.trim()) return "Present"
  const match = KNOWN_STATUSES.find((s) => s.toLowerCase() === raw.trim().toLowerCase())
  return match ?? "Present"
}

const attendance: AttendanceRecord[] = mockAttendance.map((record) => ({ ...record }))

function toDomain(row: Crf82_iatattendances): AttendanceRecord {
  const r = row as Crf82_iatattendancesReadable
  return {
    id: r.crf82_iatattendanceid,
    campus: r.crf82_campusname ?? "",
    course: r.crf82_coursename ?? "",
    grade: r.crf82_gradelevel ?? "",
    iat: r.crf82_instructorassistant ?? "",
    step: (r.crf82_steplevel ?? "A") as StepCode,
    attempt: r.crf82_attemptnumber ?? 1,
    status: normalizeStatus(r.crf82_attendancestatus),
    date: r.crf82_attemptdate || undefined,
    slotId: r.crf82_slotidentifier === undefined ? undefined : String(r.crf82_slotidentifier),
  }
}

export async function fetchAttendance(): Promise<AttendanceRecord[]> {
  if (!isLive) return attendance.map((record) => ({ ...record }))
  const rows = await fetchAllPages(Crf82_iatattendancesService.getAll)
  return rows.map(toDomain)
}

export async function createAttendanceRecords(records: Omit<AttendanceRecord, "id">[]): Promise<AttendanceRecord[]> {
  let created: AttendanceRecord[]

  if (!isLive) {
    let idCounter = attendance.reduce((acc, record) => Math.max(acc, Number(record.id) || 0), 0)
    created = records.map((record) => {
      idCounter += 1
      return { ...record, id: String(idCounter) }
    })
    attendance.push(...created)
  } else {
    created = await Promise.all(
      records.map(async (record) => {
        // crf82_slotidentifier is a Number column (a leftover from the CSV-era legacy id scheme) — a
        // real Dataverse slot id is a GUID string and won't fit, so it's only set when it happens to be
        // numeric (legacy data), never for slots created live.
        const numericSlotId = record.slotId !== undefined ? Number(record.slotId) : NaN
        const payload = {
          statecode: 0,
          crf82_attempttitle: `${record.course} — Step ${record.step} — ${record.iat}`,
          crf82_campusname: record.campus,
          crf82_coursename: record.course,
          crf82_gradelevel: record.grade,
          crf82_instructorassistant: record.iat,
          crf82_steplevel: record.step,
          crf82_attemptnumber: record.attempt,
          crf82_attendancestatus: record.status,
          crf82_attemptdate: record.date,
          ...(Number.isFinite(numericSlotId) ? { crf82_slotidentifier: numericSlotId } : {}),
        } as Crf82_iatattendancesWritable
        // The generated create() signature still expects crf82_attendancestatus as a 0|1 choice code —
        // wrong for this Text column (see the comment above), so the call itself needs the same escape
        // hatch as the payload's own declared shape.
        return toDomain(unwrap(await Crf82_iatattendancesService.create(payload as unknown as Omit<Crf82_iatattendancesBase, "crf82_iatattendanceid">)))
      })
    )
  }

  const actor = useCurrentUser.getState().name
  for (const record of created) {
    logAction(actor, "Attendance recorded", `${record.course} — Step ${record.step} — ${record.iat} — ${record.status}`)
  }

  return created
}
