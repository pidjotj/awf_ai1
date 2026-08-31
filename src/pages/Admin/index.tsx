import { Link } from "react-router-dom"
import { ScrollTextIcon } from "lucide-react"

import { useCurrentUser } from "@/store/currentUser"
import { ADMINS, isAdmin } from "@/data/admins"
import { Button } from "@/components/ui/button"

export default function AdminPage() {
  const { name } = useCurrentUser()

  if (!isAdmin(name)) {
    return (
      <main className="space-y-3 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">This page is restricted to administrators.</p>
      </main>
    )
  }

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">Visible only to {ADMINS.join(" and ")}.</p>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Tools</h2>
        <Button variant="outline" asChild>
          <Link to="/audit-log">
            <ScrollTextIcon />
            Audit Log
          </Link>
        </Button>
      </div>
    </main>
  )
}
