import { TriangleAlertIcon } from "lucide-react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { batchLabelForGrade } from "@/data/batchMapping"
import type { Course, Slot } from "@/types/domain"
import { compactSlotLabel, countsAsValidated } from "./creditUtils"
import { courseIatCandidates } from "./scheduling"

const PLACEHOLDER = "—"
const CANCELLED_STYLE = "bg-muted border-border text-muted-foreground line-through opacity-70 hover:opacity-90"
const VALIDATED_STYLE = "bg-background border-emerald-500 hover:bg-emerald-500/5"
const NEUTRAL_STYLE = "bg-background border-border hover:bg-muted/50"

/** Cancelled keeps its own look; a validated course (Completed, and passed if it went through grading) gets a green border; everything else is neutral. */
function cardStyle(slot: Slot): string {
  if (slot.status === "Cancelled") return CANCELLED_STYLE
  if (slot.status === "Completed" && countsAsValidated(slot)) return VALIDATED_STYLE
  return NEUTRAL_STYLE
}

/** PWL/TH/Step B are told apart by the lesson title's color instead of the whole card — Step B is always yellow regardless of type. */
function titleColor(slot: Slot): string {
  if (slot.step === "B") return "text-yellow-600 dark:text-yellow-400"
  if (slot.courseType === "PW") return "text-green-600 dark:text-green-400"
  return "text-blue-600 dark:text-blue-400"
}

type SlotCardProps = {
  slot: Slot
  course?: Course
  hasIatConflict?: boolean
  hasRoomConflict?: boolean
  onClick?: () => void
}

export function SlotCard({ slot, course, hasIatConflict, hasRoomConflict, onClick }: SlotCardProps) {
  const principal = slot.iat ? slot.iat : course ? courseIatCandidates(course).join(", ") : undefined
  const iats = [principal, ...(slot.additionalIats?.map((name) => `${name} (obs.)`) ?? [])].filter(Boolean).join(", ")

  // A Step C/D slot only ever reaches Completed by going through the Evaluation Sheet — so still being
  // Planned means it's missing its evaluation, whether that's because it hasn't happened yet or because
  // it happened and nobody's graded it.
  const missingEvaluation = (slot.step === "C" || slot.step === "D") && slot.status === "Planned"

  // Every card always renders the same four single-line rows (falling back to a placeholder when a
  // field is missing) so every card ends up exactly the same height, regardless of content.
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      // Slightly narrower than its lane, not the full width of it — otherwise adjacent cards (or a card
      // and its cell's own border) touch edge to edge with no breathing room between them.
      className={`w-[94%] rounded-md border px-1.5 py-1 text-left text-[11px] leading-tight transition-colors ${cardStyle(slot)}`}
    >
      {/* The course code is the one thing that must never truncate away to nothing, so it gets the whole
          top row to itself — the warning icon and credit badge (which used to compete with it here) moved
          down to the IAT row instead, since that row's own content is far less critical to keep in full. */}
      <div className={`truncate font-medium ${slot.status !== "Cancelled" ? titleColor(slot) : ""}`}>
        {compactSlotLabel(slot)}
      </div>
      <div className={`truncate ${hasRoomConflict ? "font-semibold text-destructive" : "opacity-80"}`}>
        {slot.room || PLACEHOLDER}
      </div>
      <div className="truncate opacity-80">{batchLabelForGrade(slot.grade) || PLACEHOLDER}</div>
      <div className="flex items-center justify-between gap-1">
        <span className={`min-w-0 truncate font-semibold ${hasIatConflict ? "text-destructive" : ""}`}>{iats || PLACEHOLDER}</span>
        <span className="flex shrink-0 items-center gap-1">
          {missingEvaluation && (
            <Tooltip>
              <TooltipTrigger asChild>
                <TriangleAlertIcon className="size-3 text-amber-500" />
              </TooltipTrigger>
              <TooltipContent>Awaiting evaluation sheet</TooltipContent>
            </Tooltip>
          )}
          <span className="rounded bg-muted px-1 text-[10px]">{slot.credits} cr</span>
        </span>
      </div>
    </button>
  )
}
