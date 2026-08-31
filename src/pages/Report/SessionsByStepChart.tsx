import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { StepCode } from "@/types/domain"

const ALL_STEPS: StepCode[] = ["A", "B", "C", "D"]

const chartConfig: ChartConfig = {
  completed: { label: "Completed", color: "var(--series-completed)" },
  scheduled: { label: "Scheduled", color: "var(--series-scheduled)" },
  cancelled: { label: "Cancelled", color: "var(--series-cancelled)" },
}

type SessionsByStepChartProps = {
  completed: Record<StepCode, number>
  scheduled: Record<StepCode, number>
  cancelled: Record<StepCode, number>
}

export function SessionsByStepChart({ completed, scheduled, cancelled }: SessionsByStepChartProps) {
  const data = ALL_STEPS.map((step) => ({
    step: `Step ${step}`,
    completed: completed[step],
    scheduled: scheduled[step],
    cancelled: cancelled[step],
  }))

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
      <BarChart data={data} barGap={4} barCategoryGap="24%">
        <CartesianGrid vertical={false} />
        <XAxis dataKey="step" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="completed" fill="var(--color-completed)" radius={[4, 4, 0, 0]} maxBarSize={20} />
        <Bar dataKey="scheduled" fill="var(--color-scheduled)" radius={[4, 4, 0, 0]} maxBarSize={20} />
        <Bar dataKey="cancelled" fill="var(--color-cancelled)" radius={[4, 4, 0, 0]} maxBarSize={20} />
      </BarChart>
    </ChartContainer>
  )
}
