import { useEffect, useMemo, useState } from "react"
import { addMinutes, format } from "date-fns"
import { ChevronsUpDownIcon, TriangleAlertIcon } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCreateSlot, useSlots } from "@/hooks/useSlots"
import { useCourses, useFTs, useGrades, useHolidays, useIATs, useRooms } from "@/hooks/useReferenceData"
import { useLeaveRequests } from "@/hooks/useLeaveRequests"
import { useBlockedPeriods } from "@/hooks/useBlockedPeriods"
import { CAMPUS_PERIOD_TIMES } from "@/data/periodTimes"
import { buildDeliveredCreditsMap, compactSlotLabel, deliveredCreditsKey, getCourseCreditTarget } from "./creditUtils"
import { courseIatCandidates, findIatConflicts, getAvailableSteps, type StepOption } from "./scheduling"
import type { Course, CourseTypeCode, LeaveRequest, StepCode } from "@/types/domain"

const STEP_DESCRIPTIONS: Record<StepCode, string> = {
  A: "Step A · FT teaches the IAT group",
  B: "Step B · FT teaches Batch #1 + the IAT group",
  C: "Step C · IAT teaches, FT grades (1 IAT)",
  D: "Step D · IAT teaches Batch #2 alone (1 IAT)",
}

const ALL_STEPS: StepCode[] = ["A", "B", "C", "D"]

function toggleInSet<T>(set: Set<T>, value: T) {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

type CreateSlotDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  campus: string
  defaultDate: string
  initialFt?: string
  initialStartTime?: string
}

