import { useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { addDays, addWeeks, eachDayOfInterval, format, getDay, isToday, startOfWeek, subWeeks } from "date-fns"
import { toPng } from "html-to-image"
import { CameraIcon, ChevronLeftIcon, ChevronRightIcon, FileTextIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { useSlots } from "@/hooks/useSlots"
import { useCampuses, useCourses, useFTs, useHolidays } from "@/hooks/useReferenceData"
import { useLeaveRequests } from "@/hooks/useLeaveRequests"
import { useBlockedPeriods } from "@/hooks/useBlockedPeriods"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CAMPUS_WEEKDAYS, DEFAULT_WEEKDAYS, FT_DISPLAY_ORDER } from "@/data/periodTimes"
import { resolveFtDisplayName } from "@/data/ftIdentity"
import { SlotCard } from "./SlotCard"
import { SlotDetailDialog } from "./SlotDetailDialog"
import { CreateSlotDialog } from "./CreateSlotDialog"
import { BlockPeriodDialog } from "./BlockPeriodDialog"
import { buildDeliveredCreditsMap, deliveredCreditsKey } from "./creditUtils"
import { findIatConflicts, findRoomConflicts, iatsInvolvedInSlot } from "./scheduling"
import { buildCellLanes, buildDayColumns, columnKeyForSlot, type DayColumn } from "./timeGrid"
import type { Course, LeaveRequest, Slot } from "@/types/domain"

const LABEL_WIDTH_PX = 90

type FlatColumn = DayColumn & { dayKey: string }

type FtWeekRowProps = {
  ft: string
  flatColumns: FlatColumn[]
  slotsByCell: Map<string, Slot[]>
  coursesById: Map<string, Course>
  blockedDates: Set<string>
  leaveByFtDate: Map<string, LeaveRequest>
  iatConflictSlotIds: Set<string>
  roomConflictSlotIds: Set<string>
  onSelectSlot: (id: string) => void
  onCreateAt: (ft: string, col: FlatColumn) => void
}

function FtWeekRow({
  ft,
  flatColumns,
  slotsByCell,
  coursesById,
  blockedDates,
  leaveByFtDate,
  iatConflictSlotIds,
  roomConflictSlotIds,
  onSelectSlot,
  onCreateAt,
}: FtWeekRowProps) {
  return (
    <>
      <div className="sticky left-0 z-10 flex items-center border-r border-b bg-background px-2 py-2 text-sm font-medium">
        {ft}
      </div>
      {flatColumns.map((col) => {
        const cellSlots = slotsByCell.get(`${ft}__${col.dayKey}__${col.key}`) ?? []
        const isBlocked = blockedDates.has(col.dayKey)
        const leave = leaveByFtDate.get(`${ft}__${col.dayKey}`)
        const blocked = isBlocked || Boolean(leave)
        return (
          <div
            key={`${col.dayKey}__${col.key}`}
            onClick={() => !blocked && onCreateAt(ft, col)}
            className={`space-y-1 border-r border-b p-1 ${
              leave ? "bg-muted" : isBlocked ? "bg-destructive/5" : "cursor-pointer hover:bg-muted/40"
            }`}
          >
            {leave && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-default rounded border border-dashed border-muted-foreground/40 px-1 py-0.5 text-center text-[10px] font-medium text-muted-foreground">
                    {leave.type}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {leave.type} · {format(new Date(leave.startDate), "dd/MM")}–{format(new Date(leave.endDate), "dd/MM")}
                  </p>
                  {leave.comment && <p className="text-muted-foreground">{leave.comment}</p>}
                </TooltipContent>
              </Tooltip>
            )}
            <div className="flex items-start">
              {buildCellLanes(cellSlots, col).map((lane) => (
                <div key={lane.key} className={lane.slots ? "shrink-0 space-y-1" : "shrink-0"} style={{ width: lane.widthPx }}>
                  {lane.slots?.map((slot) => (
                    <SlotCard
                      key={slot.id}
                      slot={slot}
                      course={coursesById.get(slot.course)}
                      hasIatConflict={iatConflictSlotIds.has(slot.id)}
                      hasRoomConflict={roomConflictSlotIds.has(slot.id)}
                      onClick={() => onSelectSlot(slot.id)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </>
  )
}

export default function PlanningPage() {
  const [campus, setCampus] = useState("CIMAHI")
  const [weekAnchor, setWeekAnchor] = useState(() => new Date())
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [createState, setCreateState] = useState<{ open: boolean; ft?: string; date?: string; startTime?: string }>({
    open: false,
  })
  const [exportingPng, setExportingPng] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)

  const { data: slots, isLoading: slotsLoading } = useSlots()
  const { data: campuses } = useCampuses()
  const { data: fts } = useFTs()
  const { data: courses } = useCourses()
  const { data: holidays } = useHolidays()
  const { data: leaveRequests } = useLeaveRequests()
  const { data: blockedPeriods } = useBlockedPeriods()

  const weekStart = startOfWeek(weekAnchor, { weekStartsOn: 1 })
  const campusWeekdayNumbers = CAMPUS_WEEKDAYS[campus] ?? DEFAULT_WEEKDAYS
  const weekDays = useMemo(() => {
    const allDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) })
    return allDays.filter((day) => campusWeekdayNumbers.includes(getDay(day)))
  }, [weekStart, campusWeekdayNumbers])

  const campusFTs = useMemo(() => {
    const filtered = (fts ?? []).filter((ft) => ft.campus === campus)
    return [...filtered].sort((a, b) => {
      const ai = FT_DISPLAY_ORDER.indexOf(a.title)
      const bi = FT_DISPLAY_ORDER.indexOf(b.title)
      if (ai === -1 && bi === -1) return 0
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })
  }, [fts, campus])

  const coursesById = useMemo(() => {
    const map = new Map<string, Course>()
    for (const course of courses ?? []) map.set(course.id, course)
    return map
  }, [courses])

  const dayBlockReasons = useMemo(() => {
    const map = new Map<string, string>()
    for (const holiday of holidays ?? []) map.set(holiday.date, holiday.name)
    for (const period of blockedPeriods ?? []) {
      if (period.campus && period.campus !== campus) continue
      const days = eachDayOfInterval({ start: new Date(period.startDate), end: new Date(period.endDate) })
      for (const day of days) {
        const key = format(day, "yyyy-MM-dd")
        if (!map.has(key)) map.set(key, period.name)
      }
    }
    return map
  }, [holidays, blockedPeriods, campus])
  const blockedDates = useMemo(() => new Set(dayBlockReasons.keys()), [dayBlockReasons])

  const leaveByFtDate = useMemo(() => {
    const map = new Map<string, LeaveRequest>()
    for (const request of leaveRequests ?? []) {
      if (request.status !== "Accepted") continue
      // request.requester can be an FT's raw full name (e.g. "Jonathan PASCAL") instead of the short name
      // this grid's rows are keyed by ("Jonathan") — see src/data/ftIdentity.ts for why — so it's
      // normalized here too, which fixes matching for requests already submitted that way, not just ones
      // made after realIdentity.ts's own fix.
      const requester = resolveFtDisplayName(request.requester)
      const days = eachDayOfInterval({ start: new Date(request.startDate), end: new Date(request.endDate) })
      for (const day of days) {
        map.set(`${requester}__${format(day, "yyyy-MM-dd")}`, request)
      }
    }
    return map
  }, [leaveRequests])

  const deliveredCreditsMap = useMemo(() => buildDeliveredCreditsMap(slots ?? []), [slots])

  const campusSlots = useMemo(() => (slots ?? []).filter((slot) => slot.campus === campus), [slots, campus])

  // Computed once per day and shared by flatColumns and slotsByCell below, so a slot always resolves to
  // the exact same column it was built from — buildDayColumns() merges overlapping/back-to-back slots
  // into shared periods, and columnKeyForSlot() needs that same period list to find which one a slot
  // belongs to.
  const columnsByDay = useMemo(() => {
    const map = new Map<string, DayColumn[]>()
    for (const day of weekDays) {
      const dayKey = format(day, "yyyy-MM-dd")
      const daySlots = campusSlots.filter((slot) => slot.date === dayKey)
      map.set(dayKey, buildDayColumns(daySlots))
    }
    return map
  }, [weekDays, campusSlots])

  const flatColumns = useMemo<FlatColumn[]>(() => {
    return weekDays.flatMap((day) => {
      const dayKey = format(day, "yyyy-MM-dd")
      return (columnsByDay.get(dayKey) ?? []).map((col) => ({ ...col, dayKey }))
    })
  }, [weekDays, columnsByDay])

  const slotsByCell = useMemo(() => {
    const map = new Map<string, Slot[]>()
    for (const slot of campusSlots) {
      const key = `${slot.ft}__${slot.date}__${columnKeyForSlot(slot, columnsByDay.get(slot.date) ?? [])}`
      const bucket = map.get(key)
      if (bucket) bucket.push(slot)
      else map.set(key, [slot])
    }
    return map
  }, [campusSlots, columnsByDay])

  // An IAT double-booked across two FTs at the same time — checked against every slot (any campus,
  // matching how the create-slot warning already works), not just the ones on screen.
  const iatConflictSlotIds = useMemo(() => {
    const result = new Set<string>()
    const allSlots = slots ?? []
    for (const slot of campusSlots) {
      if (slot.status === "Cancelled" || !slot.startTime || !slot.endTime) continue
      const iats = iatsInvolvedInSlot(slot, coursesById)
      if (iats.length === 0) continue
      const conflicts = findIatConflicts(allSlots, coursesById, {
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        iats,
        excludeSlotId: slot.id,
      })
      if (conflicts.length > 0) result.add(slot.id)
    }
    return result
  }, [campusSlots, slots, coursesById])

  // Same room, same campus, overlapping time — shouldn't be possible, flagged so it gets noticed and fixed.
  const roomConflictSlotIds = useMemo(() => {
    const result = new Set<string>()
    for (const slot of campusSlots) {
      if (slot.status === "Cancelled" || !slot.startTime || !slot.endTime || !slot.room) continue
      const conflicts = findRoomConflicts(campusSlots, {
        date: slot.date,
        campus: slot.campus,
        startTime: slot.startTime,
        endTime: slot.endTime,
        room: slot.room,
        excludeSlotId: slot.id,
      })
      if (conflicts.length > 0) result.add(slot.id)
    }
    return result
  }, [campusSlots])

  const selectedSlot = useMemo(
    () => (slots ?? []).find((slot) => slot.id === selectedSlotId) ?? null,
    [slots, selectedSlotId]
  )

  const gridTemplateColumns = `${LABEL_WIDTH_PX}px ${flatColumns
    .map((col) => (col.flexible ? "minmax(120px, 1fr)" : `${col.widthPx}px`))
    .join(" ")}`

  function openCreateAt(ft: string, col: FlatColumn) {
    setCreateState({
      open: true,
      ft,
      date: col.dayKey,
      startTime: col.startTime ? format(new Date(col.startTime), "HH:mm") : undefined,
    })
  }

  async function handleExportPng() {
    const node = gridRef.current
    if (!node) return
    setExportingPng(true)
    try {
      // Capture at the grid's full scrollable size, not just what's visible through overflow-x-auto —
      // otherwise columns scrolled out of view get cropped out of the exported image. Forcing the clone's
      // overflow to visible also keeps the live scrollbar from getting baked into the picture.
      const dataUrl = await toPng(node, {
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        pixelRatio: 2,
        width: node.scrollWidth,
        height: node.scrollHeight,
        style: { overflow: "visible" },
      })
      const link = document.createElement("a")
      link.download = `planning-${campus}-${format(weekStart, "yyyy-MM-dd")}.png`
      link.href = dataUrl
      link.click()
    } catch {
      toast.error("Could not generate the image.")
    } finally {
      setExportingPng(false)
    }
  }

  return (
    <main className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Planning</h1>
          <p className="text-sm text-muted-foreground">Weekly workload by French Teacher (FT).</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/report">
              <FileTextIcon />
              Generate Report
            </Link>
          </Button>
          <Button variant="outline" onClick={handleExportPng} disabled={exportingPng || slotsLoading}>
            <CameraIcon />
            {exportingPng ? "Generating…" : "Screenshot week"}
          </Button>
          <BlockPeriodDialog />
          <Button onClick={() => setCreateState({ open: true, date: format(weekStart, "yyyy-MM-dd") })}>
            <PlusIcon />
            Add slot
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border p-0.5">
          {(campuses ?? []).map((c) => (
            <Button
              key={c.title}
              size="sm"
              variant={c.title === campus ? "default" : "ghost"}
              onClick={() => setCampus(c.title)}
            >
              {c.title}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => setWeekAnchor((d) => subWeeks(d, 1))}>
            <ChevronLeftIcon />
          </Button>
          <span className="min-w-44 text-center text-sm font-medium">
            {format(weekStart, "dd MMM")} – {format(addDays(weekStart, 6), "dd MMM yyyy")}
          </span>
          <Button variant="outline" size="icon-sm" onClick={() => setWeekAnchor((d) => addWeeks(d, 1))}>
            <ChevronRightIcon />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekAnchor(new Date())}>
            Current week
          </Button>
        </div>
      </div>

      {slotsLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : campusFTs.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No FT assigned to this campus.</p>
      ) : (
        <TooltipProvider>
          <div ref={gridRef} className="overflow-x-auto rounded-md border">
            <div className="grid" style={{ gridTemplateColumns }}>
              <div
                className="sticky top-0 left-0 z-20 border-r border-b bg-muted/50"
                style={{ gridRow: "span 2" }}
              />

              {weekDays.map((day) => {
                const dayKey = format(day, "yyyy-MM-dd")
                const dayColumnCount = flatColumns.filter((col) => col.dayKey === dayKey).length
                const blockReason = dayBlockReasons.get(dayKey)
                return (
                  <div
                    key={dayKey}
                    style={{ gridColumn: `span ${dayColumnCount}` }}
                    className={`sticky top-0 z-10 border-r border-b p-1.5 text-center text-sm font-medium ${
                      blockReason ? "bg-destructive/10" : isToday(day) ? "bg-primary/10" : "bg-muted/50"
                    }`}
                  >
                    {format(day, "EEE dd/MM")}
                    {blockReason && <div className="text-[10px] font-normal text-destructive">{blockReason}</div>}
                  </div>
                )
              })}

              {flatColumns.map((col) => (
                <div
                  key={`${col.dayKey}__${col.key}`}
                  className="border-r border-b bg-muted/30 p-1 text-center text-[11px] text-muted-foreground"
                >
                  {col.label}
                </div>
              ))}

              {campusFTs.map((ft) => (
                <FtWeekRow
                  key={ft.title}
                  ft={ft.title}
                  flatColumns={flatColumns}
                  slotsByCell={slotsByCell}
                  coursesById={coursesById}
                  blockedDates={blockedDates}
                  leaveByFtDate={leaveByFtDate}
                  iatConflictSlotIds={iatConflictSlotIds}
                  roomConflictSlotIds={roomConflictSlotIds}
                  onSelectSlot={setSelectedSlotId}
                  onCreateAt={openCreateAt}
                />
              ))}
            </div>
          </div>
        </TooltipProvider>
      )}

      <SlotDetailDialog
        slot={selectedSlot}
        course={selectedSlot ? coursesById.get(selectedSlot.course) : undefined}
        deliveredCredits={selectedSlot ? deliveredCreditsMap.get(deliveredCreditsKey(selectedSlot)) : undefined}
        onOpenChange={(open) => !open && setSelectedSlotId(null)}
      />

      <CreateSlotDialog
        open={createState.open}
        onOpenChange={(open) => setCreateState((prev) => ({ ...prev, open }))}
        campus={campus}
        defaultDate={createState.date ?? format(weekStart, "yyyy-MM-dd")}
        initialFt={createState.ft}
        initialStartTime={createState.startTime}
      />
    </main>
  )
}
