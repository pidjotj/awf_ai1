import { useState } from "react"
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

import { useAuditLog } from "@/hooks/useAuditLog"
import { useCurrentUser } from "@/store/currentUser"
import { isAdmin } from "@/data/admins"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { AuditLogEntry } from "@/types/domain"

function SortableHeader({ label, column }: { label: string; column: Column<AuditLogEntry, unknown> }) {
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

const columns: ColumnDef<AuditLogEntry>[] = [
  {
    accessorKey: "timestamp",
    header: ({ column }) => <SortableHeader label="Timestamp" column={column} />,
    cell: ({ row }) => format(new Date(row.original.timestamp), "dd/MM/yyyy HH:mm:ss"),
  },
  {
    accessorKey: "actor",
    header: ({ column }) => <SortableHeader label="Actor" column={column} />,
  },
  {
    accessorKey: "action",
    header: ({ column }) => <SortableHeader label="Action" column={column} />,
  },
  {
    accessorKey: "summary",
    header: ({ column }) => <SortableHeader label="Details" column={column} />,
  },
]

export default function AuditLogPage() {
  const { name } = useCurrentUser()
  const { data: entries, isLoading } = useAuditLog()
  const [sorting, setSorting] = useState<SortingState>([{ id: "timestamp", desc: true }])

  const table = useReactTable({
    data: entries ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (!isAdmin(name)) {
    return (
      <main className="space-y-3 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground">This page is restricted to administrators.</p>
      </main>
    )
  }

  return (
    <main className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground">Every action taken across the app — Slots, Attendance, Leave requests.</p>
      </div>

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
            {isLoading && (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && (entries ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                  No actions logged yet.
                </TableCell>
              </TableRow>
            )}
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  )
}
