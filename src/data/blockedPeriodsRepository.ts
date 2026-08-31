import { mockBlockedPeriods } from "@/data/mockBlockedPeriods"
import { logAction } from "@/data/auditLogRepository"
import { fetchSlots, updateSlot } from "@/data/slotsRepository"
import { useCurrentUser } from "@/store/currentUser"
import { fetchAllPages, isLive, unwrap } from "@/data/dataverseHelpers"
import { Crf82_blockedperiodsService } from "@/generated"
import type { Crf82_blockedperiods, Crf82_blockedperiodsBase } from "@/generated/models/Crf82_blockedperiodsModel"
import type { BlockedPeriod, NewBlockedPeriod } from "@/types/domain"

// Backs the real "BlockedPeriods" Dataverse table in production; `npm run dev` stays on the in-memory
// mock seed (see src/data/dataverseHelpers.ts).
const blockedPeriods: BlockedPeriod[] = mockBlockedPeriods.map((p) => ({ ...p }))

function nextId() {
  const max = blockedPeriods.reduce((acc, p) => Math.max(acc, Number(p.id) || 0), 0)
  return String(max + 1)
}

function toDomain(r: Crf82_blockedperiods): BlockedPeriod {
  return {
    id: r.crf82_blockedperiodid,
    name: r.crf82_examtitle ?? "",
    startDate: r.crf82_startdate ?? "",
    endDate: r.crf82_enddate ?? "",
    campus: r.crf82_campuslocation || undefined,
    comment: r.crf82_comments || undefined,
  }
}

function toDataverse(record: NewBlockedPeriod): Omit<Crf82_blockedperiodsBase, "crf82_blockedperiodid"> {
  return {
    statecode: 0,
    crf82_examtitle: record.name,
    crf82_startdate: record.startDate,
    crf82_enddate: record.endDate,
    crf82_campuslocation: record.campus,
    crf82_comments: record.comment,
  } as Omit<Crf82_blockedperiodsBase, "crf82_blockedperiodid">
}

export async function fetchBlockedPeriods(): Promise<BlockedPeriod[]> {
  if (!isLive) return blockedPeriods.map((p) => ({ ...p }))
  const rows = await fetchAllPages(Crf82_blockedperiodsService.getAll)
  return rows.map(toDomain)
}

export async function createBlockedPeriod(
  record: NewBlockedPeriod
): Promise<{ period: BlockedPeriod; cancelledCount: number }> {
  const created = isLive
    ? toDomain(unwrap(await Crf82_blockedperiodsService.create(toDataverse(record))))
    : (() => {
        const p: BlockedPeriod = { ...record, id: nextId() }
        blockedPeriods.push(p)
        return p
      })()

  logAction(
    useCurrentUser.getState().name,
    "Period blocked",
    `${created.name} — ${created.startDate} to ${created.endDate}${created.campus ? ` — ${created.campus}` : " — all campuses"}`
  )

  // Blocking a period that already has slots on the books (created before the block existed) cancels
  // them automatically — the school closed, so nothing in that window can still happen.
  const slots = await fetchSlots()
  const affected = slots.filter(
    (slot) =>
      slot.status !== "Cancelled" &&
      slot.date >= created.startDate &&
      slot.date <= created.endDate &&
      (!created.campus || slot.campus === created.campus)
  )
  const reason = `Blocked period: ${created.name}${created.comment ? ` — ${created.comment}` : ""}`
  for (const slot of affected) {
    await updateSlot(slot.id, { status: "Cancelled", cancelledBy: "School", cancelReason: reason })
  }

  return { period: { ...created }, cancelledCount: affected.length }
}
