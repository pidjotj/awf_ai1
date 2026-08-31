import { useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { format } from "date-fns"
import { ChevronsUpDownIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSlots, useCreateSlot } from "@/hooks/useSlots"
import { useCampuses, useCourses, useFTs, useIATs } from "@/hooks/useReferenceData"
import { useAttendance } from "@/hooks/useAttendance"
import { useCreateEvaluationSheet, useEvaluationSheets } from "@/hooks/useEvaluationSheets"
import { computeEvaluationAverage, EVALUATION_PASS_THRESHOLD } from "@/data/evaluationSheetsRepository"
import { getCourseCreditTarget } from "@/pages/Planning/creditUtils"
import { nextStepCAttempt } from "@/pages/Planning/scheduling"
import { ScorePicker } from "./ScorePicker"
import type { Course, CourseTypeCode, EvaluationProgramOwnership, EvaluationScore, NewEvaluationSheet } from "@/types/domain"

const PROGRAM_OWNERSHIP_ROWS: { key: keyof EvaluationProgramOwnership; label: string }[] = [
  { key: "generalAeronauticKnowledge", label: "General aeronautic knowledge" },
  { key: "theoreticalUnderstanding", label: "Theoretical understanding" },
  { key: "practicalWorkUnderstanding", label: "Practical work understanding" },
  { key: "lessonAppropriation", label: "Lesson appropriation" },
]

const GENERIC_OBJECTIVE = [{ category: "General", text: "General understanding of the lesson objectives." }]

export default function NewEvaluationPage() {
  const { slotId } = useParams<{ slotId?: string }>()
  const isFreeform = !slotId
  const navigate = useNavigate()

  const { data: slots, isLoading: slotsLoading } = useSlots()
  const { data: courses } = useCourses()
  const { data: campuses } = useCampuses()
  const { data: fts } = useFTs()
  const { data: iats } = useIATs()
  const { data: attendance } = useAttendance()
  const { data: evaluationSheets } = useEvaluationSheets()
  const createSlot = useCreateSlot()
  const createEvaluationSheet = useCreateEvaluationSheet()

  const slot = useMemo(() => (slots ?? []).find((s) => s.id === slotId), [slots, slotId])
  const existingSheet = useMemo(
    () => (evaluationSheets ?? []).find((sheet) => sheet.slotId === slotId),
    [evaluationSheets, slotId]
  )

  // Freeform mode ("create from scratch") lets an admin pick everything by hand instead of starting
  // from an existing Slot — mirrors the paper form, which never assumed a scheduling system existed.
  const [courseOpen, setCourseOpen] = useState(false)
  const [ffCampus, setFfCampus] = useState("CIMAHI")
  const [ffDate, setFfDate] = useState(() => format(new Date(), "yyyy-MM-dd"))
  const [ffStep, setFfStep] = useState<"C" | "D" | "">("")
  const [ffCourseId, setFfCourseId] = useState("")
  const [ffCourseType, setFfCourseType] = useState<CourseTypeCode | "">("")
  const [ffIat, setFfIat] = useState("")
  const [ffFt, setFfFt] = useState("")

  const campus = isFreeform ? ffCampus : slot?.campus
  const date = isFreeform ? ffDate : slot?.date
  const step = isFreeform ? ffStep : slot?.step
  const iat = isFreeform ? ffIat : slot?.iat
  const ft = isFreeform ? ffFt : slot?.ft
  const courseId = isFreeform ? ffCourseId : slot?.course
  const courseType = isFreeform ? ffCourseType : slot?.courseType

  const coursesById = useMemo(() => {
    const map = new Map<string, Course>()
    for (const c of courses ?? []) map.set(c.id, c)
    return map
  }, [courses])
  const course = courseId ? coursesById.get(courseId) : undefined

  const campusFts = useMemo(() => (fts ?? []).filter((f) => f.campus === ffCampus), [fts, ffCampus])
  const campusIats = useMemo(() => (iats ?? []).filter((i) => i.campus === ffCampus), [iats, ffCampus])

  const objectiveRows = useMemo(() => {
    const fromCourse = course?.trainingObjectives
    return fromCourse && fromCourse.length > 0 ? fromCourse : GENERIC_OBJECTIVE
  }, [course])

  const [objectiveScores, setObjectiveScores] = useState<Record<number, EvaluationScore | null>>({})
  const [programOwnership, setProgramOwnership] = useState<Record<keyof EvaluationProgramOwnership, EvaluationScore | null>>(
    {
      generalAeronauticKnowledge: null,
      theoreticalUnderstanding: null,
      practicalWorkUnderstanding: null,
      lessonAppropriation: null,
    }
  )
  const [comment, setComment] = useState("")

  const previewAttempt =
    step === "C" && iat && campus && courseId && attendance ? nextStepCAttempt(attendance, campus, courseId, iat) : undefined

  const contextComplete = isFreeform
    ? Boolean(campus && date && step && course && courseType && iat && ft)
    : Boolean(slot && slot.step && (slot.step === "C" || slot.step === "D") && slot.iat)

  const allScored =
    objectiveRows.every((_, i) => objectiveScores[i] != null) &&
    PROGRAM_OWNERSHIP_ROWS.every((row) => programOwnership[row.key] != null)
  const canSave = contextComplete && allScored && comment.trim().length > 0

  const draftAverage = useMemo(() => {
    if (!allScored) return null
    return computeEvaluationAverage({
      objectives: objectiveRows.map((row, i) => ({ ...row, score: objectiveScores[i]! })),
      programOwnership: {
        generalAeronauticKnowledge: programOwnership.generalAeronauticKnowledge!,
        theoreticalUnderstanding: programOwnership.theoreticalUnderstanding!,
        practicalWorkUnderstanding: programOwnership.practicalWorkUnderstanding!,
        lessonAppropriation: programOwnership.lessonAppropriation!,
      },
    })
  }, [allScored, objectiveRows, objectiveScores, programOwnership])

  if (!isFreeform && slotsLoading) {
    return (
      <main className="p-6">
        <Skeleton className="h-96 w-full" />
      </main>
    )
  }

  if (!isFreeform && (!slot || !slot.step || (slot.step !== "C" && slot.step !== "D") || !slot.iat)) {
    return (
      <main className="space-y-3 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Evaluation Sheet</h1>
        <p className="text-muted-foreground">
          This slot can't be graded — it's either missing, or not a Step C/D session with a principal IAT.
        </p>
        <Button variant="outline" asChild>
          <Link to="/planning">Back to Planning</Link>
        </Button>
      </main>
    )
  }

  if (!isFreeform && existingSheet) {
    return (
      <main className="space-y-3 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Evaluation Sheet</h1>
        <p className="text-muted-foreground">This session has already been graded.</p>
        <Button asChild>
          <Link to={`/evaluations/${existingSheet.id}`}>View the evaluation</Link>
        </Button>
      </main>
    )
  }

  const threshold = step === "C" || step === "D" ? EVALUATION_PASS_THRESHOLD[step] : undefined
  const passing = draftAverage != null && threshold != null && draftAverage >= threshold

  function saveEvaluation(record: NewEvaluationSheet) {
    createEvaluationSheet.mutate(record, {
      onSuccess: (created) => {
        toast.success(
          created.passed
            ? `Step ${created.step} validated (${created.averageScore.toFixed(1)}/5).`
            : `Step ${created.step} not validated (${created.averageScore.toFixed(1)}/5) — recorded as Failed.`
        )
        navigate(`/evaluations/${created.id}`)
      },
      onError: () => toast.error("Could not save this evaluation."),
    })
  }

  async function handleSave() {
    if (!canSave) return
    const objectives = objectiveRows.map((row, i) => ({ ...row, score: objectiveScores[i]! }))
    const ownership = {
      generalAeronauticKnowledge: programOwnership.generalAeronauticKnowledge!,
      theoreticalUnderstanding: programOwnership.theoreticalUnderstanding!,
      practicalWorkUnderstanding: programOwnership.practicalWorkUnderstanding!,
      lessonAppropriation: programOwnership.lessonAppropriation!,
    }

    if (isFreeform) {
      if (!course || !ffStep || !ffCourseType || !ffIat || !ffFt) return
      try {
        const newSlot = await createSlot.mutateAsync({
          date: ffDate,
          campus: ffCampus,
          ft: ffFt,
          room: "N/A",
          grade: course.grade,
          courseType: ffCourseType,
          course: course.id,
          step: ffStep,
          iat: ffIat,
          status: "Planned",
          credits: getCourseCreditTarget(course, ffCourseType) ?? 2,
        })
        saveEvaluation({
          slotId: newSlot.id,
          date: ffDate,
          campus: ffCampus,
          step: ffStep,
          iat: ffIat,
          ft: ffFt,
          course: course.id,
          courseType: ffCourseType,
          objectives,
          comment,
          programOwnership: ownership,
        })
      } catch {
        toast.error("Could not create this evaluation.")
      }
      return
    }

    if (!slot || !slot.step || slot.step === "A" || slot.step === "B" || !slot.iat) return
    saveEvaluation({
      slotId: slot.id,
      date: slot.date,
      campus: slot.campus,
      step: slot.step,
      iat: slot.iat,
      ft: slot.ft,
      course: slot.course,
      courseType: slot.courseType,
      objectives,
      comment,
      programOwnership: ownership,
    })
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Evaluation Sheet</h1>
        <p className="text-sm text-muted-foreground">
          {threshold != null ? `Step ${step} grading — pass threshold is ${threshold}/5.` : "Step C/D grading."}
        </p>
      </div>

      {isFreeform ? (
        <div className="grid grid-cols-2 gap-3 rounded-md border p-4">
          <div className="space-y-1.5">
            <Label>Campus</Label>
            <Select
              value={ffCampus}
              onValueChange={(v) => {
                setFfCampus(v)
                setFfIat("")
                setFfFt("")
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(campuses ?? []).map((c) => (
                  <SelectItem key={c.title} value={c.title}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={ffDate} onChange={(e) => setFfDate(e.target.value)} />
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label>Lesson</Label>
            <Popover open={courseOpen} onOpenChange={setCourseOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between font-normal">
                  {course ? course.id : "Select a course..."}
                  <ChevronsUpDownIcon className="opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[440px] p-0">
                <Command>
                  <CommandInput placeholder="Search course..." />
                  <CommandList>
                    <CommandEmpty>No course found.</CommandEmpty>
                    <CommandGroup>
                      {(courses ?? []).map((c) => (
                        <CommandItem
                          key={c.id}
                          value={c.id}
                          onSelect={() => {
                            setFfCourseId(c.id)
                            setFfCourseType(c.courseType === "BOTH" ? "" : c.courseType)
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

          {course?.courseType === "BOTH" && (
            <div className="col-span-2 space-y-1.5">
              <Label>Type</Label>
              <div className="inline-flex rounded-md border p-0.5">
                <Button size="sm" variant={ffCourseType === "TH" ? "default" : "ghost"} onClick={() => setFfCourseType("TH")}>
                  TH
                </Button>
                <Button size="sm" variant={ffCourseType === "PW" ? "default" : "ghost"} onClick={() => setFfCourseType("PW")}>
                  PWL
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Step</Label>
            <Select value={ffStep} onValueChange={(v) => setFfStep(v as "C" | "D")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select step" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="C">Step C · IAT teaches, FT grades</SelectItem>
                <SelectItem value="D">Step D · IAT teaches Batch #2 alone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Indonesian Teacher</Label>
            <Select value={ffIat} onValueChange={setFfIat}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select IAT" />
              </SelectTrigger>
              <SelectContent>
                {campusIats.map((i) => (
                  <SelectItem key={i.title} value={i.title}>
                    {i.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>French Teacher</Label>
            <Select value={ffFt} onValueChange={setFfFt}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select FT" />
              </SelectTrigger>
              <SelectContent>
                {campusFts.map((f) => (
                  <SelectItem key={f.title} value={f.title}>
                    {f.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {step === "C" && previewAttempt && (
            <div className="col-span-2">
              <Badge variant="outline">Will be recorded as Attempt {previewAttempt}/3</Badge>
            </div>
          )}
        </div>
      ) : (
        slot && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-md border p-4 text-sm sm:grid-cols-3">
            <Info label="Date">{format(new Date(slot.date), "EEE dd MMM yyyy")}</Info>
            <Info label="Step">
              <Badge variant="outline">
                Step {step}
                {previewAttempt && ` · Attempt ${previewAttempt}/3`}
              </Badge>
            </Info>
            <Info label="Type">{slot.courseType === "PW" ? "PWL" : slot.courseType}</Info>
            <Info label="Indonesian Teacher">{slot.iat}</Info>
            <Info label="French Teacher">{slot.ft}</Info>
            <Info label="Campus">{slot.campus}</Info>
            <Info label="Lesson" className="col-span-2 sm:col-span-3">
              {slot.course}
            </Info>
            {slot.additionalIats && slot.additionalIats.length > 0 && (
              <Info label="Observers (not graded)" className="col-span-2 sm:col-span-3">
                {slot.additionalIats.join(", ")}
              </Info>
            )}
          </div>
        )
      )}

      <div className="space-y-3">
        <h2 className="font-medium">Training Objectives</h2>
        <div className="space-y-2 rounded-md border p-3">
          {objectiveRows.map((row, i) => (
            <div key={i} className="flex flex-wrap items-center justify-between gap-3 border-b pb-2 last:border-b-0 last:pb-0">
              <div className="max-w-md text-sm">
                <span className="text-xs font-medium text-muted-foreground">{row.category}</span>
                <p>{row.text}</p>
              </div>
              <ScorePicker value={objectiveScores[i] ?? null} onChange={(score) => setObjectiveScores((s) => ({ ...s, [i]: score }))} />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Comments</Label>
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Required" aria-invalid={comment.trim().length === 0} />
      </div>

      <div className="space-y-3">
        <h2 className="font-medium">AWF Program Ownership</h2>
        <div className="space-y-2 rounded-md border p-3">
          {PROGRAM_OWNERSHIP_ROWS.map((row) => (
            <div key={row.key} className="flex flex-wrap items-center justify-between gap-3 border-b pb-2 last:border-b-0 last:pb-0">
              <span className="text-sm">{row.label}</span>
              <ScorePicker
                value={programOwnership[row.key]}
                onChange={(score) => setProgramOwnership((s) => ({ ...s, [row.key]: score }))}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4">
        <div>
          <div className="text-xs text-muted-foreground">Average total score</div>
          <div className="text-lg font-semibold">{draftAverage != null ? `${draftAverage.toFixed(2)}/5` : "Rate every row to compute"}</div>
        </div>
        {draftAverage != null && step && (
          <Badge variant={passing ? "default" : "destructive"} className={passing ? "bg-emerald-600" : ""}>
            {passing ? `Step ${step} validated` : `Step ${step} not validated`}
          </Badge>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link to={isFreeform ? "/evaluations" : "/planning"}>Cancel</Link>
        </Button>
        <Button onClick={handleSave} disabled={!canSave || createSlot.isPending || createEvaluationSheet.isPending}>
          Save evaluation
        </Button>
      </div>
      {!canSave && (
        <p className="text-right text-xs text-muted-foreground">
          {!contextComplete
            ? "Fill in every field above, "
            : !allScored
              ? "Rate every row (or mark N/A), "
              : "Add a comment, "}
          then save.
        </p>
      )}
    </main>
  )
}

function Info({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{children}</div>
    </div>
  )
}
