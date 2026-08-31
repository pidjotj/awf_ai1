import * as app from "@microsoft/power-apps/app"
import { fetchFTs } from "@/data/referenceData"
import { resolveFtDisplayName } from "@/data/ftIdentity"
import { useCurrentUser } from "./currentUser"

const CONTEXT_TIMEOUT_MS = 4000

/**
 * Matches the signed-in Entra identity to a known FT's short app name (e.g. "Jeremy PIDJOT" ->
 * "Jeremy"), so the rest of the app — leave approval rights, audit log attribution, the Admin gate —
 * keeps working against the same short names it always has, whether the name came from the dev picker
 * or a real signed-in user. Compares against both `fullName` and `userPrincipalName` since either one
 * might be what got typed into an FT's `microsoftAccount` field, and matches case-insensitively for the
 * same reason.
 *
 * Checks the hand-confirmed src/data/ftIdentity.ts map first — the live FT table has no Microsoft-account
 * column yet, so fetchFTs()'s own microsoftAccount lookup below always misses in production today; without
 * this stopgap every FT would submit actions under their raw Entra name (confirmed live: it's exactly why
 * a leave request from "Jonathan PASCAL" didn't block his "Jonathan" row on the Planning grid). Falls back
 * to the raw Entra name only if neither this map nor the live FT table recognizes the account.
 */
async function resolveToFtName(fullName?: string, userPrincipalName?: string): Promise<string | undefined> {
  const candidates = [fullName, userPrincipalName].filter((v): v is string => !!v)
  if (candidates.length === 0) return undefined

  for (const candidate of candidates) {
    const resolved = resolveFtDisplayName(candidate)
    if (resolved !== candidate) return resolved
  }

  const normalized = candidates.map((c) => c.trim().toLowerCase())
  const fts = await fetchFTs()
  const match = fts.find((ft) => ft.microsoftAccount && normalized.includes(ft.microsoftAccount.trim().toLowerCase()))
  return match?.title ?? fullName ?? userPrincipalName
}

/**
 * Signing into Power Apps *is* this app's authentication — once actually hosted there, the SDK can
 * tell us who's signed in instead of relying on the dev picker. `app.getContext()` talks to the Power
 * Apps host via postMessage, which only exists when the app is embedded in that host: outside of it
 * (e.g. local `npm run dev`, or a production build previewed standalone) the call never resolves at
 * all, so this only runs in a production build, and still races a timeout as a safety net.
 */
export async function syncRealIdentity() {
  if (!import.meta.env.PROD) return

  try {
    const context = await Promise.race([
      app.getContext(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Power Apps host context timed out")), CONTEXT_TIMEOUT_MS)),
    ])
    const name = await resolveToFtName(context.user.fullName, context.user.userPrincipalName)
    if (name) useCurrentUser.getState().setName(name)
  } catch {
    // No host answered in time — keep whatever identity was already persisted rather than leaving
    // the header stuck on a loading state.
  }
}
