import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { format } from "date-fns"
import { ArrowDownIcon, ArrowUpIcon, ArrowUpDownIcon } from "lucide-react"

import { useAttendance } from "@/hooks/useAttendance"
import { useSlots } from "@/hooks/useSlots"
import { useEvaluationSheets } from "@/hooks/useEvaluationSheets"
import { batchLabelForGrade } from "@/data/batchMapping"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { nextStepCAttempt } from "@/pages/Planning/scheduling"
import { AttendanceMatrix } from "./AttendanceMatrix"
import type { AttendanceRecord, AttendanceStatus, StepCode } from "@/types/domain"

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  Present: "bg-emerald-500/10 text-emerald-700 border-emerald-500/40 dark:text-emerald-300",
  Absent: "bg-muted text-muted-foreground border-border",
  Failed: "bg-red-500/10 text-red-700 border-red-500/40 dark:text-red-300",
  Remedial: "bg-amber-500/10 text-amber-700 border-amber-500/40 dark:text-amber-300",
  Optional: "bg-sky-500/10 text-sky-700 border-sky-500/40 dark:text-sky-300",
  Partial: "bg-amber-500/10 text-amber-700 border-amber-500/40 dark:text-amber-300",
  Planned: "bg-transparent text-muted-foreground border-dashed",
}

const ALL_STEPS: StepCode[] = ["A", "B", "C", "D"]

function StatusBadge({ status }: { status: AttendanceStatus }) {
  return (
    <Badge variant="outline" className={STATUS_STYLES[status]}>
      {status === "Planned" ? "Awaiting grade" : status}
    </Badge>
  )
}

function SortableHeader({ label, column }: { label: string; column: Column<AttendanceRecord, unknown> }) {
  const sorted = column.getIsSorted()
  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(sorted === "asc")}
      className="flex items-center gap-1 hover:text-foreground"
    >
      {label}
      {sorted === "asc" && <ArrowUpIcon className="size-3.5" />}
      {sorted === "desc" && <ArrowDownIcon className="size-3.5" />}
      {!sorted && <ArrowUpDownIcon className="size-3.5 opacity-40" />}
    </button>
  )
}

