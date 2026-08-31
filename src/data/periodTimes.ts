// Standard daily period start times per campus, for this semester — hand-maintained, expected to
// change next semester. These only pre-fill the "Start time" field; any time can still be typed by hand.
export const CAMPUS_PERIOD_TIMES: Record<string, string[]> = {
  CIMAHI: ["08:20", "09:00", "09:55", "10:35", "11:15"],
}

// Days each campus actually teaches on — Cimahi runs Monday–Thursday, Malang Tuesday–Friday. Values are
// date-fns/JS `getDay()` weekday numbers (0 = Sunday … 6 = Saturday). Falls back to the full Mon–Fri
// week for any campus not listed here.
export const CAMPUS_WEEKDAYS: Record<string, number[]> = {
  CIMAHI: [1, 2, 3, 4],
  MALANG: [2, 3, 4, 5],
}
export const DEFAULT_WEEKDAYS = [1, 2, 3, 4, 5]

// A manual preference, not alphabetical or campus-assignment order — the Planning grid's FT rows follow
// this order where an FT is listed, falling back to whatever order fetchFTs() returns for anyone not
// listed here.
export const FT_DISPLAY_ORDER = ["Etienne", "Jonathan", "Jeremy"]
