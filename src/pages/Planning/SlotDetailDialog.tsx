import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { format } from "date-fns"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { batchLabelForGrade } from "@/data/batchMapping"
import { useDeleteSlot, useUpdateSlot } from "@/hooks/useSlots"
import { useAttendance, useCreateAttendanceRecords } from "@/hooks/useAttendance"
import { useEvaluationSheets } from "@/hooks/useEvaluationSheets"
import type { CancelledBy, Course, Slot } from "@/types/domain"
import { compactSlotLabel, getCourseCreditTarget } from "./creditUtils"
import { buildAttendanceForValidation } from "./scheduling"

const STATUS_VARIANT: Record<Slot["status"], "default" | "secondary" | "destructive"> = {
  Planned: "secondary",
  Completed: "default",
  Cancelled: "destructive",
}

const STEP_LABEL: Record<string, string> = {
  A: "Step A · FT teaches IAT",
  B: "Step B · FT teaches Batch #1 + IAT",
  C: "Step C · IAT teaches, FT grades",
  D: "Step D · IAT teaches Batch #2, FT grades",
}

function formatTime(dateTime?: string) {
  return dateTime ? format(new Date(dateTime), "HH:mm") : undefined
}

type SlotDetailDialogProps = {
  slot: Slot | null
  course?: Course
  deliveredCredits?: number
  onOpenChange: (open: boolean) => void
}

