import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createAttendanceRecords, fetchAttendance } from "@/data/attendanceRepository"
import type { AttendanceRecord } from "@/types/domain"

const ATTENDANCE_KEY = ["attendance"]

export function useAttendance() {
  return useQuery({ queryKey: ATTENDANCE_KEY, queryFn: fetchAttendance })
}

export function useCreateAttendanceRecords() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (records: Omit<AttendanceRecord, "id">[]) => createAttendanceRecords(records),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ATTENDANCE_KEY }),
  })
}
