import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createBlockedPeriod, fetchBlockedPeriods } from "@/data/blockedPeriodsRepository"
import type { NewBlockedPeriod } from "@/types/domain"

const BLOCKED_PERIODS_KEY = ["blocked-periods"]

export function useBlockedPeriods() {
  return useQuery({ queryKey: BLOCKED_PERIODS_KEY, queryFn: fetchBlockedPeriods })
}

export function useCreateBlockedPeriod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (record: NewBlockedPeriod) => createBlockedPeriod(record),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BLOCKED_PERIODS_KEY })
      // Blocking a period can cascade-cancel existing slots — make sure the grid picks that up too.
      queryClient.invalidateQueries({ queryKey: ["slots"] })
    },
  })
}
