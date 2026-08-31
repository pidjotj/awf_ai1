// Who can see the Admin page (and the Audit Log it links to). Matched case-insensitively against the
// current identity's name. "Jeremy" is matched by his short FT name — the signed-in identity resolves
// to that short name whenever a Microsoft account is linked to an FT record (see
// src/store/realIdentity.ts) — while "Antoine Des Deserts" isn't an FT at all, so his full name is what
// the identity picker/host actually produces for him.
export const ADMINS = ["Jeremy", "Antoine Des Deserts"] as const

export function isAdmin(name: string): boolean {
  const normalized = name.trim().toLowerCase()
  return ADMINS.some((admin) => admin.toLowerCase() === normalized)
}
