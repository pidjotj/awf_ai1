import { useEffect } from "react"
import { ThemeProvider } from "@/providers/theme-provider"
import { SonnerProvider } from "@/providers/sonner-provider"
import { QueryProvider } from "./providers/query-provider"
import { RouterProvider } from "react-router-dom"
import { router } from "@/router"
import { syncRealIdentity } from "@/store/realIdentity"

export default function App() {
  useEffect(() => {
    syncRealIdentity()
  }, [])

  return (
    <ThemeProvider>
      <SonnerProvider>
        <QueryProvider>
          <RouterProvider router={router} />
        </QueryProvider>
      </SonnerProvider>
    </ThemeProvider>
  )
}