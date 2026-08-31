# SharePoint import — AWF Planning

15 CSVs, one per list. Most are generated straight from the app's current mock data (`src/data/mock*.ts`)
so the lists open with real, already-consistent starting content instead of empty tables.

**`Slots.csv` is different from the rest** — its 763 rows are your original 10 seed rows plus 753 real
delivered sessions pulled directly out of `IAT_attendance_sheet V03.xlsx` (the 12 `TH_CMI`/`PW_CMI`/
`TH_MLG`/`PW_MLG` × Grade 10/11/12 tabs), not mock data. None of the fabricated rows I added earlier in
this project purely for local UI testing (ids 11+ in the app's old mock data) are in here — that stayed
local, this is the real thing. Details:

- **One row per (lesson, step, date) that actually has a diffusion date in the sheet.** Steps A/B/D are
  batch-level in the source (one date for the whole group), so those rows have no `Iat`. Step C is
  per-IAT and per-attempt (`Iteration` 1/2/3), read from that IAT's own C1/C2/C3 date column — this is
  where the workbook's structure actually lets me tell attempts apart correctly, unlike the PDF text.
- **`Validated`** on Step C rows comes from that same IAT's P/F mark at the matching attempt column:
  `TRUE` for a Present mark, `FALSE` for Failed, blank for anything else (Remedial/Optional/Absent/
  Partial) since those don't map cleanly to pass/fail — worth a manual look if you want them resolved.
- **`FT`, `Room`, `StartTime`, `EndTime` are blank** on every new row, exactly as you asked — the sheet
  doesn't record who taught it or what room, only that it happened and when. `Credits` is still filled
  in from `Courses.csv`'s matching TH/PWL credit weight.
- **Two things surfaced that need your call, not a guess from me:**
  - 5 lesson codes appear in the workbook but not in `Courses.csv` — `10A.1.1`, `10A.1.2`, `10A.1.3`,
    `3A.3.1`, `3A.3.2`. Their 39 rows are still included (real dates matter more than missing metadata)
    but `Credits` is blank on all of them since there's nothing to look up.
  - Two Malang IATs in the sheet — **Annisa** and **Akhmad** — aren't in `IAT.csv` at all; the roster
    there currently has **Riris** and **Rifqi** instead, who never appear in this workbook. I didn't
    guess a mapping between them (renaming real people is not something to get wrong), so `IAT.csv`
    and these rows are inconsistent until you tell me whether the roster changed or the old list was
    wrong.

**`IATAttendance.csv` is the same idea** — its 1357 rows are all read straight from the same workbook,
replacing the 27 rows that were there before (an explicitly partial, hand-transcribed sample from
screenshots, not something to preserve alongside the real thing). One row per IAT who has an actual
mark (P/A/O/F/R/X) for a given lesson/step/attempt — Steps A/B/D use the shared batch date, Step C uses
that IAT's own attempt date, same as `Slots.csv`. `SlotId` is filled in wherever that exact
(course, step, date) — or for Step C, (course, IAT, attempt, date) — matches a row in `Slots.csv`
(1312 of 1357 do); the other 45 have a status mark but no diffusion date recorded in the sheet, so
there's nothing to link to and `Date`/`SlotId` are both blank on those. Same two open questions apply
here as above (the 5 missing course codes, and Annisa/Akhmad vs. Riris/Rifqi).

## How to import each one

In SharePoint: **New list → From Excel/CSV** (or create the list first, then **Grid view → paste**).
The first row of every CSV is the header row SharePoint will use as the column names.

**Import in this order** — several lists are referenced by others as plain text (see "About the
`LegacyId`/foreign-key columns" below), so getting the reference lists in first makes the rest easier
to sanity-check as you go:

1. `Campuses.csv`, `CourseTypes.csv`, `Grades.csv`, `Steps.csv`, `Rooms.csv`, `FT.csv`, `IAT.csv`, `IndonesianHolidays.csv` — no dependencies, no decisions.
2. `Courses.csv`
3. `Slots.csv`
4. `IATAttendance.csv`, `LeaveRequests.csv`, `BlockedPeriods.csv`
5. `EvaluationSheets.csv`, `AuditLog.csv` — header row only, intentionally empty (see below)

## Column notes

- **`Title`** is SharePoint's built-in required column. Where a row has a natural name (Campus, Room,
  BlockedPeriod...) it holds that name; everywhere else it just repeats the row's `LegacyId` so the
  column stays populated. Safe to hide via list settings if you don't want it showing in views.
- **`LegacyId`** is the id each row had in the app's mock data, kept only so cross-list references stay
  readable — e.g. `IATAttendance.SlotId` matches a `Slots.LegacyId` value. These are plain text, not
  SharePoint Lookup columns; wiring real Lookup relationships is a follow-up step once both lists exist
  with real SharePoint item IDs, not something a CSV import can set up on its own.
- **`TrainingObjectivesJson`** (Courses) and **`ObjectivesJson`** (EvaluationSheets) hold a JSON array as
  plain text — these are variable-length per row, so they weren't flattened into fixed columns. Make
  both **Multiple lines of text** columns in SharePoint.
- **`Status`, `Type`, `Step`, `CourseType`, `CancelledBy`** and similar fixed-vocabulary columns read
  cleanly as plain text on import; turning them into SharePoint **Choice** columns afterward (matching
  the values already in the data) gets you dropdown entry and validation for free.
- **Boolean columns** (`Validated`, and `Passed` once EvaluationSheets has rows) are `TRUE`/`FALSE`/blank
  — blank means "not applicable" (e.g. a Step A/B slot, which has no pass/fail concept), not `FALSE`.
  Make these **Yes/No** columns; SharePoint reads `TRUE`/`FALSE` correctly and leaves blank cells unset.
- **`EvaluationSheets.csv` and `AuditLog.csv` are header-only on purpose.** Evaluation Sheets is a new
  feature with no historical data to backfill; the Audit Log is meant to start recording from when the
  app actually goes live, not before. Import these to get the right columns in place, not for their
  (empty) rows.
- `EvaluationSheets.csv`'s four program-ownership scores are flattened into their own columns
  (`GeneralKnowledge`, `TheoreticalUnderstanding`, `PracticalUnderstanding`, `LessonAppropriation`)
  rather than JSON, since that shape never varies — make each a **Choice** column: `1`, `2`, `3`, `4`,
  `5`, `N/A`.

## Regenerating

The CSVs are produced by loading the real mock TypeScript modules through esbuild (not by regex-parsing
the source), so they can't drift from what the app actually seeds. If you ask Claude to "regenerate the
SharePoint CSVs," that's the approach it'll repeat.
