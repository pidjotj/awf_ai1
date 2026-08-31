import { Button } from "@/components/ui/button"
import type { EvaluationScore } from "@/types/domain"

const OPTIONS: EvaluationScore[] = [5, 4, 3, 2, 1, "N/A"]

type ScorePickerProps = {
  value: EvaluationScore | null
  onChange?: (value: EvaluationScore) => void
  disabled?: boolean
}

/** N/A to 5 rating control — mirrors the paper form's column-of-checkboxes layout (5 4 3 2 1 N/A). */
export function ScorePicker({ value, onChange, disabled }: ScorePickerProps) {
  return (
    <div className="inline-flex rounded-md border p-0.5">
      {OPTIONS.map((option) => (
        <Button
          key={option}
          type="button"
          size="sm"
          variant={value === option ? "default" : "ghost"}
          className="h-7 w-9 px-0 text-xs"
          disabled={disabled || !onChange}
          onClick={() => onChange?.(option)}
        >
          {option}
        </Button>
      ))}
    </div>
  )
}
