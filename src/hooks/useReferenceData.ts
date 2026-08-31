import { useQuery } from "@tanstack/react-query"
import {
  fetchCampuses,
  fetchCourses,
  fetchCourseTypes,
  fetchFTs,
  fetchGrades,
  fetchHolidays,
  fetchIATs,
  fetchRooms,
  fetchSteps,
} from "@/data/referenceData"

export function useCampuses() {
  return useQuery({ queryKey: ["campuses"], queryFn: fetchCampuses })
}

export function useCourseTypes() {
  return useQuery({ queryKey: ["course-types"], queryFn: fetchCourseTypes })
}

export function useGrades() {
  return useQuery({ queryKey: ["grades"], queryFn: fetchGrades })
}

export function useSteps() {
  return useQuery({ queryKey: ["steps"], queryFn: fetchSteps })
}

export function useRooms() {
  return useQuery({ queryKey: ["rooms"], queryFn: fetchRooms })
}

export function useFTs() {
  return useQuery({ queryKey: ["fts"], queryFn: fetchFTs })
}

export function useIATs() {
  return useQuery({ queryKey: ["iats"], queryFn: fetchIATs })
}

export function useCourses() {
  return useQuery({ queryKey: ["courses"], queryFn: fetchCourses })
}

export function useHolidays() {
  return useQuery({ queryKey: ["holidays"], queryFn: fetchHolidays })
}
