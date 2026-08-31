import { useMemo } from "react"
import { Link, useParams } from "react-router-dom"
import { format } from "date-fns"
import { PrinterIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useEvaluationSheets } from "@/hooks/useEvaluationSheets"
import { EVALUATION_PASS_THRESHOLD } from "@/data/evaluationSheetsRepository"
import { ScorePicker } from "./ScorePicker"
import { PrintableEvaluationSheet } from "./PrintableEvaluationSheet"

const PROGRAM_OWNERSHIP_LABELS = {
  generalAeronauticKnowledge: "General aeronautic knowledge",
  theoreticalUnderstanding: "Theoretical understanding",
  practicalWorkUnderstanding: "Practical work understanding",
  lessonAppropriation: "Lesson appropriation",
} as const

export default function EvaluationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: sheets, isLoading } = useEvaluationSheets()
  const sheet = useMemo(() => (sheets ?? []).find((s) => s.id === id), [sheets, id])

  if (isLoading) {
    return (
      <main className="p-6">
        <Skeleton className="h-96 w-full" />
      </main>
    )
  }

  if (!sheet) {
    return (
      <main className="space-y-3 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Evaluation Sheet</h1>
        <p className="text-muted-foreground">This evaluation doesn't exist.</p>
        <Button variant="outline" asChild>
          <Link to="/evaluations">Back to evaluations</Link>
        </Button>
      </main>
    )
  }

  // The printable sheet is hidden (display:none) until print media kicks in, which means opening the
  // dialog forces the browser to lay out and paint that whole table for the first time. Calling
  // print() before that settles races the native dialog against the layout swap and makes it flash
  // shut immediately — waiting two animation frames lets the paint finish first.
  function handlePrint() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print()
      })
    })
  }

  return (
    <>
    <main className="mx-auto max-w-3xl space-y-6 p-6 print:hidden">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Evaluation Sheet</h1>
          <p className="text-sm text-muted-foreground">
            Step {sheet.step} grading — pass threshold is {EVALUATION_PASS_THRESHOLD[sheet.step]}/5.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <PrinterIcon />
            Print as PDF
          </Button>
          <Button variant="outline" asChild>
            <Link to="/evaluations">All evaluations</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-md border p-4 text-sm sm:grid-cols-3">
        <Info label="Date">{format(new Date(sheet.date), "EEE dd MMM yyyy")}</Info>
        <Info label="Step">
          <Badge variant="outline">
            Step {sheet.step}
            {sheet.step === "C" && ` · Attempt ${sheet.attempt}/3`}
          </Badge>
        </Info>
        <Info label="Type">{sheet.courseType === "PW" ? "PWL" : sheet.courseType}</Info>
        <Info label="Indonesian Teacher">{sheet.iat}</Info>
        <Info label="French Teacher">{sheet.ft}</Info>
        <Info label="Campus">{sheet.campus}</Info>
        <Info label="Lesson" className="col-span-2 sm:col-span-3">
          {sheet.course}
        </Info>
      </div>

      <div className="space-y-3">
        <h2 className="font-medium">Training Objectives</h2>
        <div className="space-y-2 rounded-md border p-3">
          {sheet.objectives.map((row, i) => (
            <div key={i} className="flex flex-wrap items-center justify-between gap-3 border-b pb-2 last:border-b-0 last:pb-0">
              <div className="max-w-md text-sm">
                <span className="text-xs font-medium text-muted-foreground">{row.category}</span>
                <p>{row.text}</p>
              </div>
              <ScorePicker value={row.score} disabled />
            </div>
          ))}
        </div>
      </div>

      {sheet.comment && (
        <div className="space-y-1.5">
          <div className="text-sm font-medium">Comments</div>
          <p className="rounded-md border p-3 text-sm text-muted-foreground">{sheet.comment}</p>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="font-medium">AWF Program Ownership</h2>
        <div className="space-y-2 rounded-md border p-3">
          {(Object.keys(PROGRAM_OWNERSHIP_LABELS) as (keyof typeof PROGRAM_OWNERSHIP_LABELS)[]).map((key) => (
            <div key={key} className="flex flex-wrap items-center justify-between gap-3 border-b pb-2 last:border-b-0 last:pb-0">
              <span className="text-sm">{PROGRAM_OWNERSHIP_LABELS[key]}</span>
              <ScorePicker value={sheet.programOwnership[key]} disabled />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4">
        <div>
          <div className="text-xs text-muted-foreground">Average total score</div>
          <div className="text-lg font-semibold">{sheet.averageScore.toFixed(2)}/5</div>
        </div>
        <Badge variant={sheet.passed ? "default" : "destructive"} className={sheet.passed ? "bg-emerald-600" : ""}>
          {sheet.passed ? `Step ${sheet.step} validated` : `Step ${sheet.step} not validated`}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground">
        Graded by {sheet.createdBy} on {format(new Date(sheet.createdAt), "dd/MM/yyyy 'at' HH:mm")}.
      </p>
    </main>
    <PrintableEvaluationSheet sheet={sheet} />
    </>
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
