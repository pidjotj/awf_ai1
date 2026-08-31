import { useQuery } from "@tanstack/react-query"
import { fetchAuditLog } from "@/data/auditLogRepository"

export function useAuditLog() {
  return useQuery({ queryKey: ["audit-log"], queryFn: fetchAuditLog })
}
