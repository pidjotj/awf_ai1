import { differenceInMinutes, format } from "date-fns"
import type { Slot } from "@/types/domain"

const CREDIT_MINUTES = 40
export const PERIOD_UNIT_PX = 70
// A card narrower than this truncates its course code (e.g. "4B.3.4") down to nothing — applied per
// lane, not just per column, so a short slot sharing a column with a longer concurrent one still gets
// enough room to stay readable instead of shrinking to its raw, proportional credit width.
const MIN_CARD_PX = 96
// No column — even a lone 1-credit slot with nothing else sharing its period — sits narrower than this.
// A plain per-lane floor wasn't enough on its own: a solo short slot still rendered barely wider than its
// own credit, cramped enough to truncate its course code, and the whole week's column widths visibly
// jumped around every time a slot was added or removed elsewhere. Anchoring every column to "room for a
// 2-credit slot" keeps widths stable and every course code readable by default.
const MIN_COLUMN_PX = 2 * PERIOD_UNIT_PX
const UNSCHEDULED_PX = MIN_COLUMN_PX
export const UNSCHEDULED_COLUMN_KEY = "unscheduled"

export type DayColumn = {
  key: string
  startTime?: string
  endTime?: string
  label: string
  widthPx: number
  /** Credit count the column's width was sized for — the longest concurrent slot (or run of back-to-back
   *  slots) sharing this period. Lets a shorter slot sharing the same column render at its own
   *  proportional width instead of stretching to fill a column that's only wide because of someone else's
   *  longer, concurrent session. */
  credits: number
  /** True only for a day with no slots at all: let its column stretch instead of sitting at a fixed narrow width. */
  flexible?: boolean
}

type TimedSlot = Pick<Slot, "startTime" | "endTime" | "credits">

/** One FT's slots within a period, grouped by start time (a real double-booking shares one group/lane) and sorted. */
function groupByStart<T extends TimedSlot>(slots: T[]): [string, T[]][] {
  const byStart = new Map<string, T[]>()
  for (const slot of slots) {
    const bucket = byStart.get(slot.startTime!)
    if (bucket) bucket.push(slot)
    else byStart.set(slot.startTime!, [slot])
  }
  return [...byStart.entries()].sort(([a], [b]) => a.localeCompare(b))
}

/**
 * Lays one FT's slots (already known to belong to a single period) out left-to-right, in start-time
 * order, as a list of `{ widthPx, gapBeforePx, slots }` lanes — gapBeforePx covers any idle time before
 * this lane so lanes stay time-accurate even when a run of slots doesn't start right at the period's own
 * start. Each lane is at least MIN_CARD_PX wide, which is the whole point: shared by buildDayColumns() (to
 * size the column so nothing it produces can overflow) and buildCellLanes() (to actually render it).
 */
function layoutLanes<T extends TimedSlot>(periodStart: string | undefined, slots: T[]) {
  const groups = groupByStart(slots)
  let cursor = periodStart
  return groups.map(([start, slotsAtStart]) => {
    const gapBeforePx = cursor && start > cursor ? (differenceInMinutes(new Date(start), new Date(cursor)) / CREDIT_MINUTES) * PERIOD_UNIT_PX : 0
    const ownCredits = Math.max(1, ...slotsAtStart.map((s) => s.credits ?? 1))
    const widthPx = Math.max(ownCredits * PERIOD_UNIT_PX, MIN_CARD_PX)
    cursor = slotsAtStart.reduce((acc, s) => (s.endTime! > acc ? s.endTime! : acc), start)
    return { start, widthPx, gapBeforePx, slots: slotsAtStart }
  })
}

/**
 * Which column a slot belongs to: not just an exact start-time match, but whichever column's period
 * actually contains it. Two sequential 1-credit slots (9:55–10:35, then 10:35–11:15) merge into the same
 * column as someone else's one 2-credit slot spanning that same 9:55–11:15 window, instead of each
 * splintering into its own separate, narrower column.
 */
export function columnKeyForSlot(slot: Pick<Slot, "startTime" | "endTime">, columns: DayColumn[]): string {
  if (!slot.startTime || !slot.endTime) return UNSCHEDULED_COLUMN_KEY
  const match = columns.find((col) => col.startTime && col.endTime && slot.startTime! >= col.startTime && slot.startTime! < col.endTime)
  return match?.key ?? UNSCHEDULED_COLUMN_KEY
}

