import {
  mockCampuses,
  mockCourses,
  mockCourseTypes,
  mockFTs,
  mockGrades,
  mockHolidays,
  mockIATs,
  mockRooms,
  mockSteps,
} from "@/data/mockData"
import { fetchAllPages, isLive, readLookupDisplayValue, toDateOnly } from "@/data/dataverseHelpers"
import {
  Crf82_citiesService,
  Crf82_coursemodulesModel,
  Crf82_coursemodulesService,
  Crf82_coursetypesService,
  Crf82_ftsService,
  Crf82_gradesService,
  Crf82_holidaiesService,
  Crf82_iatsService,
  Crf82_roomsService,
  Crf82_stepsService,
} from "@/generated"
import type { Course, CourseObjective, CourseTypeCode, FrenchTeacher, StepCode } from "@/types/domain"

// Read-only lookups backing the Dataverse reference tables. `npm run dev` always reads the mock seed;
// a production build reads the real tables (see src/data/dataverseHelpers.ts for why).

// NOTE: reads from the "Cities" Dataverse table, not "Campuses" — the Campuses table's own generated
// schema locally pointed at the wrong entity set (an artifact from however the two tables were
// created), and Cities is where the real CIMAHI/MALANG rows actually live. If a real, correctly-wired
// Campuses table gets set up later, swap Crf82_citiesService back for Crf82_campusesService here.
export async function fetchCampuses() {
  if (!isLive) return mockCampuses
  const rows = await fetchAllPages(Crf82_citiesService.getAll)
  return rows.map((r) => ({ title: r.crf82_cityname ?? "" }))
}

export async function fetchCourseTypes() {
  if (!isLive) return mockCourseTypes
  const rows = await fetchAllPages(Crf82_coursetypesService.getAll)
  return rows.map((r) => ({ title: (r.crf82_abbreviationcode ?? "") as CourseTypeCode }))
}

export async function fetchGrades() {
  if (!isLive) return mockGrades
  const rows = await fetchAllPages(Crf82_gradesService.getAll)
  return rows.map((r) => ({ title: r.crf82_gradelevel ?? "" }))
}

export async function fetchSteps() {
  if (!isLive) return mockSteps
  const rows = await fetchAllPages(Crf82_stepsService.getAll)
  return rows.map((r) => ({ title: (r.crf82_documenttitle ?? "") as StepCode }))
}

export async function fetchRooms() {
  if (!isLive) return mockRooms
  const rows = await fetchAllPages(Crf82_roomsService.getAll)
  return rows.map((r) => ({ title: r.crf82_roomname ?? "" }))
}

export async function fetchFTs(): Promise<FrenchTeacher[]> {
  if (!isLive) return mockFTs
  const rows = await fetchAllPages(Crf82_ftsService.getAll)
  // STALE GENERATED SCHEMA: same issue as IATAttendance's Iat/Step columns (see
  // attendanceRepository.ts) — the generated model describes "Campus" as a lookup surfaced via the
  // virtual crf82_campuslocationname field, but the confirmed real logical name on the live FT table is
  // crf82_campuslocation. Reading it defensively via readLookupDisplayValue() rather than a plain field
  // access, since it's still unconfirmed whether that column is plain text or an actual Dataverse lookup
  // relationship (which would need the OData annotation instead) — see that helper's own comment.
  //
  // TODO: the FT table has no Microsoft-account/UPN column yet, so `microsoftAccount` can't be
  // populated here — src/store/realIdentity.ts falls back to the raw Entra name for every FT until a
  // real column is added on the Dataverse side and its logical name is confirmed (do not guess it).
  return rows.map((r) => ({
    title: r.crf82_studentname ?? "",
    campus: readLookupDisplayValue(r as unknown as Record<string, unknown>, "crf82_campuslocation"),
  }))
}

export async function fetchIATs() {
  if (!isLive) return mockIATs
  const rows = await fetchAllPages(Crf82_iatsService.getAll)
  // Same stale-schema issue as FT's Campus column (see fetchFTs() above) — the IATs table looks like the
  // same template, so it very likely has the same real logical name (crf82_campuslocation, not
  // crf82_campuslocationname). Read defensively rather than assume: an empty result here silently emptied
  // every campus's IAT list, which is why the New Evaluation form had no IAT to pick from.
  return rows.map((r) => ({
    title: r.crf82_studentname ?? "",
    campus: readLookupDisplayValue(r as unknown as Record<string, unknown>, "crf82_campuslocation"),
    group: r.crf82_groupname,
  }))
}

export async function fetchHolidays() {
  if (!isLive) return mockHolidays
  const rows = await fetchAllPages(Crf82_holidaiesService.getAll)
  return rows.map((r) => ({ date: toDateOnly(r.crf82_holidaydate), name: r.crf82_holidaytitle ?? "" }))
}

/**
 * crf82_trainingobjectives (the name the generated model already used — confirmed correct directly
 * against the table's column list) stores a shape different from what this app expects: a flat array of
 * plain description strings (e.g. `["Understand the origin of winds...", ...]`), not `{category, text}`
 * objects — there's no separate category in the source data at all, so category is left blank rather than
 * invented.
 */
function parseObjectives(json?: string): CourseObjective[] | undefined {
  if (!json) return undefined
  try {
    const raw: unknown = JSON.parse(json)
    if (!Array.isArray(raw)) return undefined
    return raw.map((entry): CourseObjective =>
      typeof entry === "string" ? { category: "", text: entry } : (entry as CourseObjective)
    )
  } catch {
    return undefined
  }
}

export async function fetchCourses(): Promise<Course[]> {
  if (!isLive) return mockCourses
  const rows = await fetchAllPages(Crf82_coursemodulesService.getAll)
  return rows.map((r) => ({
    id: r.crf82_moduletitle ?? "",
    grade: r.crf82_gradelevel ?? "",
    courseType: (Crf82_coursemodulesModel.Crf82_coursemodulescrf82_coursetype[
      r.crf82_coursetype as keyof typeof Crf82_coursemodulesModel.Crf82_coursemodulescrf82_coursetype
    ] ?? "TH") as CourseTypeCode,
    primaryCMI: r.crf82_primarycmi || undefined,
    secondaryCMI: r.crf82_secondarycmi || undefined,
    optionalCMI: r.crf82_optionalcmi || undefined,
    primaryMLG: r.crf82_primarymlg || undefined,
    secondaryMLG: r.crf82_secondarymlg || undefined,
    optionalMLG: r.crf82_optionalmlg || undefined,
    thCredit: r.crf82_thcredit ?? undefined,
    pwlCredit: r.crf82_pwlcredit ?? undefined,
    trainingObjectives: parseObjectives(r.crf82_trainingobjectives),
  }))
}
