import { useState } from "react"
import { format } from "date-fns"
import { PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { useCurrentUser } from "@/store/currentUser"
import { isManager } from "@/data/managers"
import { useCreateLeaveRequest, useDecideLeaveRequest, useLeaveRequests } from "@/hooks/useLeaveRequests"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import type { LeaveStatus, LeaveType } from "@/types/domain"

const LEAVE_TYPES: LeaveType[] = ["CP", "CS", "RTT", "Remote work"]

const STATUS_VARIANT: Record<LeaveStatus, "default" | "secondary" | "destructive"> = {
  Pending: "secondary",
  Accepted: "default",
  Refused: "destructive",
}

export default function LeavePage() {
  const { name } = useCurrentUser()
  const { data: requests, isLoading } = useLeaveRequests()
  const createRequest = useCreateLeaveRequest()
  const decideRequest = useDecideLeaveRequest()

  const [open, setOpen] = useState(false)
  const [type, setType] = useState<LeaveType | "">("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [comment, setComment] = useState("")

  const canDecide = isManager(name)

  function resetAndClose() {
    setOpen(false)
    setType("")
    setStartDate("")
    setEndDate("")
    setComment("")
  }

  function handleSubmit() {
    if (!type || !startDate || !endDate) return
    createRequest.mutate(
      { requester: name, type, startDate, endDate, comment: comment || undefined },
      {
        onSuccess: () => {
          toast.success("Leave request submitted.")
          resetAndClose()
        },
      }
    )
  }

  function handleDecide(id: string, status: "Accepted" | "Refused") {
    decideRequest.mutate(
      { id, status, decidedBy: name },
      { onSuccess: () => toast.success(`Request ${status.toLowerCase()}.`) }
    )
  }

  const sorted = [...(requests ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const columnCount = canDecide ? 8 : 7

  return (
    <main className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leave</h1>
          <p className="text-sm text-muted-foreground">
            {canDecide
              ? "Request time off or remote work — you can also accept or refuse pending requests."
              : "Request time off or remote work. Only Olivier Autran and Antoine Des Deserts can decide on requests."}
          </p>
        </div>

        <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : resetAndClose())}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon />
              New request
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New leave request</DialogTitle>
              <DialogDescription>Submitting as {name}.</DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as LeaveType)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAVE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>End date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Comment</Label>
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional" />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetAndClose}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!type || !startDate || !endDate || createRequest.isPending}>
                Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Requested</TableHead>
              <TableHead>FT</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Comment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Decided by</TableHead>
              {canDecide && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={columnCount}>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={columnCount} className="py-8 text-center text-muted-foreground">
                  No leave requests yet.
                </TableCell>
              </TableRow>
            )}
            {sorted.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{format(new Date(r.createdAt), "dd/MM/yyyy")}</TableCell>
                <TableCell>{r.requester}</TableCell>
                <TableCell>{r.type}</TableCell>
                <TableCell>
                  {format(new Date(r.startDate), "dd/MM/yyyy")} – {format(new Date(r.endDate), "dd/MM/yyyy")}
                </TableCell>
                <TableCell className="max-w-xs whitespace-normal">{r.comment ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
                </TableCell>
                <TableCell>{r.decidedBy ?? "—"}</TableCell>
                {canDecide && (
                  <TableCell>
                    {r.status === "Pending" ? (
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => handleDecide(r.id, "Accepted")}>
                          Accept
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDecide(r.id, "Refused")}>
                          Refuse
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  )
}
