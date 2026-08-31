import { Outlet, NavLink } from "react-router-dom"
import { ModeToggle } from "@/components/mode-toggle"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { IDENTITIES, useCurrentUser } from "@/store/currentUser"
import { isAdmin } from "@/data/admins"

type LayoutProps = { showHeader?: boolean }

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
  `border-b-2 pb-1 text-sm ${
    isActive
      ? "border-primary font-medium text-foreground"
      : "border-transparent text-muted-foreground hover:text-foreground"
  }`

export default function Layout({ showHeader = true }: LayoutProps) {
  const { name, setName } = useCurrentUser()

  return (
    <div className="min-h-dvh flex flex-col">
      {showHeader && (
        <header className="h-14 border-b flex items-center print:hidden">
          <div className="mx-auto w-full max-w-7xl px-6 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <nav className="flex items-center gap-4">
                <NavLink to="/" end className={navLinkClassName}>
                  Dashboard
                </NavLink>
                <NavLink to="/planning" className={navLinkClassName}>
                  Planning
                </NavLink>
                <NavLink to="/attendance" className={navLinkClassName}>
                  IAT Attendance
                </NavLink>
                <NavLink to="/evaluations" className={navLinkClassName}>
                  Evaluations
                </NavLink>
                <NavLink to="/leave" className={navLinkClassName}>
                  Leave
                </NavLink>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <NavLink to="/report" className={navLinkClassName}>
                Report
              </NavLink>
              {isAdmin(name) && (
                <NavLink to="/admin" className={navLinkClassName}>
                  Admin
                </NavLink>
              )}
              {import.meta.env.PROD ? (
                <span className="text-sm font-medium">{name}</span>
              ) : (
                <>
                  <span className="text-xs text-muted-foreground">Signed in as</span>
                  <Select value={name} onValueChange={setName}>
                    <SelectTrigger size="sm" className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {IDENTITIES.map((identity) => (
                        <SelectItem key={identity} value={identity}>
                          {identity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              <ModeToggle />
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 flex">
        <div className="flex-1 mx-auto w-full max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
