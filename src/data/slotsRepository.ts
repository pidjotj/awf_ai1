import { mockSlots } from "@/data/mockData"
import { logAction } from "@/data/auditLogRepository"
import { useCurrentUser } from "@/store/currentUser"
import { choiceCodeFor, fetchAllPages, fromIndonesiaInstant, isLive, toDateOnly, toIndonesiaInstant, unwrap } from "@/data/dataverseHelpers"
import { Crf82_slotsModel, Crf82_slotsService } from "@/generated"
import type { Crf82_slots, Crf82_slotsBase } from "@/generated/models/Crf82_slotsModel"
import type { CancelledBy, CourseTypeCode, NewSlot, Slot, SlotStatus, StepCode } from "@/types/domain"

// Backs the real "Slots" Dataverse table in production; `npm run dev` stays on the in-memory mock seed
// (see src/data/dataverseHelpers.ts). NOTE: crf82_fulltimeindicator is where the FT's name actually
// lives — a leftover from however this table was scaffolded, not a real "full-time" concept; worth
// renaming in Dataverse when there's a moment, but harmless to work around here in the meantime.
const slots: Slot[] = mockSlots.map((slot) => ({ ...slot }))

function nextId() {
  const max = slots.reduce((acc, slot) => Math.max(acc, Number(slot.id) || 0), 0)
  return String(max + 1)
}

function slotSummary(slot: Slot) {
  return [slot.course, slot.step ? `Step ${slot.step}` : null, slot.date].filter(Boolean).join(" — ")
}

function toDomain(r: Crf82_slots): Slot {
  return {
    id: r.crf82_slotid,
    date: toDateOnly(r.crf82_sessiondate),
    campus: r.crf82_campuslocation ?? "",
    startTime: fromIndonesiaInstant(r.crf82_starttime),
    endTime: fromIndonesiaInstant(r.crf82_endtime),
    ft: r.crf82_fulltimeindicator ?? "",
    room: r.crf82_roomnumber ?? "",
    grade: r.crf82_gradelevel ?? "",
    courseType: (r.crf82_coursetype ?? "TH") as CourseTypeCode,
    course: r.crf82_coursename ?? "",
    step: (r.crf82_stepcode || undefined) as StepCode | undefined,
    iat: r.crf82_instructorassistant || undefined,
    additionalIats: r.crf82_additionalassistants ? r.crf82_additionalassistants.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
    status: (r.crf82_sessionstatus ?? "Planned") as SlotStatus,
    cancelledBy: (r.crf82_cancelledby || undefined) as CancelledBy | undefined,
    cancelReason: r.crf82_cancellationreason || undefined,
    iteration: r.crf82_iterationnumber ?? undefined,
    credits: r.crf82_credithours ?? 0,
    validated:
      r.crf82_validationstatus === undefined
        ? undefined
        : Crf82_slotsModel.Crf82_slotscrf82_validationstatus[r.crf82_validationstatus] === "TRUE",
  }
}

/** Only includes fields present in `patch` — used for both create (full patch) and update (partial). */
function toDataversePatch(patch: Partial<Slot>): Partial<Omit<Crf82_slotsBase, "crf82_slotid">> {
  const out: Partial<Omit<Crf82_slotsBase, "crf82_slotid">> = {}
  if ("date" in patch) out.crf82_sessiondate = patch.date
  if ("campus" in patch) out.crf82_campuslocation = patch.campus
  if ("startTime" in patch) out.crf82_starttime = patch.startTime ? toIndonesiaInstant(patch.startTime) : undefined
  if ("endTime" in patch) out.crf82_endtime = patch.endTime ? toIndonesiaInstant(patch.endTime) : undefined
  if ("ft" in patch) out.crf82_fulltimeindicator = patch.ft
  if ("room" in patch) out.crf82_roomnumber = patch.room
  if ("grade" in patch) out.crf82_gradelevel = patch.grade
  if ("courseType" in patch) out.crf82_coursetype = patch.courseType
  if ("course" in patch) out.crf82_coursename = patch.course
  if ("step" in patch) out.crf82_stepcode = patch.step
  if ("iat" in patch) out.crf82_instructorassistant = patch.iat
  if ("additionalIats" in patch) out.crf82_additionalassistants = patch.additionalIats?.join(", ")
  if ("status" in patch) out.crf82_sessionstatus = patch.status
  if ("cancelledBy" in patch) out.crf82_cancelledby = patch.cancelledBy
  if ("cancelReason" in patch) out.crf82_cancellationreason = patch.cancelReason
  if ("iteration" in patch) out.crf82_iterationnumber = patch.iteration
  if ("credits" in patch) out.crf82_credithours = patch.credits
  if ("validated" in patch) {
    out.crf82_validationstatus =
      patch.validated === undefined
        ? undefined
        : (choiceCodeFor(Crf82_slotsModel.Crf82_slotscrf82_validationstatus, patch.validated ? "TRUE" : "FALSE") as 0 | 1)
  }
  return out
}

export async function fetchSlots(): Promise<Slot[]> {
  if (!isLive) return slots.map((slot) => ({ ...slot }))
  const rows = await fetchAllPages(Crf82_slotsService.getAll)
  return rows.map(toDomain)
}

export async function createSlot(record: NewSlot): Promise<Slot> {
  if (!isLive) {
    const created: Slot = { ...record, id: nextId() }
    slots.push(created)
    logAction(useCurrentUser.getState().name, "Slot created", slotSummary(created))
    return { ...created }
  }

  const payload = { statecode: 0, ...toDataversePatch(record) } as Omit<Crf82_slotsBase, "crf82_slotid">
  const created = toDomain(unwrap(await Crf82_slotsService.create(payload)))
  logAction(useCurrentUser.getState().name, "Slot created", slotSummary(created))
  return created
}

export async function updateSlot(id: string, changes: Partial<Slot>): Promise<Slot> {
  if (!isLive) {
    const index = slots.findIndex((slot) => slot.id === id)
    if (index === -1) throw new Error(`Slot ${id} not found`)
    slots[index] = { ...slots[index], ...changes }
    const updated = slots[index]

    const action =
      changes.status === "Cancelled" ? "Slot cancelled" : changes.status === "Completed" ? "Slot validated" : "Slot updated"
    logAction(useCurrentUser.getState().name, action, slotSummary(updated))

    return { ...updated }
  }

  const updated = toDomain(unwrap(await Crf82_slotsService.update(id, toDataversePatch(changes))))
  const action =
    changes.status === "Cancelled" ? "Slot cancelled" : changes.status === "Completed" ? "Slot validated" : "Slot updated"
  logAction(useCurrentUser.getState().name, action, slotSummary(updated))
  return updated
}

export async function deleteSlot(id: string): Promise<void> {
  if (!isLive) {
    const index = slots.findIndex((slot) => slot.id === id)
    if (index === -1) throw new Error(`Slot ${id} not found`)
    const [removed] = slots.splice(index, 1)
    logAction(useCurrentUser.getState().name, "Slot deleted", slotSummary(removed))
    return
  }

  const existing = toDomain(unwrap(await Crf82_slotsService.get(id)))
  await Crf82_slotsService.delete(id)
  logAction(useCurrentUser.getState().name, "Slot deleted", slotSummary(existing))
}
