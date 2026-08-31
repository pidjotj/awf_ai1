import { useState } from "react"
import { CalendarOffIcon } from "lucide-react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useCreateBlockedPeriod } from "@/hooks/useBlockedPeriods"

export function BlockPeriodDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [campus, setCampus] = useState<string>("all")
  const [comment, setComment] = useState("")
  const createBlockedPeriod = useCreateBlockedPeriod()

  function resetAndClose() {
    setOpen(false)
    setName("")
    setStartDate("")
    setEndDate("")
    setCampus("all")
    setComment("")
  }

  function handleSubmit() {
    if (!name || !startDate || !endDate) return
    createBlockedPeriod.mutate(
      {
        name,
        startDate,
        endDate,
        campus: campus === "all" ? undefined : campus,
        comment: comment || undefined,
      },
      {
        onSuccess: ({ cancelledCount }) => {
          toast.success(
            cancelledCount > 0
              ? `Period blocked — ${cancelledCount} existing slot${cancelledCount > 1 ? "s" : ""} cancelled.`
              : "Period blocked."
          )
          resetAndClose()
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : resetAndClose())}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <CalendarOffIcon />
          Block period
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Block a period</DialogTitle>
          <DialogDescription>
            No slot can be scheduled in this window — exams, a school trip, a facility closure...
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. National exams" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End date</Label>
              <Input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Campus</Label>
            <Select value={campus} onValueChange={setCampus}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Both campuses</SelectItem>
                <SelectItem value="CIMAHI">CIMAHI</SelectItem>
                <SelectItem value="MALANG">MALANG</SelectItem>
              </SelectContent>
            </Select>
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
          <Button onClick={handleSubmit} disabled={!name || !startDate || !endDate || createBlockedPeriod.isPending}>
            Block period
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