export function SlotDetailDialog({ slot, course, deliveredCredits, onOpenChange }: SlotDetailDialogProps) {
  const navigate = useNavigate()
  const [cancelling, setCancelling] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [cancelledBy, setCancelledBy] = useState<CancelledBy>("Other")
  const [reason, setReason] = useState("")
  const updateSlot = useUpdateSlot()
  const deleteSlot = useDeleteSlot()
  const createAttendance = useCreateAttendanceRecords()
  const { data: attendanceRecords } = useAttendance()
  const { data: evaluationSheets } = useEvaluationSheets()

  if (!slot) return null

  const evaluationSheet = evaluationSheets?.find((sheet) => sheet.slotId === slot.id)
  const cmis = course
    ? [course.primaryCMI, course.secondaryCMI, course.optionalCMI].filter(Boolean).join(", ")
    : undefined
  const creditTarget = getCourseCreditTarget(course, slot.courseType)
  const start = formatTime(slot.startTime)
  const end = formatTime(slot.endTime)

  function resetAndClose() {
    setCancelling(false)
    setDeleting(false)
    setReason("")
    setCancelledBy("Other")
    onOpenChange(false)
  }

  function confirmCancel() {
    updateSlot.mutate(
      { id: slot!.id, changes: { status: "Cancelled", cancelledBy, cancelReason: reason || undefined } },
      {
        onSuccess: () => {
          toast.success("Slot cancelled.")
          resetAndClose()
        },
      }
    )
  }

  function confirmDelete() {
    deleteSlot.mutate(slot!.id, {
      onSuccess: () => {
        toast.success("Slot deleted.")
        resetAndClose()
      },
    })
  }

  // Step A/B only — no grading involved, so validating just marks the whole assigned group Present.
  // Step C/D go through the Evaluation Sheet instead (see the Validate button below).
  async function handleValidate() {
    if (!course || !slot!.step) return
    const records = buildAttendanceForValidation(slot!, course, attendanceRecords ?? [])

    try {
      if (records.length > 0) {
        await createAttendance.mutateAsync(records)
      }
      await updateSlot.mutateAsync({ id: slot!.id, changes: { status: "Completed" } })
      toast.success(
        records.length > 0
          ? `Slot validated — attendance recorded for ${records.map((r) => r.iat).join(", ")}.`
          : "Slot validated."
      )
      resetAndClose()
    } catch {
      toast.error("Could not validate this slot.")
    }
  }

  return (
    <Dialog open={Boolean(slot)} onOpenChange={(open) => !open && resetAndClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{slot.course}</DialogTitle>
          <DialogDescription>{compactSlotLabel(slot)}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Info label="Status">
            <Badge variant={STATUS_VARIANT[slot.status]}>{slot.status}</Badge>
          </Info>
          <Info label="Credits">{slot.credits} cr{creditTarget !== undefined ? ` · ${deliveredCredits ?? 0}/${creditTarget} delivered` : ""}</Info>
          <Info label="Date">{format(new Date(slot.date), "EEE dd MMM yyyy")}</Info>
          <Info label="Time">{start && end ? `${start}–${end}` : "Unscheduled"}</Info>
          <Info label="Campus">{slot.campus}</Info>
          <Info label="Room">{slot.room}</Info>
          <Info label="FT">{slot.ft}</Info>
          <Info label="Batch">{batchLabelForGrade(slot.grade)}</Info>
          {slot.iat && (
            <Info label="IAT" className="col-span-2">
              {slot.iat}
            </Info>
          )}
          {!slot.iat && cmis && (
            <Info label="IAT group" className="col-span-2">
              {cmis}
            </Info>
          )}
          {slot.additionalIats && slot.additionalIats.length > 0 && (
            <Info label="Additional IATs (observing)" className="col-span-2">
              {slot.additionalIats.join(", ")}
            </Info>
          )}
          {slot.step && (
            <Info label="Step" className="col-span-2">
              {STEP_LABEL[slot.step] ?? slot.step}
            </Info>
          )}
          {(slot.step === "C" || slot.step === "D") && slot.status === "Completed" && (
            <Info label="Result" className="col-span-2">
              {slot.validated === false ? (
                <span className="text-destructive">Not validated — doesn't count toward the credit counter</span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400">Validated</span>
              )}
              {evaluationSheet && (
                <>
                  {" · "}
                  <Link to={`/evaluations/${evaluationSheet.id}`} className="underline underline-offset-2">
                    View evaluation sheet
                  </Link>
                </>
              )}
            </Info>
          )}
        </div>

        {slot.status === "Cancelled" && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <p className="font-medium text-destructive">Cancelled because of {slot.cancelledBy ?? "Other"}</p>
            {slot.cancelReason && <p className="mt-1 text-muted-foreground">{slot.cancelReason}</p>}
          </div>
        )}

        {!cancelling && !deleting && (
          <DialogFooter>
            <Button variant="outline" className="text-destructive" onClick={() => setDeleting(true)}>
              Delete slot
            </Button>
            {slot.status !== "Cancelled" && (
              <Button variant="destructive" onClick={() => setCancelling(true)}>
                Cancel this slot
              </Button>
            )}
            {slot.status === "Planned" && (
              <Button
                onClick={() => (slot.step === "C" || slot.step === "D" ? navigate(`/evaluations/new/${slot.id}`) : handleValidate())}
                disabled={!slot.step || createAttendance.isPending || updateSlot.isPending}
              >
                {slot.step === "C" || slot.step === "D" ? "Grade & validate" : "Validate"}
              </Button>
            )}
          </DialogFooter>
        )}

        {deleting && (
          <div className="space-y-3 rounded-md border border-destructive/30 p-3">
            <p className="text-sm">This permanently removes the slot. This can't be undone — use it to fix a scheduling mistake.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleting(false)}>
                Back
              </Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={deleteSlot.isPending}>
                Confirm delete
              </Button>
            </DialogFooter>
          </div>
        )}

        {slot.status !== "Cancelled" && cancelling && (
          <div className="space-y-3 rounded-md border p-3">
            <div className="space-y-1.5">
              <Label>Because of</Label>
              <Select value={cancelledBy} onValueChange={(v) => setCancelledBy(v as CancelledBy)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FT">FT</SelectItem>
                  <SelectItem value="IAT">IAT</SelectItem>
                  <SelectItem value="School">School</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Explanation</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this slot cancelled?"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelling(false)}>
                Back
              </Button>
              <Button variant="destructive" onClick={confirmCancel} disabled={updateSlot.isPending}>
                Confirm cancellation
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Info({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  )
}
