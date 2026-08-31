import { fetchAllPages, isLive } from "@/data/dataverseHelpers"
import { Crf82_auditlogsService } from "@/generated"
import type { Crf82_auditlogs } from "@/generated/models/Crf82_auditlogsModel"
import type { AuditLogEntry } from "@/types/domain"

// Backs the real "AuditLogs" Dataverse table in production; `npm run dev` stays on the in-memory mock
// seed (see src/data/dataverseHelpers.ts). Every mutation in the app (Slots, Attendance, Leave
// requests...) calls logAction() so nothing goes unrecorded.
const auditLog: AuditLogEntry[] = []
let idCounter = 0

function toDomain(r: Crf82_auditlogs): AuditLogEntry {
  return {
    id: r.crf82_auditlogid,
    timestamp: r.crf82_activitytimestamp ?? "",
    actor: r.crf82_actorname ?? "",
    action: r.crf82_actionperformed ?? "",
    summary: r.crf82_activitysummary ?? "",
  }
}

/**
 * Fire-and-forget by design: every call site logs an action alongside its real work without awaiting
 * this, so a slow or failed audit write must never block or break the actual operation — it just gets
 * reported to the console instead.
 */
export function logAction(actor: string, action: string, summary: string) {
  const timestamp = new Date().toISOString()

  if (!isLive) {
    idCounter += 1
    auditLog.push({ id: String(idCounter), timestamp, actor, action, summary })
    return
  }

  Crf82_auditlogsService.create({
    statecode: 0,
    crf82_activitytitle: `${action} — ${actor}`,
    crf82_actorname: actor,
    crf82_actionperformed: action,
    crf82_activitysummary: summary,
    crf82_activitytimestamp: timestamp,
  } as Parameters<typeof Crf82_auditlogsService.create>[0])
    .then((result) => {
      if (!result.success) {
        console.error("Failed to write audit log entry:", result.error)
      }
    })
    .catch((error: unknown) => {
      console.error("Failed to write audit log entry:", error)
    })
}

export async function fetchAuditLog(): Promise<AuditLogEntry[]> {
  if (!isLive) return [...auditLog].reverse()
  const rows = await fetchAllPages(Crf82_auditlogsService.getAll)
  return rows.map(toDomain).sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}
