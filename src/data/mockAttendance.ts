import type { AttendanceRecord } from "@/types/domain"

// Small, carefully-read sample from the CIMAHI IAT Attendance sheet (Grade 10 & 11 rows).
// This is NOT a full import: the source sheets run to 150+ rows across 4 dense screenshots,
// and given how much the diffusion dates matter here, only the clearly-legible rows were kept
// rather than risk a wrong date at scale. Malang's sheets are still to come.
export const mockAttendance: AttendanceRecord[] = [
  { id: "1", campus: "CIMAHI", course: "1.1.1 History", grade: "Grade 10", iat: "Diki", step: "A", attempt: 1, status: "Present", date: "2025-08-25" },
  { id: "2", campus: "CIMAHI", course: "1.1.1 History", grade: "Grade 10", iat: "Diki", step: "B", attempt: 1, status: "Present", date: "2025-10-24" },
  { id: "3", campus: "CIMAHI", course: "1.1.1 History", grade: "Grade 10", iat: "Diki", step: "C", attempt: 1, status: "Present", date: "2025-11-25" },
  { id: "4", campus: "CIMAHI", course: "1.1.1 History", grade: "Grade 10", iat: "Rahmat", step: "A", attempt: 1, status: "Present", date: "2025-08-25" },
  { id: "5", campus: "CIMAHI", course: "1.1.1 History", grade: "Grade 10", iat: "Rahmat", step: "B", attempt: 1, status: "Present", date: "2025-10-24" },
  { id: "6", campus: "CIMAHI", course: "1.1.1 History", grade: "Grade 10", iat: "Rahmat", step: "C", attempt: 1, status: "Present", date: "2025-09-18" },
  { id: "7", campus: "CIMAHI", course: "1.1.1 History", grade: "Grade 10", iat: "Kartika", step: "A", attempt: 1, status: "Present", date: "2025-08-25" },

  { id: "8", campus: "CIMAHI", course: "2.1.1 Atmosphere", grade: "Grade 10", iat: "Rahmat", step: "A", attempt: 1, status: "Present", date: "2025-09-02" },
  { id: "9", campus: "CIMAHI", course: "2.1.1 Atmosphere", grade: "Grade 10", iat: "Rahmat", step: "B", attempt: 1, status: "Present", date: "2026-02-11" },
  { id: "10", campus: "CIMAHI", course: "2.1.1 Atmosphere", grade: "Grade 10", iat: "Rahmat", step: "C", attempt: 1, status: "Present", date: "2025-10-22" },
  { id: "11", campus: "CIMAHI", course: "2.1.1 Atmosphere", grade: "Grade 10", iat: "Ayu", step: "A", attempt: 1, status: "Present", date: "2025-09-02" },
  { id: "12", campus: "CIMAHI", course: "2.1.1 Atmosphere", grade: "Grade 10", iat: "Ayu", step: "B", attempt: 1, status: "Present", date: "2026-02-11" },
  { id: "13", campus: "CIMAHI", course: "2.1.1 Atmosphere", grade: "Grade 10", iat: "Ayu", step: "C", attempt: 1, status: "Present", date: "2025-10-06" },

  { id: "14", campus: "CIMAHI", course: "4A.1.4 Power up", grade: "Grade 10", iat: "Rahmat", step: "A", attempt: 1, status: "Present", date: "2025-08-21" },
  { id: "15", campus: "CIMAHI", course: "4A.1.4 Power up", grade: "Grade 10", iat: "Rahmat", step: "B", attempt: 1, status: "Present", date: "2026-02-05" },
  { id: "16", campus: "CIMAHI", course: "4A.1.4 Power up", grade: "Grade 10", iat: "Rahmat", step: "C", attempt: 1, status: "Failed", date: "2025-10-23" },
  { id: "17", campus: "CIMAHI", course: "4A.1.4 Power up", grade: "Grade 10", iat: "Rahmat", step: "C", attempt: 2, status: "Present", date: "2026-02-02" },
  { id: "18", campus: "CIMAHI", course: "4A.1.4 Power up", grade: "Grade 10", iat: "Ayu", step: "A", attempt: 1, status: "Present", date: "2025-08-21" },
  { id: "19", campus: "CIMAHI", course: "4A.1.4 Power up", grade: "Grade 10", iat: "Ayu", step: "B", attempt: 1, status: "Present", date: "2026-02-05" },
  { id: "20", campus: "CIMAHI", course: "4A.1.4 Power up", grade: "Grade 10", iat: "Ayu", step: "C", attempt: 1, status: "Failed", date: "2025-11-06" },
  { id: "21", campus: "CIMAHI", course: "4A.1.4 Power up", grade: "Grade 10", iat: "Ayu", step: "C", attempt: 2, status: "Present", date: "2026-01-22" },

  { id: "22", campus: "CIMAHI", course: "9.1.1 Pressure", grade: "Grade 11", iat: "Rahmat", step: "A", attempt: 1, status: "Present", date: "2026-02-25" },
  { id: "23", campus: "CIMAHI", course: "9.1.1 Pressure", grade: "Grade 11", iat: "Rahmat", step: "B", attempt: 1, status: "Present", date: "2026-07-16" },
  { id: "24", campus: "CIMAHI", course: "9.1.1 Pressure", grade: "Grade 11", iat: "Rahmat", step: "C", attempt: 1, status: "Present", date: "2026-05-19" },
  { id: "25", campus: "CIMAHI", course: "9.1.1 Pressure", grade: "Grade 11", iat: "Ayu", step: "A", attempt: 1, status: "Present", date: "2026-02-25" },
  { id: "26", campus: "CIMAHI", course: "9.1.1 Pressure", grade: "Grade 11", iat: "Ayu", step: "B", attempt: 1, status: "Present", date: "2026-07-16" },
  { id: "27", campus: "CIMAHI", course: "9.1.1 Pressure", grade: "Grade 11", iat: "Ayu", step: "C", attempt: 1, status: "Present", date: "2026-05-20" },
]
