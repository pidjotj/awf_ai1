import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { StepCredits } from "@/data/macroPlan"

const STEP_ORDER: (keyof StepCredits)[] = ["A", "B", "C", "D"]

const chartConfig: ChartConfig = {
  malang: { label: "Malang", color: "var(--series-malang)" },
  cimahi: { label: "Cimahi", color: "var(--series-cimahi)" },
}

type CreditsBarChartProps = {
  malang: StepCredits
  cimahi: StepCredits
}

export function CreditsBarChart({ malang, cimahi }: CreditsBarChartProps) {
  const data = STEP_ORDER.map((step) => ({
    step: `Step ${step}`,
    malang: malang[step],
    cimahi: cimahi[step],
  }))

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
      <BarChart data={data} barGap={4} barCategoryGap="24%">
        <CartesianGrid vertical={false} />
        <XAxis dataKey="step" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={40} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="malang" fill="var(--color-malang)" radius={[4, 4, 0, 0]} maxBarSize={20} />
        <Bar dataKey="cimahi" fill="var(--color-cimahi)" radius={[4, 4, 0, 0]} maxBarSize={20} />
      </BarChart>
    </ChartContainer>
  )
}
