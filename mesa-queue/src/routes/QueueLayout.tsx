import { ClipboardList, LogIn, Utensils } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/cola', label: 'Cola' },
  { to: '/login', label: 'Admin' },
]

export function QueueLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b bg-card/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <NavLink to="/" className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Utensils size={20} />
            </span>
            <span>
              <span className="block text-base font-semibold leading-5">Mesa247</span>
              <span className="block text-xs text-muted-foreground">Gestión de turnos</span>
            </span>
          </NavLink>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                    isActive && 'bg-secondary text-secondary-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-8 md:py-12">
        <Outlet />
      </main>
    </div>
  )
}
