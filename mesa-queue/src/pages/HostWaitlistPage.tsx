import { LogOut, UsersRound } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const waitlist = [
  { id: 1, name: 'Mariana Torres', phone: '+51 999 111 222', partySize: 2, status: 'Esperando' },
  { id: 2, name: 'Carlos Rivas', phone: '+51 988 333 444', partySize: 4, status: 'Esperando' },
  { id: 3, name: 'Lucía Peña', phone: '+51 977 555 666', partySize: 3, status: 'Próximo' },
]

export function HostWaitlistPage() {
  const navigate = useNavigate()
  const session = window.localStorage.getItem('mesa-host-session')

  if (!session) {
    return <Navigate to="/login" replace />
  }

  function logout() {
    window.localStorage.removeItem('mesa-host-session')
    navigate('/login')
  }

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Anfitrión</p>
          <h1 className="mt-2 text-3xl font-semibold">Lista de espera</h1>
        </div>
        <Button type="button" variant="outline" onClick={logout}>
          <LogOut size={16} />
          Salir
        </Button>
      </div>

      <div className="grid gap-3">
        {waitlist.map((entry, index) => (
          <Card key={entry.id} className="py-4">
            <CardHeader className="grid-cols-[auto_1fr_auto] items-center gap-4">
              <div className="flex size-11 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                <span className="text-sm font-semibold">{index + 1}</span>
              </div>
              <div>
                <CardTitle>{entry.name}</CardTitle>
                <CardDescription>{entry.phone}</CardDescription>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-2 text-sm font-semibold">
                  <UsersRound size={16} />
                  {entry.partySize}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{entry.status}</p>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="border-dashed">
        <CardContent className="py-6 text-sm text-muted-foreground">
          Esta vista usa datos temporales. El endpoint `/api/waitlist` ya existe en el backend para conectarla.
        </CardContent>
      </Card>
    </section>
  )
}
