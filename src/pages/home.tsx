import { useMemo } from "react"
import { CreditsBarChart } from "@/components/dashboard/CreditsBarChart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { computeLiveMacroPlan, sumStepCredits } from "@/data/macroPlan"
import { useSlots } from "@/hooks/useSlots"

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tracking-tight">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  )
}

export default function HomePage() {
  const { data: slots } = useSlots()
  const livePlan = useMemo(() => computeLiveMacroPlan(slots ?? []), [slots])

  const malangToDo = sumStepCredits(livePlan.MALANG.toDo2627)
  const cimahiToDo = sumStepCredits(livePlan.CIMAHI.toDo2627)
  const malangDone = sumStepCredits(livePlan.MALANG.completed)
  const cimahiDone = sumStepCredits(livePlan.CIMAHI.completed)

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">Credits remaining to deliver until the end of the project</p>
        <p className="text-5xl font-semibold tracking-tight">{(malangToDo + cimahiToDo).toLocaleString()}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Malang — remaining" value={malangToDo} />
        <StatTile label="Cimahi — remaining" value={cimahiToDo} />
        <StatTile label="Malang — delivered" value={malangDone} />
        <StatTile label="Cimahi — delivered" value={cimahiDone} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Credits remaining, by step</CardTitle>
            <CardDescription>26-27 school year — Step C counts each assigned IAT separately</CardDescription>
          </CardHeader>
          <CardContent>
            <CreditsBarChart malang={livePlan.MALANG.toDo2627} cimahi={livePlan.CIMAHI.toDo2627} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Credits delivered so far, by step</CardTitle>
            <CardDescription>26-27 school year to date — includes slots validated in Planning</CardDescription>
          </CardHeader>
          <CardContent>
            <CreditsBarChart malang={livePlan.MALANG.completed} cimahi={livePlan.CIMAHI.completed} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