const columns: ColumnDef<AttendanceRecord>[] = [
  {
    accessorKey: "date",
    header: ({ column }) => <SortableHeader label="Date" column={column} />,
    sortUndefined: "last",
    cell: ({ row }) => (row.original.date ? format(new Date(row.original.date), "dd/MM/yyyy") : "—"),
  },
  {
    accessorKey: "course",
    header: ({ column }) => <SortableHeader label="Course" column={column} />,
  },
  {
    accessorKey: "grade",
    header: ({ column }) => <SortableHeader label="Batch" column={column} />,
    cell: ({ row }) => batchLabelForGrade(row.original.grade),
  },
  {
    accessorKey: "step",
    header: ({ column }) => <SortableHeader label="Step" column={column} />,
    cell: ({ row }) => (
      <span>
        Step {row.original.step}
        {row.original.step === "C" && <span className="text-muted-foreground"> · {row.original.attempt}/3</span>}
      </span>
    ),
  },
  {
    accessorKey: "iat",
    header: ({ column }) => <SortableHeader label="IAT" column={column} />,
  },
  {
    accessorKey: "campus",
    header: ({ column }) => <SortableHeader label="Campus" column={column} />,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <SortableHeader label="Status" column={column} />,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
]

export default function IATAttendancePage() {
  const navigate = useNavigate()
  const { data: records, isLoading } = useAttendance()
  const { data: slots } = useSlots()
  const { data: evaluationSheets } = useEvaluationSheets()

  const [view, setView] = useState<"matrix" | "table">("matrix")
  const [campusFilter, setCampusFilter] = useState("all")
  const [stepFilter, setStepFilter] = useState("all")
  const [iatFilter, setIatFilter] = useState("all")
  const [gradeFilter, setGradeFilter] = useState("all")
  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }])

  const slotIdToEvaluationId = useMemo(() => {
    const map = new Map<string, string>()
    for (const sheet of evaluationSheets ?? []) map.set(sheet.slotId, sheet.id)
    return map
  }, [evaluationSheets])

  // A Step C/D slot that's booked but hasn't been graded yet shows up as a dashed "awaiting grade"
  // badge, clickable straight to its Evaluation Sheet — same as clicking Validate from Planning.
  const awaitingGradeRecords = useMemo<AttendanceRecord[]>(() => {
    const result: AttendanceRecord[] = []
    for (const slot of slots ?? []) {
      if (slot.status !== "Planned") continue
      if (slot.step !== "C" && slot.step !== "D") continue
      if (!slot.iat || slotIdToEvaluationId.has(slot.id)) continue
      result.push({
        id: `awaiting-${slot.id}`,
        campus: slot.campus,
        course: slot.course,
        grade: slot.grade,
        iat: slot.iat,
        step: slot.step,
        attempt: slot.step === "C" ? nextStepCAttempt(records ?? [], slot.campus, slot.course, slot.iat) : 1,
        status: "Planned",
        date: slot.date,
        slotId: slot.id,
      })
    }
    return result
  }, [slots, slotIdToEvaluationId, records])

  const allRecords = useMemo(() => [...(records ?? []), ...awaitingGradeRecords], [records, awaitingGradeRecords])

  const iats = useMemo(() => [...new Set(allRecords.map((r) => r.iat))].sort(), [allRecords])
  const grades = useMemo(() => [...new Set(allRecords.map((r) => r.grade))].sort(), [allRecords])
  const campuses = useMemo(() => [...new Set(allRecords.map((r) => r.campus))].sort(), [allRecords])

  const filtered = useMemo(() => {
    return allRecords.filter((r) => {
      if (campusFilter !== "all" && r.campus !== campusFilter) return false
      if (stepFilter !== "all" && r.step !== stepFilter) return false
      if (iatFilter !== "all" && r.iat !== iatFilter) return false
      if (gradeFilter !== "all" && r.grade !== gradeFilter) return false
      return true
    })
  }, [allRecords, campusFilter, stepFilter, iatFilter, gradeFilter])

  function navigateToRecord(record: AttendanceRecord) {
    if (!record.slotId) return
    if (record.status === "Planned") {
      navigate(`/evaluations/new/${record.slotId}`)
      return
    }
    const evaluationId = slotIdToEvaluationId.get(record.slotId)
    if (evaluationId) navigate(`/evaluations/${evaluationId}`)
  }

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <main className="space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">IAT Attendance</h1>
          <p className="text-sm text-muted-foreground">
            Steps delivered per IAT, per course — sourced from the IAT Attendance sheets.
          </p>
        </div>
        <div className="inline-flex rounded-md border p-0.5">
          <Button size="sm" variant={view === "matrix" ? "default" : "ghost"} onClick={() => setView("matrix")}>
            Matrix
          </Button>
          <Button size="sm" variant={view === "table" ? "default" : "ghost"} onClick={() => setView("table")}>
            Table
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={campusFilter} onValueChange={setCampusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Campus" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All campuses</SelectItem>
            {campuses.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {view === "table" && (
          <Select value={stepFilter} onValueChange={setStepFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Step" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All steps</SelectItem>
              {ALL_STEPS.map((s) => (
                <SelectItem key={s} value={s}>
                  Step {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {view === "table" && (
          <Select value={iatFilter} onValueChange={setIatFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="IAT" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All IATs</SelectItem>
              {iats.map((i) => (
                <SelectItem key={i} value={i}>
                  {i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={gradeFilter} onValueChange={setGradeFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Grade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All grades</SelectItem>
            {grades.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : view === "matrix" ? (
        <AttendanceMatrix records={filtered} onNavigate={navigateToRecord} />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                    No attendance records match these filters.
                  </TableCell>
                </TableRow>
              )}

              {table.getRowModel().rows.map((row) => {
                const navigable = Boolean(row.original.slotId)
                return (
                  <TableRow
                    key={row.id}
                    className={navigable ? "cursor-pointer" : undefined}
                    onClick={() => navigable && navigateToRecord(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  )
}
