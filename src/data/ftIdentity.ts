import { mockFTs } from "@/data/mockData"

// Maps a known Microsoft/Entra full name to its FT's short app name (e.g. "Jonathan PASCAL" -> "Jonathan")
// — built from mockFTs' `microsoftAccount` field, the same hand-confirmed mapping already used for
// dev/mock data. This is a stopgap: the live FT table has no Microsoft-account column yet (see
// referenceData.ts's fetchFTs()), so today, in production, a signed-in FT still submits actions under
// their raw Entra full name — confirmed live: a leave request from "Jonathan PASCAL" didn't block his
// Planning row, which is keyed by his short name "Jonathan". Used in two places: resolving the signed-in
// user's short name up front (src/store/realIdentity.ts) and normalizing an already-stored full name back
// to its short form for matching (e.g. Planning's leave lookup below), so both old and new records line up
// with the short names the rest of the app uses everywhere else. Safe to delete once fetchFTs() can supply
// microsoftAccount itself — resolveToFtName() already falls back to that live lookup afterwards.
const KNOWN_FT_ACCOUNTS: Record<string, string> = Object.fromEntries(
  mockFTs
    .filter((ft): ft is typeof ft & { microsoftAccount: string } => Boolean(ft.microsoftAccount))
    .map((ft) => [ft.microsoftAccount.trim().toLowerCase(), ft.title])
)

/** Resolves a raw identity name (an FT's real full name, or already a short app name) to the short FT
 *  name the rest of the app uses, falling back to the input unchanged if it's not a known FT account. */
export function resolveFtDisplayName(name: string): string {
  return KNOWN_FT_ACCOUNTS[name.trim().toLowerCase()] ?? name
}
