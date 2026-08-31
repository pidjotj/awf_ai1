import { useMemo } from "react"
import { format } from "date-fns"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { AttendanceRecord, AttendanceStatus, StepCode } from "@/types/domain"

const ALL_STEPS: StepCode[] = ["A", "B", "C", "D"]

const DOT_STYLES: Record<AttendanceStatus, string> = {
  Present: "bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-300",
  Absent: "bg-muted border-border text-muted-foreground",
  Failed: "bg-red-500/15 border-red-500/50 text-red-700 dark:text-red-300",
  Remedial: "bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300",
  Optional: "bg-sky-500/15 border-sky-500/50 text-sky-700 dark:text-sky-300",
  Partial: "bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300",
  Planned: "border-dashed text-muted-foreground",
}

function StepCell({
  step,
  records,
  onNavigate,
}: {
  step: StepCode
  records: AttendanceRecord[]
  onNavigate?: (record: AttendanceRecord) => void
}) {
  const attempts = records.filter((r) => r.step === step).sort((a, b) => a.attempt - b.attempt)

  if (attempts.length === 0) {
    return (
      <span className="flex size-6 items-center justify-center rounded text-[10px] text-muted-foreground/30">
        {step}
      </span>
    )
  }

  const latest = attempts[attempts.length - 1]
  const clickable = Boolean(latest.slotId && onNavigate)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          onClick={() => clickable && onNavigate?.(latest)}
          className={`flex size-6 items-center justify-center rounded border text-[10px] font-medium ${DOT_STYLES[latest.status]} ${
            clickable ? "cursor-pointer hover:ring-1 hover:ring-primary/40" : "cursor-default"
          }`}
        >
          {step}
          {step === "C" && attempts.length > 1 && <sup className="text-[8px]">{attempts.length}</sup>}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-0.5">
          {attempts.map((a) => (
            <div key={a.attempt}>
              Step {step}
              {step === "C" ? ` · attempt ${a.attempt}/3` : ""}: {a.status === "Planned" ? "Awaiting grade" : a.status}
              {a.date ? ` — ${format(new Date(a.date), "dd/MM/yyyy")}` : ""}
            </div>
          ))}
          {clickable && <div className="pt-0.5 text-muted-foreground">Click to {latest.status === "Planned" ? "grade" : "view"}</div>}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

type AttendanceMatrixProps = {
  records: AttendanceRecord[]
  onNavigate?: (record: AttendanceRecord) => void
}

export function AttendanceMatrix({ records, onNavigate }: AttendanceMatrixProps) {
  const courses = useMemo(() => [...new Set(records.map((r) => r.course))].sort(), [records])
  const iats = useMemo(() => [...new Set(records.map((r) => r.iat))].sort(), [records])

  const cellsByCourseAndIat = useMemo(() => {
    const map = new Map<string, AttendanceRecord[]>()
    for (const record of records) {
      const key = `${record.course}__${record.iat}`
      const bucket = map.get(key)
      if (bucket) bucket.push(record)
      else map.set(key, [record])
    }
    return map
  }, [records])

  if (courses.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">No attendance records match these filters.</p>
  }

  return (
    <TooltipProvider>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 border-r border-b bg-muted/50 p-2 text-left font-medium">Course</th>
              {iats.map((iat) => (
                <th key={iat} className="min-w-28 border-r border-b bg-muted/50 p-2 text-center font-medium">
                  {iat}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course}>
                <td className="sticky left-0 z-10 border-r border-b bg-background p-2 font-medium whitespace-nowrap">
                  {course}
                </td>
                {iats.map((iat) => {
                  const cellRecords = cellsByCourseAndIat.get(`${course}__${iat}`) ?? []
                  return (
                    <td key={iat} className="border-r border-b p-1.5">
                      {cellRecords.length === 0 ? (
                        <span className="block text-center text-muted-foreground/30">—</span>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          {ALL_STEPS.map((step) => (
                            <StepCell key={step} step={step} records={cellRecords} onNavigate={onNavigate} />
                          ))}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  )
}
