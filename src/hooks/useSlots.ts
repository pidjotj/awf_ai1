import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createSlot, deleteSlot, fetchSlots, updateSlot } from "@/data/slotsRepository"
import type { NewSlot, Slot } from "@/types/domain"

const SLOTS_KEY = ["slots"]

export function useSlots() {
  return useQuery({ queryKey: SLOTS_KEY, queryFn: fetchSlots })
}

export function useCreateSlot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (record: NewSlot) => createSlot(record),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SLOTS_KEY }),
  })
}

export function useUpdateSlot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Partial<Slot> }) => updateSlot(id, changes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SLOTS_KEY }),
  })
}

export function useDeleteSlot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSlot(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SLOTS_KEY }),
  })
}
