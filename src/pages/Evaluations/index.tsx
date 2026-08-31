import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
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
import { ArrowDownIcon, ArrowUpIcon, ArrowUpDownIcon, PlusIcon } from "lucide-react"

import { useEvaluationSheets } from "@/hooks/useEvaluationSheets"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { EvaluationScore, EvaluationSheet, StepCode } from "@/types/domain"

const STEPS: Extract<StepCode, "C" | "D">[] = ["C", "D"]

function numericAverage(scores: EvaluationScore[]) {
  const numeric = scores.filter((s): s is Exclude<EvaluationScore, "N/A"> => s !== "N/A")
  if (numeric.length === 0) return undefined
  return numeric.reduce((sum, s) => sum + s, 0) / numeric.length
}

function SortableHeader({ label, column }: { label: string; column: Column<EvaluationSheet, unknown> }) {
  const sorted = column.getIsSorted()
  return (
    <button type="button" onClick={() => column.toggleSorting(sorted === "asc")} className="flex items-center gap-1 hover:text-foreground">
      {label}
      {sorted === "asc" && <ArrowUpIcon className="size-3.5" />}
      {sorted === "desc" && <ArrowDownIcon className="size-3.5" />}
      {!sorted && <ArrowUpDownIcon className="size-3.5 opacity-40" />}
    </button>
  )
}

const columns: ColumnDef<EvaluationSheet>[] = [
  {
    accessorKey: "date",
    header: ({ column }) => <SortableHeader label="Date" column={column} />,
    cell: ({ row }) => format(new Date(row.original.date), "dd/MM/yyyy"),
  },
  {
    accessorKey: "iat",
    header: ({ column }) => <SortableHeader label="IAT" column={column} />,
  },
  {
    accessorKey: "course",
    header: ({ column }) => <SortableHeader label="Lesson" column={column} />,
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
    accessorKey: "courseType",
    header: "Type",
    cell: ({ row }) => (row.original.courseType === "PW" ? "PWL" : row.original.courseType),
  },
  {
    accessorKey: "ft",
    header: ({ column }) => <SortableHeader label="FT" column={column} />,
  },
  {
    accessorKey: "campus",
    header: ({ column }) => <SortableHeader label="Campus" column={column} />,
  },
  {
    id: "objectives",
    header: "Objectives",
    cell: ({ row }) => {
      const avg = numericAverage(row.original.objectives.map((o) => o.score))
      return avg != null ? `${avg.toFixed(1)}/5` : "—"
    },
  },
  {
    id: "programOwnership",
    header: "Program ownership",
    cell: ({ row }) => {
      const avg = numericAverage(Object.values(row.original.programOwnership))
      return avg != null ? `${avg.toFixed(1)}/5` : "—"
    },
  },
  {
    accessorKey: "averageScore",
    header: ({ column }) => <SortableHeader label="Average total score" column={column} />,
    cell: ({ row }) => <span className="font-medium">{row.original.averageScore.toFixed(2)}/5</span>,
  },
  {
    accessorKey: "passed",
    header: ({ column }) => <SortableHeader label="Result" column={column} />,
    cell: ({ row }) => (
      <Badge variant={row.original.passed ? "default" : "destructive"} className={row.original.passed ? "bg-emerald-600" : ""}>
        {row.original.passed ? "Validated" : "Not validated"}
      </Badge>
    ),
  },
]

export default function EvaluationsPage() {
  const { data: sheets, isLoading } = useEvaluationSheets()
  const navigate = useNavigate()

  const [campusFilter, setCampusFilter] = useState("all")
  const [stepFilter, setStepFilter] = useState("all")
  const [resultFilter, setResultFilter] = useState("all")
  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }])

  const campuses = useMemo(() => [...new Set((sheets ?? []).map((s) => s.campus))].sort(), [sheets])

  const filtered = useMemo(() => {
    return (sheets ?? []).filter((s) => {
      if (campusFilter !== "all" && s.campus !== campusFilter) return false
      if (stepFilter !== "all" && s.step !== stepFilter) return false
      if (resultFilter === "passed" && !s.passed) return false
      if (resultFilter === "failed" && s.passed) return false
      return true
    })
  }, [sheets, campusFilter, stepFilter, resultFilter])

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
          <h1 className="text-2xl font-semibold tracking-tight">Evaluation Sheets</h1>
          <p className="text-sm text-muted-foreground">Step C/D grading history — click a row to see the full sheet.</p>
        </div>
        <Button asChild>
          <Link to="/evaluations/new">
            <PlusIcon />
            New evaluation
          </Link>
        </Button>
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

        <Select value={stepFilter} onValueChange={setStepFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Step" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All steps</SelectItem>
            {STEPS.map((s) => (
              <SelectItem key={s} value={s}>
                Step {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={resultFilter} onValueChange={setResultFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Result" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All results</SelectItem>
            <SelectItem value="passed">Validated</SelectItem>
            <SelectItem value="failed">Not validated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                    No evaluation sheets match these filters.
                  </TableCell>
                </TableRow>
              )}

              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="cursor-pointer" onClick={() => navigate(`/evaluations/${row.original.id}`)}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  )
}