export function CreateSlotDialog({
  open,
  onOpenChange,
  campus,
  defaultDate,
  initialFt,
  initialStartTime,
}: CreateSlotDialogProps) {
  const [courseOpen, setCourseOpen] = useState(false)
  const [date, setDate] = useState(defaultDate)
  const [ft, setFt] = useState("")
  const [courseId, setCourseId] = useState("")
  const [courseType, setCourseType] = useState<CourseTypeCode | "">("")
  const [step, setStep] = useState<StepCode | "">("")
  const [iat, setIat] = useState("")
  const [additionalIats, setAdditionalIats] = useState<Set<string>>(new Set())
  const [room, setRoom] = useState("")
  const [startTime, setStartTime] = useState("08:00")
  const [credits, setCredits] = useState(2)
  const [forceCredits, setForceCredits] = useState(false)

  const [gradeFilter, setGradeFilter] = useState<Set<string>>(new Set())
  const [typeFilter, setTypeFilter] = useState<Set<CourseTypeCode>>(new Set())
  const [stepFilter, setStepFilter] = useState<Set<StepCode>>(new Set())

  const { data: slots } = useSlots()
  const { data: fts } = useFTs()
  const { data: iats } = useIATs()
  const { data: courses } = useCourses()
  const { data: rooms } = useRooms()
  const { data: grades } = useGrades()
  const { data: holidays } = useHolidays()
  const { data: leaveRequests } = useLeaveRequests()
  const { data: blockedPeriods } = useBlockedPeriods()
  const createSlot = useCreateSlot()

  const holiday = useMemo(() => holidays?.find((h) => h.date === date), [holidays, date])
  const blockedPeriod = useMemo(
    () =>
      blockedPeriods?.find(
        (p) => (!p.campus || p.campus === campus) && date >= p.startDate && date <= p.endDate
      ),
    [blockedPeriods, campus, date]
  )
  const presetTimes = CAMPUS_PERIOD_TIMES[campus] ?? []

  const absentFts = useMemo(() => {
    const map = new Map<string, LeaveRequest>()
    for (const request of leaveRequests ?? []) {
      if (request.status !== "Accepted") continue
      if (date >= request.startDate && date <= request.endDate) map.set(request.requester, request)
    }
    return map
  }, [leaveRequests, date])
  const ftOnLeave = ft ? absentFts.get(ft) : undefined

  useEffect(() => {
    if (!open) return
    setDate(defaultDate)
    setFt(initialFt ?? "")
    setStartTime(initialStartTime ?? CAMPUS_PERIOD_TIMES[campus]?.[0] ?? "08:00")
    setCourseId("")
    setCourseType("")
    setStep("")
    setIat("")
    setAdditionalIats(new Set())
    setRoom("")
    setCredits(2)
    setForceCredits(false)
    setGradeFilter(new Set())
    setTypeFilter(new Set())
    setStepFilter(new Set())
  }, [open, defaultDate, initialFt, initialStartTime, campus])

  const campusFTs = useMemo(() => (fts ?? []).filter((f) => f.campus === campus), [fts, campus])
  const campusIats = useMemo(() => (iats ?? []).filter((i) => i.campus === campus), [iats, campus])

  const coursesById = useMemo(() => {
    const map = new Map<string, Course>()
    for (const c of courses ?? []) map.set(c.id, c)
    return map
  }, [courses])

  const availableStepsByCourse = useMemo(() => {
    const map = new Map<string, StepOption[]>()
    for (const c of courses ?? []) map.set(c.id, getAvailableSteps(c, slots ?? [], campus))
    return map
  }, [courses, slots, campus])

  const filteredCourses = useMemo(() => {
    return (courses ?? []).filter((c) => {
      if (gradeFilter.size > 0 && !gradeFilter.has(c.grade)) return false
      if (typeFilter.size > 0 && c.courseType !== "BOTH" && !typeFilter.has(c.courseType)) return false
      if (stepFilter.size > 0) {
        const steps = availableStepsByCourse.get(c.id) ?? []
        if (!steps.some((o) => stepFilter.has(o.step))) return false
      }
      return true
    })
  }, [courses, gradeFilter, typeFilter, stepFilter, availableStepsByCourse])

  const selectedCourse = courseId ? coursesById.get(courseId) : undefined
  const stepOptions = selectedCourse ? (availableStepsByCourse.get(selectedCourse.id) ?? []) : []
  const selectedStepOption = stepOptions.find((o) => o.step === step)

  const deliveredCreditsMap = useMemo(() => buildDeliveredCreditsMap(slots ?? []), [slots])
  const creditTarget =
    selectedCourse && courseType ? getCourseCreditTarget(selectedCourse, courseType) : undefined
  const deliveredForStep =
    selectedCourse && step
      ? (deliveredCreditsMap.get(deliveredCreditsKey({ campus, course: selectedCourse.id, step })) ?? 0)
      : undefined
  const remainingCredits =
    creditTarget != null && deliveredForStep !== undefined ? Math.max(0, creditTarget - deliveredForStep) : undefined
  const creditsExceedRemaining = remainingCredits !== undefined && credits > remainingCredits

  const startIso = date && startTime ? `${date}T${startTime}` : undefined
  const endIso = startIso ? format(addMinutes(new Date(startIso), credits * 40), "yyyy-MM-dd'T'HH:mm") : undefined

  const candidateIats = useMemo(() => {
    if (!selectedCourse || !step) return []
    if (step === "C" || step === "D") return iat ? [iat] : []
    return courseIatCandidates(selectedCourse)
  }, [selectedCourse, step, iat])

  const conflicts = useMemo(
    () => findIatConflicts(slots ?? [], coursesById, { date, startTime: startIso, endTime: endIso, iats: candidateIats }),
    [slots, coursesById, date, startIso, endIso, candidateIats]
  )

  const needsIat = step === "C" || step === "D"
  const canSubmit = Boolean(
    !holiday &&
      !blockedPeriod &&
      ft &&
      !ftOnLeave &&
      selectedCourse &&
      courseType &&
      step &&
      room &&
      date &&
      startTime &&
      credits > 0 &&
      (!needsIat || iat) &&
      (!creditsExceedRemaining || forceCredits)
  )

  function handleSubmit() {
    if (!selectedCourse || !step || !courseType || !startIso || !endIso) return
    createSlot.mutate(
      {
        date,
        campus,
        startTime: startIso,
        endTime: endIso,
        ft,
        room,
        grade: selectedCourse.grade,
        courseType,
        course: selectedCourse.id,
        step,
        iat: needsIat ? iat : undefined,
        additionalIats: step === "C" && additionalIats.size > 0 ? [...additionalIats] : undefined,
        status: "Planned",
        credits,
      },
      {
        onSuccess: () => {
          toast.success("Slot created.")
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a slot</DialogTitle>
          <DialogDescription>{campus} · pick a course to see which steps make sense next.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label>Course</Label>
            <Popover open={courseOpen} onOpenChange={setCourseOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between font-normal">
                  {selectedCourse ? selectedCourse.id : "Select a course..."}
                  <ChevronsUpDownIcon className="opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[440px] p-0">
                <Command>
                  <CommandInput placeholder="Search course..." />
                  <div className="space-y-2 border-b p-2.5 text-xs">
                    <FilterRow label="Grade">
                      {(grades ?? []).map((g) => (
                        <FilterCheckbox
                          key={g.title}
                          label={g.title.replace("Grade ", "")}
                          checked={gradeFilter.has(g.title)}
                          onCheckedChange={() => setGradeFilter((prev) => toggleInSet(prev, g.title))}
                        />
                      ))}
                    </FilterRow>
                    <FilterRow label="Type">
                      <FilterCheckbox
                        label="TH"
                        checked={typeFilter.has("TH")}
                        onCheckedChange={() => setTypeFilter((prev) => toggleInSet(prev, "TH"))}
                      />
                      <FilterCheckbox
                        label="PWL"
                        checked={typeFilter.has("PW")}
                        onCheckedChange={() => setTypeFilter((prev) => toggleInSet(prev, "PW"))}
                      />
                    </FilterRow>
                    <FilterRow label="Step">
                      {ALL_STEPS.map((s) => (
                        <FilterCheckbox
                          key={s}
                          label={s}
                          checked={stepFilter.has(s)}
                          onCheckedChange={() => setStepFilter((prev) => toggleInSet(prev, s))}
                        />
                      ))}
                    </FilterRow>
                  </div>
                  <CommandList>
                    <CommandEmpty>No course found.</CommandEmpty>
                    <CommandGroup>
                      {filteredCourses.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={c.id}
                          onSelect={() => {
                            setCourseId(c.id)
                            setCourseType(c.courseType === "BOTH" ? "" : c.courseType)
                            setStep("")
                            setIat("")
                            setAdditionalIats(new Set())
                            setForceCredits(false)
                            setCourseOpen(false)
                          }}
                        >
                          {c.id}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {selectedCourse?.courseType === "BOTH" && (
            <div className="col-span-2 space-y-1.5">
              <Label>Type</Label>
              <div className="inline-flex rounded-md border p-0.5">
                <Button size="sm" variant={courseType === "TH" ? "default" : "ghost"} onClick={() => setCourseType("TH")}>
                  TH
                </Button>
                <Button size="sm" variant={courseType === "PW" ? "default" : "ghost"} onClick={() => setCourseType("PW")}>
                  PWL
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>FT</Label>
            <Select value={ft} onValueChange={setFt}>
              <SelectTrigger className="w-full" aria-invalid={Boolean(ftOnLeave)}>
                <SelectValue placeholder="Select FT" />
              </SelectTrigger>
              <SelectContent>
                {campusFTs.map((f) => {
                  const leave = absentFts.get(f.title)
                  return (
                    <SelectItem key={f.title} value={f.title} disabled={Boolean(leave)}>
                      {f.title}
                      {leave ? ` — on leave (${leave.type})` : ""}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            {ftOnLeave && (
              <p className="text-xs text-destructive">
                {ft} is on leave ({ftOnLeave.type}) that day — pick another FT or date.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Room</Label>
            <Select value={room} onValueChange={setRoom}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select room" />
              </SelectTrigger>
              <SelectContent>
                {(rooms ?? []).map((r) => (
                  <SelectItem key={r.title} value={r.title}>
                    {r.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label>Step</Label>
            <Select
              value={step}
              onValueChange={(v) => {
                setStep(v as StepCode)
                setIat("")
                setAdditionalIats(new Set())
                setForceCredits(false)
              }}
              disabled={!selectedCourse}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={selectedCourse ? "Select step" : "Select a course first"} />
              </SelectTrigger>
              <SelectContent>
                {stepOptions.map((o) => (
                  <SelectItem key={o.step} value={o.step}>
                    {STEP_DESCRIPTIONS[o.step]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCourse && stepOptions.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No step available: every assigned IAT has already gone through Step C and Step D.
              </p>
            )}
          </div>

          {needsIat && (
            <div className="col-span-2 space-y-1.5">
              <Label>IAT</Label>
              <Select
                value={iat}
                onValueChange={(v) => {
                  setIat(v)
                  setAdditionalIats((prev) => {
                    if (!prev.has(v)) return prev
                    const next = new Set(prev)
                    next.delete(v)
                    return next
                  })
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select the IAT for this step" />
                </SelectTrigger>
                <SelectContent>
                  {(selectedStepOption?.eligibleIats ?? []).map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {step === "C" && (
            <div className="col-span-2 space-y-1.5">
              <Label>Additional IATs sitting in (optional)</Label>
              <div className="flex flex-wrap gap-3 rounded-md border p-2.5 text-sm">
                {campusIats.filter((i) => i.title !== iat).length === 0 && (
                  <span className="text-xs text-muted-foreground">No other IAT at this campus.</span>
                )}
                {campusIats
                  .filter((i) => i.title !== iat)
                  .map((i) => (
                    <FilterCheckbox
                      key={i.title}
                      label={i.title}
                      checked={additionalIats.has(i.title)}
                      onCheckedChange={() => setAdditionalIats((prev) => toggleInSet(prev, i.title))}
                    />
                  ))}
              </div>
            </div>
          )}

          {selectedCourse && (step === "A" || step === "B") && (
            <p className="col-span-2 text-xs text-muted-foreground">
              Whole IAT group attends: {courseIatCandidates(selectedCourse).join(", ") || "none assigned"}
            </p>
          )}

          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-invalid={Boolean(holiday) || Boolean(blockedPeriod)}
            />
            {holiday && <p className="text-xs text-destructive">Public holiday — {holiday.name}. Pick another date.</p>}
            {blockedPeriod && (
              <p className="text-xs text-destructive">
                Blocked — {blockedPeriod.name}. Pick another date{blockedPeriod.campus ? " or campus" : ""}.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Start time</Label>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            {presetTimes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {presetTimes.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setStartTime(time)}
                    className={`rounded border px-1.5 py-0.5 text-[11px] ${
                      startTime === time
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Credits</Label>
            <Input
              type="number"
              min={1}
              value={credits}
              onChange={(e) => setCredits(Math.max(1, Number(e.target.value) || 1))}
              aria-invalid={creditsExceedRemaining}
            />
            {remainingCredits !== undefined && (
              <p className="text-xs text-muted-foreground">
                {remainingCredits} cr remaining on this course for Step {step} (of {creditTarget} cr)
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>End time</Label>
            <Input value={endIso ? format(new Date(endIso), "HH:mm") : ""} disabled />
          </div>
        </div>

        {conflicts.length > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">Scheduling conflict</p>
              {conflicts.map((c, i) => (
                <p key={i} className="text-muted-foreground">
                  {c.iat} is already booked with {c.slot.ft} on {compactSlotLabel(c.slot)} at the same time.
                </p>
              ))}
              <p className="mt-1 text-muted-foreground">You can still add this slot if you mean to force it.</p>
            </div>
          </div>
        )}

        {creditsExceedRemaining && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div className="space-y-2">
              <p className="font-medium text-destructive">
                This slot's {credits} credits exceed the {remainingCredits} remaining on Step {step}.
              </p>
              <label className="flex items-center gap-1.5 font-normal text-muted-foreground">
                <Checkbox checked={forceCredits} onCheckedChange={(v) => setForceCredits(Boolean(v))} />
                Force it anyway
              </label>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || createSlot.isPending}>
            Add slot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-10 shrink-0 text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-3">{children}</div>
    </div>
  )
}

function FilterCheckbox({
  label,
  checked,
  onCheckedChange,
}: {
  label: string
  checked: boolean
  onCheckedChange: () => void
}) {
  return (
    <label className="flex items-center gap-1.5 font-normal">
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
      {label}
    </label>
  )
}
