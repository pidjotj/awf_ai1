import { useMemo, useState } from "react"
import { format } from "date-fns"
import { DownloadIcon } from "lucide-react"

import { useSlots } from "@/hooks/useSlots"
import { batchLabelForGrade } from "@/data/batchMapping"
import { downloadCsv } from "@/lib/exportCsv"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SessionsByStepChart } from "./SessionsByStepChart"
import type { CancelledBy, CourseTypeCode, Slot, StepCode } from "@/types/domain"

const ALL_TYPES: CourseTypeCode[] = ["TH", "PW"]
const ALL_CANCELLED_BY: CancelledBy[] = ["FT", "IAT", "Other"]

function toggleInSet<T>(set: Set<T>, value: T) {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="w-16 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-3">{children}</div>
    </div>
  )
}

function FilterCheckbox({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange: () => void }) {
  return (
    <label className="flex items-center gap-1.5 text-sm font-normal">
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
      {label}
    </label>
  )
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tracking-tight">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  )
}

export default function ReportPage() {
  const { data: slots } = useSlots()

  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [gradeFilter, setGradeFilter] = useState<Set<string>>(new Set())
  const [typeFilter, setTypeFilter] = useState<Set<CourseTypeCode>>(new Set())
  const [campusFilter, setCampusFilter] = useState<Set<string>>(new Set())

  const grades = useMemo(() => [...new Set((slots ?? []).map((s) => s.grade))].sort(), [slots])
  const campuses = useMemo(() => [...new Set((slots ?? []).map((s) => s.campus))].sort(), [slots])

  const filtered = useMemo(() => {
    return (slots ?? []).filter((s) => {
      if (dateFrom && s.date < dateFrom) return false
      if (dateTo && s.date > dateTo) return false
      if (gradeFilter.size > 0 && !gradeFilter.has(s.grade)) return false
      if (typeFilter.size > 0 && !typeFilter.has(s.courseType)) return false
      if (campusFilter.size > 0 && !campusFilter.has(s.campus)) return false
      return true
    })
  }, [slots, dateFrom, dateTo, gradeFilter, typeFilter, campusFilter])

  const completed = useMemo(() => filtered.filter((s) => s.status === "Completed"), [filtered])
  const cancelled = useMemo(() => filtered.filter((s) => s.status === "Cancelled"), [filtered])
  const planned = useMemo(() => filtered.filter((s) => s.status === "Planned"), [filtered])

  function countByStep(items: Slot[]) {
    const counts = { A: 0, B: 0, C: 0, D: 0 } as Record<StepCode, number>
    for (const s of items) if (s.step) counts[s.step] += 1
    return counts
  }

  const completedStepCounts = useMemo(() => countByStep(completed), [completed])
  const scheduledStepCounts = useMemo(() => countByStep(planned), [planned])
  const cancelledStepCounts = useMemo(() => countByStep(cancelled), [cancelled])

  const cancelledByReason = useMemo(() => {
    const counts = { FT: 0, IAT: 0, Other: 0 } as Record<CancelledBy, number>
    for (const s of cancelled) counts[s.cancelledBy ?? "Other"] += 1
    return counts
  }, [cancelled])

  const sortedCompleted = useMemo(
    () => [...completed].sort((a, b) => a.date.localeCompare(b.date)),
    [completed]
  )
  const sortedCancelled = useMemo(
    () => [...cancelled].sort((a, b) => a.date.localeCompare(b.date)),
    [cancelled]
  )

  function exportDelivered() {
    downloadCsv(
      "delivered-courses.csv",
      ["Date", "Course", "Batch", "Step", "FT", "IAT", "Campus", "Credits"],
      sortedCompleted.map((s: Slot) => [
        s.date,
        s.course,
        batchLabelForGrade(s.grade),
        s.step ?? "",
        s.ft,
        s.iat ?? "",
        s.campus,
        s.credits,
      ])
    )
  }

  function exportCancelled() {
    downloadCsv(
      "cancelled-sessions.csv",
      ["Date", "Course", "Step", "FT", "Campus", "Cancelled by", "Reason"],
      sortedCancelled.map((s: Slot) => [
        s.date,
        s.course,
        s.step ?? "",
        s.ft,
        s.campus,
        s.cancelledBy ?? "Other",
        s.cancelReason ?? "",
      ])
    )
  }

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Report</h1>
        <p className="text-sm text-muted-foreground">Sessions delivered and cancelled over a chosen period.</p>
      </div>

      <Card size="sm">
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
            </div>
          </div>

          <FilterRow label="Campus">
            {campuses.map((c) => (
              <FilterCheckbox
                key={c}
                label={c}
                checked={campusFilter.has(c)}
                onCheckedChange={() => setCampusFilter((prev) => toggleInSet(prev, c))}
              />
            ))}
          </FilterRow>
          <FilterRow label="Grade">
            {grades.map((g) => (
              <FilterCheckbox
                key={g}
                label={g}
                checked={gradeFilter.has(g)}
                onCheckedChange={() => setGradeFilter((prev) => toggleInSet(prev, g))}
              />
            ))}
          </FilterRow>
          <FilterRow label="Type">
            {ALL_TYPES.map((t) => (
              <FilterCheckbox
                key={t}
                label={t === "PW" ? "PWL" : t}
                checked={typeFilter.has(t)}
                onCheckedChange={() => setTypeFilter((prev) => toggleInSet(prev, t))}
              />
            ))}
          </FilterRow>
          <p className="text-xs text-muted-foreground">Leave a group unchecked to include every value in it.</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Completed" value={completed.length} />
        <StatTile label="Cancelled" value={cancelled.length} />
        <StatTile label="Still planned" value={planned.length} />
        <StatTile label="Total sessions" value={filtered.length} />
      </div>

      <Card>
        <CardContent>
          <p className="mb-2 text-sm font-medium">Sessions by step</p>
          <SessionsByStepChart
            completed={completedStepCounts}
            scheduled={scheduledStepCounts}
            cancelled={cancelledStepCounts}
          />
        </CardContent>
      </Card>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium">Courses delivered ({sortedCompleted.length})</h2>
          <Button size="sm" variant="outline" onClick={exportDelivered} disabled={sortedCompleted.length === 0}>
            <DownloadIcon />
            Export CSV
          </Button>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Step</TableHead>
                <TableHead>FT</TableHead>
                <TableHead>IAT</TableHead>
                <TableHead>Campus</TableHead>
                <TableHead>Credits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCompleted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">
                    No completed sessions in this period.
                  </TableCell>
                </TableRow>
              )}
              {sortedCompleted.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{format(new Date(s.date), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{s.course}</TableCell>
                  <TableCell>{batchLabelForGrade(s.grade)}</TableCell>
                  <TableCell>{s.step ? `Step ${s.step}` : "—"}</TableCell>
                  <TableCell>{s.ft}</TableCell>
                  <TableCell>{s.iat ?? "—"}</TableCell>
                  <TableCell>{s.campus}</TableCell>
                  <TableCell>{s.credits}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium">Cancelled sessions ({sortedCancelled.length})</h2>
            <p className="text-xs text-muted-foreground">
              By:{" "}
              {ALL_CANCELLED_BY.map((by) => `${by} (${cancelledByReason[by]})`).join(" · ")}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={exportCancelled} disabled={sortedCancelled.length === 0}>
            <DownloadIcon />
            Export CSV
          </Button>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Step</TableHead>
                <TableHead>FT</TableHead>
                <TableHead>Campus</TableHead>
                <TableHead>Cancelled by</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCancelled.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    No cancelled sessions in this period.
                  </TableCell>
                </TableRow>
              )}
              {sortedCancelled.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{format(new Date(s.date), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{s.course}</TableCell>
                  <TableCell>{s.step ? `Step ${s.step}` : "—"}</TableCell>
                  <TableCell>{s.ft}</TableCell>
                  <TableCell>{s.campus}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{s.cancelledBy ?? "Other"}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-normal">{s.cancelReason ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </main>
  )
}
