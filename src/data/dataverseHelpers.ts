import type { IOperationResult } from "@microsoft/power-apps/data"

// Every repository in this app follows the same rule: `npm run dev` never touches the real Dataverse
// tables (so testing locally can never corrupt or spam real records) — only a production build (what
// `pac code push` deploys) reads and writes for real. Matches the same PROD/DEV split already used for
// the signed-in identity (see src/store/realIdentity.ts).
export const isLive = import.meta.env.PROD

/** Unwraps a Dataverse IOperationResult, throwing with a readable message if the call failed. */
export function unwrap<T>(result: IOperationResult<T>): T {
  if (!result.success) {
    const message = result.error instanceof Error ? result.error.message : String(result.error ?? "Dataverse request failed")
    throw new Error(message)
  }
  return result.data
}

/**
 * `Service.getAll()` only returns one page (500 rows by default) and hands back a `skipToken` for the
 * rest — every repository was calling it once and silently dropping anything past row 500. Real tables
 * here (Slots, IATAttendance) are already well past that, so this was truncating them, e.g. cutting off
 * an entire campus if its rows happened to sort after the first 500. This loops until there's no
 * `skipToken` left, so every repository gets the full table regardless of size.
 */
export async function fetchAllPages<T>(getAll: (options?: { skipToken?: string }) => Promise<IOperationResult<T[]>>): Promise<T[]> {
  const results: T[] = []
  let skipToken: string | undefined
  do {
    const result: IOperationResult<T[]> = await getAll(skipToken ? { skipToken } : undefined)
    results.push(...unwrap(result))
    skipToken = result.skipToken
  } while (skipToken)
  return results
}

/**
 * Dataverse can echo a "Date only" column back as a full ISO timestamp (e.g. "2026-08-24T00:00:00Z")
 * even though it has no real time component — confirmed on Slots' Date column, which was silently
 * failing every `slot.date === "2026-08-24"` comparison in the Planning grid because of the trailing
 * `T00:00:00Z`. Trimming to the calendar-date prefix keeps it comparable to the plain "yyyy-MM-dd"
 * strings the rest of the app uses (date-fns' `format(d, "yyyy-MM-dd")`). A no-op if the value is already
 * bare, so safe to apply to any date-only field regardless of which shape it happens to come back as.
 */
export function toDateOnly(raw?: string): string {
  return raw ? raw.slice(0, 10) : ""
}

/** Reverse-looks-up a Dataverse choice column's numeric code from its label (e.g. "TH" -> 0). */
export function choiceCodeFor(map: Record<number, string>, label: string): number {
  const entry = Object.entries(map).find(([, value]) => value === label)
  if (!entry) throw new Error(`Unknown choice value "${label}" — not one of ${Object.values(map).join(", ")}`)
  return Number(entry[0])
}

// Indonesia (WIB, UTC+7 — both CIMAHI and MALANG are in Java, no daylight saving ever) is a fixed offset,
// so a hand-rolled +7h conversion is exact and never drifts; no timezone library needed for this one
// value. Everywhere else in the app (src/pages/Planning's grid/overlap/sort logic), Slot.startTime/
// endTime are naive "yyyy-MM-ddTHH:mm" strings meaning Indonesian wall-clock time, with no zone suffix —
// that convention only breaks down at the Dataverse boundary, since a real "Date and time" column stores
// an absolute instant and doesn't know "no zone suffix" is supposed to mean WIB. Confirmed live: typing
// 09:20 produced a slot stored/displayed several hours off, because the naive string got silently
// reinterpreted along the way. These two functions are the only place that needs to know about UTC+7,
// so every other file keeps working with naive strings exactly as before.
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000

/** Turns a naive "yyyy-MM-ddTHH:mm" (meant as Indonesian wall-clock time) into an explicit, unambiguous
 *  UTC+7 instant for Dataverse to store — instead of leaving it to guess/reinterpret the missing zone. */
export function toIndonesiaInstant(naive: string): string {
  return `${naive}:00+07:00`
}

/** Turns the instant Dataverse hands back into the naive "yyyy-MM-ddTHH:mm" Indonesian wall-clock string
 *  the rest of the app expects — instead of leaving display code to interpret it in the viewer's own
 *  browser timezone (wrong for anyone outside Indonesia, which is most of this app's real users). */
export function fromIndonesiaInstant(instant?: string): string | undefined {
  if (!instant) return undefined
  const wib = new Date(new Date(instant).getTime() + WIB_OFFSET_MS)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${wib.getUTCFullYear()}-${pad(wib.getUTCMonth() + 1)}-${pad(wib.getUTCDate())}T${pad(wib.getUTCHours())}:${pad(wib.getUTCMinutes())}`
}

/**
 * Reads a lookup/reference column's display text defensively. Every one of these "which field actually
 * holds the campus name" bugs found in this app so far turned out to be the same underlying issue in a
 * different shape — sometimes a plain field, sometimes a virtual `<field>name` property, sometimes only
 * the OData formatted-value annotation on the raw `_<field>_value` GUID — and the generated schema hasn't
 * reliably told us which. Rather than guess and get burned again, this tries every shape actually seen on
 * this project instead of picking one. `field` is the column's base logical name (e.g.
 * "crf82_campuslocation"), without any `_value` / `@...FormattedValue` suffix.
 */
export function readLookupDisplayValue(row: Record<string, unknown>, field: string): string | undefined {
  const direct = row[field]
  if (typeof direct === "string" && direct) return direct

  const nameField = row[`${field}name`]
  if (typeof nameField === "string" && nameField) return nameField

  const annotation = row[`_${field}_value@OData.Community.Display.V1.FormattedValue`]
  if (typeof annotation === "string" && annotation) return annotation

  return undefined
}
