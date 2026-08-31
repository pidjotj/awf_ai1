import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createEvaluationSheet, fetchEvaluationSheets } from "@/data/evaluationSheetsRepository"
import type { NewEvaluationSheet } from "@/types/domain"

const EVALUATION_SHEETS_KEY = ["evaluation-sheets"]

export function useEvaluationSheets() {
  return useQuery({ queryKey: EVALUATION_SHEETS_KEY, queryFn: fetchEvaluationSheets })
}

export function useCreateEvaluationSheet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (record: NewEvaluationSheet) => createEvaluationSheet(record),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EVALUATION_SHEETS_KEY })
      queryClient.invalidateQueries({ queryKey: ["slots"] })
      queryClient.invalidateQueries({ queryKey: ["attendance"] })
    },
  })
}
