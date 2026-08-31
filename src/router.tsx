import { createBrowserRouter } from "react-router-dom"
import Layout from "@/pages/_layout"
import HomePage from "@/pages/home"
import NotFoundPage from "@/pages/not-found"
import PlanningPage from "./pages/Planning"
import IATAttendancePage from "./pages/IATAttendance"
import ReportPage from "./pages/Report"
import LeavePage from "./pages/Leave"
import AuditLogPage from "./pages/AuditLog"
import AdminPage from "./pages/Admin"
import EvaluationsPage from "./pages/Evaluations"
import NewEvaluationPage from "./pages/Evaluations/NewEvaluation"
import EvaluationDetailPage from "./pages/Evaluations/EvaluationDetail"

// IMPORTANT: Do not remove or modify the code below!
// Normalize basename when hosted in Power Apps
const BASENAME = new URL(".", location.href).pathname
if (location.pathname.endsWith("/index.html")) {
  history.replaceState(null, "", BASENAME + location.search + location.hash);
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "planning", element: <PlanningPage /> },
      { path: "attendance", element: <IATAttendancePage /> },
      { path: "report", element: <ReportPage /> },
      { path: "leave", element: <LeavePage /> },
      { path: "audit-log", element: <AuditLogPage /> },
      { path: "admin", element: <AdminPage /> },
      { path: "evaluations", element: <EvaluationsPage /> },
      { path: "evaluations/new", element: <NewEvaluationPage /> },
      { path: "evaluations/new/:slotId", element: <NewEvaluationPage /> },
      { path: "evaluations/:id", element: <EvaluationDetailPage /> }
    ],
  },
], { 
  basename: BASENAME // IMPORTANT: Set basename for proper routing when hosted in Power Apps
})