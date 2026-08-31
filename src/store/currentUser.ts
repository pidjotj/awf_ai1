import { create } from "zustand"
import { persist } from "zustand/middleware"
import { mockFTs } from "@/data/mockData"
import { MANAGERS } from "@/data/managers"

// Stands in for real identity until the Power Platform connection provides an authenticated
// user (via the SDK's app context). Every "who did this" concept in the app — leave approval
// rights, audit log attribution — reads from here in the meantime.
export const IDENTITIES = [...new Set([...mockFTs.map((ft) => ft.title), ...MANAGERS])]

type CurrentUserState = {
  name: string
  setName: (name: string) => void
}

export const useCurrentUser = create<CurrentUserState>()(
  persist(
    (set) => ({
      name: IDENTITIES[0],
      setName: (name) => set({ name }),
    }),
    { name: "awf-current-user" }
  )
)