/** Builds the time-block columns for one day, derived from the slots actually scheduled that day (across every FT). */
export function buildDayColumns(daySlots: Slot[]): DayColumn[] {
  const scheduled = daySlots.filter((s): s is Slot & { startTime: string; endTime: string } => Boolean(s.startTime && s.endTime))
  const hasUnscheduled = daySlots.some((s) => !s.startTime || !s.endTime)

  // Merge overlapping AND back-to-back (touching) intervals into one shared period — <= (not <) catches
  // the exact-adjacency case, which is the whole point: two slots that tile a longer one with no gap.
  const sorted = [...scheduled].sort((a, b) => a.startTime.localeCompare(b.startTime))
  const periods: { start: string; end: string; slots: Slot[] }[] = []
  for (const slot of sorted) {
    const last = periods[periods.length - 1]
    if (last && slot.startTime <= last.end) {
      if (slot.endTime > last.end) last.end = slot.endTime
      last.slots.push(slot)
    } else {
      periods.push({ start: slot.startTime, end: slot.endTime, slots: [slot] })
    }
  }

  const columns: DayColumn[] = periods.map(({ start, end, slots }) => {
    const minutes = differenceInMinutes(new Date(end), new Date(start))
    const credits = Math.max(1, Math.round(minutes / CREDIT_MINUTES))
    const durationWidthPx = credits * PERIOD_UNIT_PX

    // The raw duration-based width isn't always enough: if the most fragmented FT sharing this period
    // has several short back-to-back slots, each needing its own MIN_CARD_PX, their combined width can
    // exceed what the period's total duration alone would suggest — so the column has to grow to fit
    // whichever FT's row needs the most room, or that row's cards would overflow it.
    const byFt = new Map<string, Slot[]>()
    for (const slot of slots) {
      const bucket = byFt.get(slot.ft)
      if (bucket) bucket.push(slot)
      else byFt.set(slot.ft, [slot])
    }
    let widestRowPx = durationWidthPx
    for (const ftSlots of byFt.values()) {
      const rowWidthPx = layoutLanes(start, ftSlots).reduce((sum, lane) => sum + lane.gapBeforePx + lane.widthPx, 0)
      widestRowPx = Math.max(widestRowPx, rowWidthPx)
    }

    return {
      key: start,
      startTime: start,
      endTime: end,
      label: `${format(new Date(start), "HH:mm")}–${format(new Date(end), "HH:mm")}`,
      widthPx: Math.max(widestRowPx, MIN_COLUMN_PX),
      credits,
    }
  })

  if (hasUnscheduled) {
    columns.push({ key: UNSCHEDULED_COLUMN_KEY, label: "Unscheduled", widthPx: UNSCHEDULED_PX, credits: 1 })
  }

  if (columns.length === 0) {
    columns.push({ key: UNSCHEDULED_COLUMN_KEY, label: "—", widthPx: MIN_COLUMN_PX, credits: 1, flexible: true })
  }

  return columns
}

export type CellLane = {
  key: string
  widthPx: number
  /** Absent for a pure spacer lane — an empty gap between two of this FT's slots within the same column. */
  slots?: Slot[]
}

/**
 * Lays out one FT's slots within a (possibly wider, shared) day column as left-to-right lanes ordered by
 * start time, with an empty spacer lane standing in for any gap between them. This is what actually
 * places Gita's two 1-credit slots side by side, each at least MIN_CARD_PX wide, within the wider column
 * Kartika's 2-credit slot shares with them — instead of stretching to fill it, stacking on top of each
 * other, or shrinking down to an unreadable sliver.
 */
export function buildCellLanes(cellSlots: Slot[], column: DayColumn): CellLane[] {
  const scheduled = cellSlots.filter((s): s is Slot & { startTime: string; endTime: string } => Boolean(s.startTime && s.endTime))
  const unscheduled = cellSlots.filter((s) => !s.startTime || !s.endTime)

  const rawLanes = layoutLanes(column.startTime, scheduled)
  const lanes: CellLane[] = []

  if (rawLanes.length === 1 && rawLanes[0].gapBeforePx === 0) {
    // The only thing this FT has in this period, starting right at the period's own start — let it fill
    // the whole column instead of sitting at its own narrower minimum width. The lane-splitting above only
    // needs to kick in once there's something else in the row to stay proportional against.
    lanes.push({ key: rawLanes[0].start, widthPx: column.widthPx, slots: rawLanes[0].slots })
  } else {
    for (const lane of rawLanes) {
      if (lane.gapBeforePx > 0) lanes.push({ key: `gap-${lane.start}`, widthPx: lane.gapBeforePx })
      lanes.push({ key: lane.start, widthPx: lane.widthPx, slots: lane.slots })
    }
  }

  if (unscheduled.length > 0) lanes.push({ key: "unscheduled", widthPx: UNSCHEDULED_PX, slots: unscheduled })

  return lanes
}
