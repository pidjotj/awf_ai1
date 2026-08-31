// Only these two can accept or refuse a leave request. Neither is an FT (confirmed by the user — Olivier
// Autran and Antoine Des Deserts are managers only), so neither gets the FT short-name resolution
// realIdentity.ts applies (see src/data/mockData.ts) — both are matched by their full name, which is what
// the identity picker/host actually produces for them.
export const MANAGERS = ["Olivier Autran", "Antoine Des Deserts"] as const

export function isManager(name: string): boolean {
  return (MANAGERS as readonly string[]).includes(name)
}
